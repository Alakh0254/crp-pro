# tests/test_auth.py — automated tests for the auth module (login + /me + guards).
#
# Run them from the Backend folder with the venv active:
#
#     pytest -v
#
# How to read a failure: pytest prints the failing test name, then the line with
# the failed `assert`, showing the LEFT (what we got) vs RIGHT (what we expected).
# A green dot / "PASSED" = that behavior works; "FAILED" points you at the exact
# assertion that didn't hold.
#
# Design note: these tests DON'T touch the real app.db. We spin up a fresh, empty
# SQLite file just for the test session and tell FastAPI to use it by OVERRIDING
# the get_db dependency. That makes the tests repeatable and independent of whether
# seed_users.py has been run.

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
import models
import auth


# --- A throwaway test database --------------------------------------------
# A separate SQLite file so we never read or write the real app.db.
TEST_DB_URL = "sqlite:///./test_auth.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# The replacement for get_db: hands out sessions bound to the TEST engine instead.
def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    # Fresh schema before each test, dropped after — every test starts clean.
    Base.metadata.create_all(bind=test_engine)
    # Tell FastAPI: whenever a route asks for get_db, use our test DB instead.
    app.dependency_overrides[get_db] = override_get_db

    # Seed one known-good user we can log in as.
    db = TestSession()
    db.add(models.User(
        name="Test Admin",
        email="test@crp.test",
        hashed_password=auth.hash_password("secret123"),
        role="admin",
    ))
    db.commit()
    db.close()

    yield TestClient(app)

    # Teardown: clear the override and wipe the tables so the next test is isolated.
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


# --- Happy path ------------------------------------------------------------

def test_login_succeeds_with_correct_credentials(client):
    r = client.post("/auth/login", data={"username": "test@crp.test", "password": "secret123"})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]  # a non-empty token string


def test_me_returns_current_user_and_hides_password(client):
    token = client.post(
        "/auth/login", data={"username": "test@crp.test", "password": "secret123"}
    ).json()["access_token"]

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "test@crp.test"
    assert body["role"] == "admin"
    # The whole point of UserRead: the hash must never leave the server.
    assert "hashed_password" not in body


# --- Failure paths: bad input ----------------------------------------------

def test_login_wrong_password_is_rejected(client):
    r = client.post("/auth/login", data={"username": "test@crp.test", "password": "WRONG"})
    assert r.status_code == 401


def test_login_unknown_user_gives_same_error(client):
    # Same status AND same message as a wrong password, so attackers can't tell
    # which emails are registered (user enumeration defense).
    r = client.post("/auth/login", data={"username": "ghost@crp.test", "password": "whatever"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect email or password"


# --- Failure paths: unauthorized access ------------------------------------

def test_me_without_token_is_401(client):
    r = client.get("/auth/me")
    assert r.status_code == 401


def test_disabled_user_login_is_rejected(client):
    # An admin can disable an account without deleting it. A disabled user must
    # not be able to log in at all — even with the CORRECT password — and must get
    # the same generic 401 (no hint that the account merely exists-but-disabled).
    db = TestSession()
    db.add(models.User(
        name="Disabled User",
        email="disabled@crp.test",
        hashed_password=auth.hash_password("secret123"),
        role="coordinator",
        is_active=False,
    ))
    db.commit()
    db.close()

    r = client.post("/auth/login", data={"username": "disabled@crp.test", "password": "secret123"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Incorrect email or password"


def test_disabled_user_with_valid_token_is_rejected(client):
    # Defense in depth: even if a token was minted while the account was active,
    # disabling the account must immediately lock it out. We mint the token
    # directly (login() now refuses disabled users) to isolate the get_current_user
    # is_active guard — the only security branch the other tests don't cover.
    db = TestSession()
    user = models.User(
        name="Disabled User",
        email="disabled2@crp.test",
        hashed_password=auth.hash_password("secret123"),
        role="coordinator",
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    user_id = user.id
    db.close()

    token = auth.create_access_token({"sub": str(user_id), "role": "coordinator"})
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_me_with_tampered_token_is_401(client):
    token = client.post(
        "/auth/login", data={"username": "test@crp.test", "password": "secret123"}
    ).json()["access_token"]
    # Flip the last character of the signature -> signature no longer matches.
    tampered = token[:-1] + ("A" if token[-1] != "A" else "B")
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {tampered}"})
    assert r.status_code == 401


# --- Unit tests on the auth engine (no HTTP) -------------------------------

def test_password_hash_roundtrip():
    h = auth.hash_password("p@ssw0rd")
    assert h != "p@ssw0rd"                      # stored value is a hash, not the plain text
    assert auth.verify_password("p@ssw0rd", h)  # correct password verifies
    assert not auth.verify_password("nope", h)  # wrong password fails


def test_expired_token_is_rejected():
    # Mint a token that's already expired, then confirm decode refuses it.
    original = auth.ACCESS_TOKEN_EXPIRE_MINUTES
    auth.ACCESS_TOKEN_EXPIRE_MINUTES = -1
    try:
        expired = auth.create_access_token({"sub": "1", "role": "admin"})
    finally:
        auth.ACCESS_TOKEN_EXPIRE_MINUTES = original
    with pytest.raises(ValueError):
        auth.decode_access_token(expired)


def test_require_role_allows_and_blocks():
    from fastapi import HTTPException

    class FakeUser:
        role = "admin"

    class Nurse:
        role = "nurse"

    checker = auth.require_role("coordinator", "admin")
    # Allowed role passes straight through.
    assert checker(FakeUser()).role == "admin"
    # Disallowed role -> 403 Forbidden.
    with pytest.raises(HTTPException) as exc:
        checker(Nurse())
    assert exc.value.status_code == 403
