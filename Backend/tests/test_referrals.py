# tests/test_referrals.py — automated tests for the Phase 5 referrals PHI-minimization
# slice: listing referrals (GET /referrals) and reading one (GET /referrals/{id}). The
# focus mirrors the applications tests' "definition of done": the list is MINIMIZED
# (nested patient = name + status only, no email/contact/answers) and is itself audited
# as a bulk read; the single read carries the full PHI and is audited per record; and
# bad/unauthorized input is rejected (401 no token, 403 wrong role, 404 missing) WITHOUT
# leaving an audit row.
#
# Run from the Backend folder with the venv active:
#
#     pytest -v
#
# Like the other test modules, these NEVER touch the real app.db. We spin up a fresh,
# empty SQLite file and override get_db so every test starts from a clean schema.

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from database import Base, get_db
import models
import auth


# --- A throwaway test database --------------------------------------------
# Its own file so this module can't collide with the other test modules' DBs.
TEST_DB_URL = "sqlite:///./test_referrals.db"
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

    # Seed two staff accounts: a nurse (allowed on the referral read routes) and a
    # coordinator (NOT allowed — used to prove the 403 role guard works). The
    # coordinator is also the one who creates the referral in make_referral below.
    db = TestSession()
    db.add_all([
        models.User(
            name="Nurse User",
            email="nurse@crp.test",
            hashed_password=auth.hash_password("nurse123"),
            role="nurse",
        ),
        models.User(
            name="Coordinator User",
            email="coordinator@crp.test",
            hashed_password=auth.hash_password("coord123"),
            role="coordinator",
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


def make_referral(client):
    # Build one referral the way the real flow does: a patient applies (public), a
    # coordinator approves it, then refers it. Returns the created referral's id.
    #
    # None of these endpoints are audited (POST /applications, PATCH /applications/{id},
    # POST /referrals write no audit row), so the audit table stays EMPTY after setup —
    # which lets each test assert the EXACT audit rows its own read produced.
    r = client.post("/applications", json={
        "patient_name": "Pat Patient",
        "email": "pat@example.com",
        "contact": "555-0100",
        "answers": [{"question": "Over 18?", "answer": "Yes"}],
    })
    assert r.status_code == 201
    app_id = r.json()["id"]

    coord = token_for(client, "coordinator@crp.test", "coord123")
    client.patch(
        f"/applications/{app_id}",
        json={"status": "approved"},
        headers=auth_header(coord),
    )
    r = client.post(
        "/referrals",
        json={"application_id": app_id, "hospital": "City General"},
        headers=auth_header(coord),
    )
    assert r.status_code == 201
    return r.json()["id"]


# --- GET /referrals: the minimized inbox + its bulk audit row --------------

def test_nurse_lists_referrals_is_minimized(client):
    make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get("/referrals", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    row = body[0]
    # The inbox needs the hospital + status + the nested patient's NAME to triage.
    assert row["hospital"] == "City General"
    assert row["status"] == "referred"
    assert row["application"]["patient_name"] == "Pat Patient"
    # PHI minimization: the nested patient must NOT carry email, contact, or the
    # eligibility answers — that bulk PHI only travels on the audited single read below.
    nested = row["application"]
    assert "email" not in nested
    assert "contact" not in nested
    assert "answers" not in nested


def test_list_referrals_writes_audit(client):
    # The inbox returns patient names (PHI), so pulling the list is itself a PHI read
    # and must leave exactly one "referral.list" audit row — stamped with WHO pulled
    # the inbox, but no single entity_id (it's a BULK read, not one record).
    make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    # The nurse's own id, to check actor_id is taken from the token.
    me = client.get("/auth/me", headers=auth_header(token)).json()

    r = client.get("/referrals", headers=auth_header(token))
    assert r.status_code == 200

    db = TestSession()
    try:
        entries = db.query(models.AuditLog).all()
    finally:
        db.close()

    assert len(entries) == 1
    entry = entries[0]
    assert entry.action == "referral.list"
    assert entry.entity == "referral"
    # A bulk read touches no single record, so entity_id is None.
    assert entry.entity_id is None
    assert entry.actor_id == me["id"]
    assert entry.ip is not None


# --- GET /referrals/{id}: the full-PHI single read + its per-record audit ----

def test_nurse_reads_one_referral_has_full_phi(client):
    ref_id = make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get(f"/referrals/{ref_id}", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == ref_id
    # The single read is the audited path, so the full PHI IS present here — nested
    # under application.* (a referral wraps an application): email, contact, answers.
    assert body["application"]["email"] == "pat@example.com"
    assert body["application"]["contact"] == "555-0100"
    assert body["application"]["answers"][0]["question"] == "Over 18?"


def test_read_one_referral_writes_audit(client):
    # Reading a single referral is a PHI read, so it must leave exactly one audit row
    # stamped with WHO read it, WHAT they did, and WHICH referral.
    ref_id = make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    me = client.get("/auth/me", headers=auth_header(token)).json()

    r = client.get(f"/referrals/{ref_id}", headers=auth_header(token))
    assert r.status_code == 200

    db = TestSession()
    try:
        entries = db.query(models.AuditLog).all()
    finally:
        db.close()

    assert len(entries) == 1
    entry = entries[0]
    assert entry.action == "referral.read"
    assert entry.entity == "referral"
    assert entry.entity_id == ref_id
    assert entry.actor_id == me["id"]
    assert entry.ip is not None


def test_read_missing_referral_is_404_no_audit(client):
    # The 404 check runs BEFORE the audit write, so reading a non-existent referral
    # must return 404 AND create no audit row.
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get("/referrals/9999", headers=auth_header(token))
    assert r.status_code == 404

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


# --- Cross-role / no-token: rejected by the guard, no PHI read, no audit -----

def test_coordinator_cannot_list_referrals(client):
    # A valid login but the wrong role (coordinator) -> 403, and the guard runs before
    # the route body, so no PHI is read and no audit row is written.
    make_referral(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/referrals", headers=auth_header(token))
    assert r.status_code == 403

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


def test_coordinator_cannot_read_one_referral(client):
    ref_id = make_referral(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get(f"/referrals/{ref_id}", headers=auth_header(token))
    assert r.status_code == 403

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


def test_list_referrals_without_token_is_401_no_audit(client):
    make_referral(client)
    r = client.get("/referrals")
    assert r.status_code == 401

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


def test_read_one_referral_without_token_is_401_no_audit(client):
    ref_id = make_referral(client)
    r = client.get(f"/referrals/{ref_id}")
    assert r.status_code == 401

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0
