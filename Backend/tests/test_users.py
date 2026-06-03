# tests/test_users.py — automated tests for the Phase 6 admin flow: managing staff
# accounts (POST /users, GET /users, PATCH /users/{id}). This is the backend half
# of the admin dashboard, and until now it had NO automated coverage — these tests
# close that gap. The focus is our "definition of done": the happy path works, side
# effects actually happen (the new account can log in; a disabled one can't), and
# bad/unauthorized input is rejected (401 no token, 403 wrong role, 404 missing,
# 422 invalid value, 400 duplicate email / self-disable).
#
# Run from the Backend folder with the venv active:
#
#     pytest -v
#
# How to read a failure: pytest prints the failing test name, then the failed
# `assert`, showing LEFT (what we got) vs RIGHT (what we expected). A green dot /
# "PASSED" = that behavior works; "FAILED" points at the exact assertion.
#
# Like the other test modules, these NEVER touch the real app.db: we spin up a
# fresh, empty SQLite file and override get_db so every test starts clean.

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
import models
import auth


# --- A throwaway test database --------------------------------------------
# Its own file so this module can't collide with the other test modules.
TEST_DB_URL = "sqlite:///./test_users.db"
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


# The replacement for get_db: hands out sessions bound to the TEST engine.
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
    app.dependency_overrides[get_db] = override_get_db

    # Seed the three staff roles we exercise: an admin (the only role allowed on
    # these routes) plus a coordinator and a nurse (NOT allowed — used to prove 403).
    db = TestSession()
    db.add_all([
        models.User(
            name="Admin User",
            email="admin@crp.test",
            hashed_password=auth.hash_password("admin123"),
            role="admin",
        ),
        models.User(
            name="Coordinator User",
            email="coordinator@crp.test",
            hashed_password=auth.hash_password("coord123"),
            role="coordinator",
        ),
        models.User(
            name="Nurse User",
            email="nurse@crp.test",
            hashed_password=auth.hash_password("nurse123"),
            role="nurse",
        ),
    ])
    db.commit()
    db.close()

    yield TestClient(app)

    # Teardown: clear the override and wipe the tables so the next test is isolated.
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)


# --- Small helpers ---------------------------------------------------------

def token_for(client, email, password):
    # Log in and return just the JWT string. (Login takes FORM fields, not JSON.)
    r = client.post("/auth/login", data={"username": email, "password": password})
    assert r.status_code == 200
    return r.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# --- POST /users: an admin creates an account (happy path + side effects) ---

def test_admin_creates_coordinator_account(client):
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.post(
        "/users",
        json={
            "name": "New Coordinator",
            "email": "newcoord@crp.test",
            "password": "secret123",
            "role": "coordinator",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "newcoord@crp.test"
    assert body["role"] == "coordinator"
    # New accounts are enabled by default.
    assert body["is_active"] is True
    # The response must NEVER leak the password hash (UserRead omits it).
    assert "hashed_password" not in body
    assert "password" not in body

    # Side effect #1: the account is persisted and now shows up in the admin list.
    listed = client.get("/users", headers=auth_header(token)).json()
    assert any(u["email"] == "newcoord@crp.test" for u in listed)

    # Side effect #2: the password was hashed correctly, so the new account can
    # actually log in with the password we sent.
    login = client.post(
        "/auth/login",
        data={"username": "newcoord@crp.test", "password": "secret123"},
    )
    assert login.status_code == 200


def test_admin_creates_nurse_account(client):
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.post(
        "/users",
        json={
            "name": "New Nurse",
            "email": "newnurse@crp.test",
            "password": "secret123",
            "role": "nurse",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 201
    assert r.json()["role"] == "nurse"


# --- POST /users: bad / unauthorized input ---------------------------------

def test_create_user_duplicate_email_is_400(client):
    # The seeded admin email already exists -> a clean 400, not a DB 500.
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.post(
        "/users",
        json={
            "name": "Clashing",
            "email": "admin@crp.test",
            "password": "secret123",
            "role": "coordinator",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 400


def test_create_user_invalid_role_is_422(client):
    # role is a Literal["coordinator", "nurse"] — "admin" is not mintable here, so
    # Pydantic rejects it with 422 before our code runs.
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.post(
        "/users",
        json={
            "name": "Sneaky Admin",
            "email": "sneaky@crp.test",
            "password": "secret123",
            "role": "admin",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 422


def test_create_user_without_token_is_401(client):
    r = client.post(
        "/users",
        json={
            "name": "No Auth",
            "email": "noauth@crp.test",
            "password": "secret123",
            "role": "nurse",
        },
    )
    assert r.status_code == 401


def test_coordinator_cannot_create_user_is_403(client):
    # A valid login but the wrong role -> 403. Only an admin may create accounts.
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.post(
        "/users",
        json={
            "name": "Should Fail",
            "email": "shouldfail@crp.test",
            "password": "secret123",
            "role": "nurse",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 403


def test_nurse_cannot_create_user_is_403(client):
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.post(
        "/users",
        json={
            "name": "Should Fail",
            "email": "shouldfail2@crp.test",
            "password": "secret123",
            "role": "coordinator",
        },
        headers=auth_header(token),
    )
    assert r.status_code == 403


# --- GET /users: an admin lists every account ------------------------------

def test_admin_lists_users(client):
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.get("/users", headers=auth_header(token))
    assert r.status_code == 200
    rows = r.json()
    # The three seeded accounts are all present.
    emails = {u["email"] for u in rows}
    assert {"admin@crp.test", "coordinator@crp.test", "nurse@crp.test"} <= emails
    # The list must not leak password hashes.
    assert all("hashed_password" not in u for u in rows)


def test_list_users_without_token_is_401(client):
    r = client.get("/users")
    assert r.status_code == 401


def test_coordinator_cannot_list_users_is_403(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/users", headers=auth_header(token))
    assert r.status_code == 403


# --- PATCH /users/{id}: an admin enables / disables an account -------------

def _account_id(client, token, email):
    # Find a seeded account's id by email (the admin list is the only way in).
    rows = client.get("/users", headers=auth_header(token)).json()
    return next(u["id"] for u in rows if u["email"] == email)


def test_admin_disables_account(client):
    token = token_for(client, "admin@crp.test", "admin123")
    nurse_id = _account_id(client, token, "nurse@crp.test")

    r = client.patch(
        f"/users/{nurse_id}",
        json={"is_active": False},
        headers=auth_header(token),
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False

    # Side effect: a disabled account can no longer log in (login returns 401).
    login = client.post(
        "/auth/login",
        data={"username": "nurse@crp.test", "password": "nurse123"},
    )
    assert login.status_code == 401


def test_admin_reenables_account(client):
    token = token_for(client, "admin@crp.test", "admin123")
    nurse_id = _account_id(client, token, "nurse@crp.test")

    # Disable then re-enable.
    client.patch(f"/users/{nurse_id}", json={"is_active": False}, headers=auth_header(token))
    r = client.patch(f"/users/{nurse_id}", json={"is_active": True}, headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["is_active"] is True

    # Side effect: with the account active again, the nurse can log in once more.
    login = client.post(
        "/auth/login",
        data={"username": "nurse@crp.test", "password": "nurse123"},
    )
    assert login.status_code == 200


def test_disabling_account_revokes_existing_token(client):
    # A token issued BEFORE disabling must stop working AFTER — get_current_user
    # refuses a disabled account even with an otherwise-valid token.
    admin = token_for(client, "admin@crp.test", "admin123")
    nurse = token_for(client, "nurse@crp.test", "nurse123")

    # The live token works right now.
    assert client.get("/auth/me", headers=auth_header(nurse)).status_code == 200

    nurse_id = _account_id(client, admin, "nurse@crp.test")
    client.patch(f"/users/{nurse_id}", json={"is_active": False}, headers=auth_header(admin))

    # Same token, but the account is now disabled -> 401.
    assert client.get("/auth/me", headers=auth_header(nurse)).status_code == 401


def test_admin_cannot_disable_own_account_is_400(client):
    # Self-disable would lock the admin out of every management route -> rejected 400.
    token = token_for(client, "admin@crp.test", "admin123")
    admin_id = _account_id(client, token, "admin@crp.test")
    r = client.patch(
        f"/users/{admin_id}",
        json={"is_active": False},
        headers=auth_header(token),
    )
    assert r.status_code == 400


def test_patch_missing_user_is_404(client):
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.patch(
        "/users/9999",
        json={"is_active": False},
        headers=auth_header(token),
    )
    assert r.status_code == 404


def test_patch_user_missing_field_is_422(client):
    # No "is_active" -> Pydantic rejects it with 422 before our code runs.
    token = token_for(client, "admin@crp.test", "admin123")
    nurse_id = _account_id(client, token, "nurse@crp.test")
    r = client.patch(f"/users/{nurse_id}", json={}, headers=auth_header(token))
    assert r.status_code == 422


def test_patch_user_without_token_is_401(client):
    r = client.patch("/users/1", json={"is_active": False})
    assert r.status_code == 401


def test_coordinator_cannot_patch_user_is_403(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.patch("/users/1", json={"is_active": False}, headers=auth_header(token))
    assert r.status_code == 403
