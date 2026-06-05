# tests/test_applications.py — automated tests for the Phase 4 coordinator flow:
# listing/reading applications, approving/rejecting them (PATCH), and referring an
# approved one to a hospital (POST /referrals). The focus is the two things our
# "definition of done" demands: the happy path works, AND bad/unauthorized input
# is rejected (401 no token, 403 wrong role, 404 missing, 400/422 bad input).
#
# Run from the Backend folder with the venv active:
#
#     pytest -v
#
# Like test_auth.py, these tests NEVER touch the real app.db. We spin up a fresh,
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
# A separate file from test_auth.py's so the two test modules can't collide.
TEST_DB_URL = "sqlite:///./test_applications.db"
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

    # Seed two staff accounts: a coordinator (allowed on these routes) and a nurse
    # (NOT allowed — used to prove the 403 role guard works).
    db = TestSession()
    db.add_all([
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


def make_application(client):
    # Create one application through the PUBLIC endpoint (no auth), the same way a
    # real patient would. Returns the created application's id.
    r = client.post("/applications", json={
        "patient_name": "Pat Patient",
        "email": "pat@example.com",
        "contact": "555-0100",
        "answers": [{"question": "Over 18?", "answer": "Yes"}],
    })
    assert r.status_code == 201
    return r.json()["id"]


# --- GET /applications: listing (auth + role) ------------------------------

def test_list_applications_without_token_is_401(client):
    r = client.get("/applications")
    assert r.status_code == 401


def test_nurse_cannot_list_applications(client):
    # A valid login but the wrong role -> 403 (we know who you are, you're not allowed).
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get("/applications", headers=auth_header(token))
    assert r.status_code == 403


def test_coordinator_lists_applications(client):
    make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/applications", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["patient_name"] == "Pat Patient"
    # The nested eligibility answers come back too (ApplicationRead nests them).
    assert body[0]["answers"][0]["question"] == "Over 18?"


# --- GET /applications/{id}: read one --------------------------------------

def test_get_single_application(client):
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get(f"/applications/{app_id}", headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["id"] == app_id


def test_get_missing_application_is_404(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/applications/9999", headers=auth_header(token))
    assert r.status_code == 404


# --- PATCH /applications/{id}: approve / reject ----------------------------

def test_coordinator_approves_application(client):
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.patch(
        f"/applications/{app_id}",
        json={"status": "approved"},
        headers=auth_header(token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_patch_invalid_status_is_422(client):
    # "banana" isn't in the Literal -> Pydantic rejects it with 422 before our code.
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.patch(
        f"/applications/{app_id}",
        json={"status": "banana"},
        headers=auth_header(token),
    )
    assert r.status_code == 422


def test_patch_missing_application_is_404(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.patch(
        "/applications/9999",
        json={"status": "approved"},
        headers=auth_header(token),
    )
    assert r.status_code == 404


def test_nurse_cannot_patch_application(client):
    app_id = make_application(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.patch(
        f"/applications/{app_id}",
        json={"status": "approved"},
        headers=auth_header(token),
    )
    assert r.status_code == 403


# --- POST /referrals: refer an approved application ------------------------

def test_coordinator_refers_approved_application(client):
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")

    # The coordinator's own id, so we can check referred_by is stamped from the token.
    me = client.get("/auth/me", headers=auth_header(token)).json()

    # Must approve first (the workflow rule), then refer.
    client.patch(f"/applications/{app_id}", json={"status": "approved"}, headers=auth_header(token))
    r = client.post(
        "/referrals",
        json={"application_id": app_id, "hospital": "City General"},
        headers=auth_header(token),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["hospital"] == "City General"
    assert body["status"] == "referred"
    # referred_by comes from the logged-in user, not the request body.
    assert body["referred_by"] == me["id"]

    # And the application itself is now marked "referred".
    after = client.get(f"/applications/{app_id}", headers=auth_header(token)).json()
    assert after["status"] == "referred"


def test_referring_unapproved_application_is_400(client):
    # Brand-new application is still "new", not "approved" -> referral refused (400).
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.post(
        "/referrals",
        json={"application_id": app_id, "hospital": "City General"},
        headers=auth_header(token),
    )
    assert r.status_code == 400


def test_referring_missing_application_is_404(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.post(
        "/referrals",
        json={"application_id": 9999, "hospital": "City General"},
        headers=auth_header(token),
    )
    assert r.status_code == 404


def test_nurse_cannot_refer(client):
    app_id = make_application(client)
    coord = token_for(client, "coordinator@crp.test", "coord123")
    client.patch(f"/applications/{app_id}", json={"status": "approved"}, headers=auth_header(coord))

    nurse = token_for(client, "nurse@crp.test", "nurse123")
    r = client.post(
        "/referrals",
        json={"application_id": app_id, "hospital": "City General"},
        headers=auth_header(nurse),
    )
    assert r.status_code == 403


def test_refer_without_token_is_401(client):
    app_id = make_application(client)
    r = client.post("/referrals", json={"application_id": app_id, "hospital": "City General"})
    assert r.status_code == 401


# --- Audit logging: reading one application records a PHI-access row --------

def test_get_single_application_writes_audit(client):
    # Reading a single application is a PHI read, so it must leave exactly one
    # audit row stamped with WHO read it, WHAT they did, and WHICH application.
    app_id = make_application(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    # The coordinator's own id, to check actor_id is taken from the token.
    me = client.get("/auth/me", headers=auth_header(token)).json()

    r = client.get(f"/applications/{app_id}", headers=auth_header(token))
    assert r.status_code == 200

    # Inspect the audit trail directly in the test DB.
    db = TestSession()
    try:
        entries = db.query(models.AuditLog).all()
    finally:
        db.close()

    assert len(entries) == 1
    entry = entries[0]
    assert entry.action == "application.read"
    assert entry.entity == "application"
    assert entry.entity_id == app_id
    # actor_id comes from the logged-in user, not the request.
    assert entry.actor_id == me["id"]
    # The client IP was captured (TestClient reports a host, so this is set).
    assert entry.ip is not None


def test_missing_application_read_writes_no_audit(client):
    # The 404 check runs BEFORE the audit write, so reading a non-existent
    # application must NOT create an audit row.
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/applications/9999", headers=auth_header(token))
    assert r.status_code == 404

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


def test_unauthorized_read_writes_no_audit(client):
    # No token -> the role guard rejects the request with 401 BEFORE the route
    # body runs, so no PHI is read and no audit row is written.
    app_id = make_application(client)
    r = client.get(f"/applications/{app_id}")
    assert r.status_code == 401

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0


def test_wrong_role_read_writes_no_audit(client):
    # A valid login but the wrong role (nurse) is rejected with 403 by the guard
    # before the route body, so the read never happens and no audit row exists.
    app_id = make_application(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get(f"/applications/{app_id}", headers=auth_header(token))
    assert r.status_code == 403

    db = TestSession()
    try:
        count = db.query(models.AuditLog).count()
    finally:
        db.close()
    assert count == 0
