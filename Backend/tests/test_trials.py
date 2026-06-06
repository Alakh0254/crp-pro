# tests/test_trials.py — automated tests for the Phase 5 nurse flow: creating and
# listing clinical trials (POST/GET /trials), and following up on referred patients
# (GET /referrals with the nested application, PATCH /referrals/{id}). The focus is
# our "definition of done": the happy path works, side effects actually happen, and
# bad/unauthorized input is rejected (401 no token, 403 wrong role, 404 missing,
# 422 invalid value).
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
TEST_DB_URL = "sqlite:///./test_trials.db"
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

    # Seed the three staff roles we exercise: a nurse and an admin (both allowed on
    # the Phase 5 routes) and a coordinator (NOT allowed — used to prove the 403).
    db = TestSession()
    db.add_all([
        models.User(
            name="Nurse User",
            email="nurse@crp.test",
            hashed_password=auth.hash_password("nurse123"),
            role="nurse",
        ),
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
    # Build a referral the real way: a patient applies (public), a coordinator
    # approves the application, then refers it. Returns (referral_id, application_id)
    # so the nurse-flow tests have something to follow up on.
    app_id = client.post("/applications", json={
        "patient_name": "Pat Patient",
        "email": "pat@example.com",
        "contact": "555-0100",
        "answers": [{"question": "Over 18?", "answer": "Yes"}],
    }).json()["id"]

    coord = token_for(client, "coordinator@crp.test", "coord123")
    client.patch(f"/applications/{app_id}", json={"status": "approved"}, headers=auth_header(coord))
    ref_id = client.post(
        "/referrals",
        json={"application_id": app_id, "hospital": "City General"},
        headers=auth_header(coord),
    ).json()["id"]
    return ref_id, app_id


# --- POST /trials: create (happy path + side effects) ----------------------

def test_nurse_creates_trial(client):
    token = token_for(client, "nurse@crp.test", "nurse123")
    me = client.get("/auth/me", headers=auth_header(token)).json()

    r = client.post(
        "/trials",
        json={"title": "Hypertension Study", "description": "Phase II BP trial"},
        headers=auth_header(token),
    )
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Hypertension Study"
    # New trials default to "draft" (an admin launches them later in Phase 6).
    assert body["status"] == "draft"
    # created_by is stamped from the logged-in user, NOT the request body, so it
    # can't be forged.
    assert body["created_by"] == me["id"]

    # Side effect: the trial is actually persisted and now shows up in the list.
    listed = client.get("/trials", headers=auth_header(token)).json()
    assert any(t["id"] == body["id"] for t in listed)


def test_admin_can_also_create_trial(client):
    # Admins can do everything a nurse can on these routes.
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.post(
        "/trials",
        json={"title": "Admin Trial", "description": "Created by admin"},
        headers=auth_header(token),
    )
    assert r.status_code == 201


def test_trials_listed_newest_first(client):
    token = token_for(client, "nurse@crp.test", "nurse123")
    client.post("/trials", json={"title": "First", "description": "d1"}, headers=auth_header(token))
    client.post("/trials", json={"title": "Second", "description": "d2"}, headers=auth_header(token))
    rows = client.get("/trials", headers=auth_header(token)).json()
    assert [t["title"] for t in rows[:2]] == ["Second", "First"]


# --- POST /trials: bad / unauthorized input --------------------------------

def test_create_trial_missing_field_is_422(client):
    # No "description" -> Pydantic rejects it with 422 before our code runs.
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.post("/trials", json={"title": "No desc"}, headers=auth_header(token))
    assert r.status_code == 422


def test_create_trial_without_token_is_401(client):
    r = client.post("/trials", json={"title": "X", "description": "Y"})
    assert r.status_code == 401


def test_coordinator_cannot_create_trial(client):
    # A valid login but the wrong role -> 403.
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.post(
        "/trials",
        json={"title": "X", "description": "Y"},
        headers=auth_header(token),
    )
    assert r.status_code == 403


# --- GET /trials: auth + role ----------------------------------------------

def test_list_trials_without_token_is_401(client):
    r = client.get("/trials")
    assert r.status_code == 401


def test_coordinator_cannot_list_trials(client):
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/trials", headers=auth_header(token))
    assert r.status_code == 403


# --- PATCH /trials/{id}: admin launches / closes a trial (Phase 6) ----------
# This is the admin-dashboard half of the trials flow: a nurse creates a trial as
# a "draft" (above); an admin decides when it goes live ("open") and later closes
# it. Until now this endpoint had no coverage — these tests close that gap.

def make_trial(client):
    # Create a draft trial the real way (a nurse POSTs it) and return its id.
    token = token_for(client, "nurse@crp.test", "nurse123")
    return client.post(
        "/trials",
        json={"title": "Launchable", "description": "A draft to launch"},
        headers=auth_header(token),
    ).json()["id"]


def test_admin_launches_trial(client):
    trial_id = make_trial(client)
    token = token_for(client, "admin@crp.test", "admin123")

    r = client.patch(
        f"/trials/{trial_id}",
        json={"status": "open"},
        headers=auth_header(token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "open"

    # Side effect: the change persisted — the list reflects the launched trial.
    listed = client.get("/trials", headers=auth_header(token)).json()
    assert next(t for t in listed if t["id"] == trial_id)["status"] == "open"


def test_admin_closes_open_trial(client):
    trial_id = make_trial(client)
    token = token_for(client, "admin@crp.test", "admin123")
    # Launch it, then close it.
    client.patch(f"/trials/{trial_id}", json={"status": "open"}, headers=auth_header(token))
    r = client.patch(f"/trials/{trial_id}", json={"status": "closed"}, headers=auth_header(token))
    assert r.status_code == 200
    assert r.json()["status"] == "closed"


def test_patch_trial_invalid_status_is_422(client):
    # "banana" isn't in the Literal["open", "closed"] -> 422 before our code runs.
    trial_id = make_trial(client)
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.patch(
        f"/trials/{trial_id}",
        json={"status": "banana"},
        headers=auth_header(token),
    )
    assert r.status_code == 422


def test_patch_missing_trial_is_404(client):
    token = token_for(client, "admin@crp.test", "admin123")
    r = client.patch(
        "/trials/9999",
        json={"status": "open"},
        headers=auth_header(token),
    )
    assert r.status_code == 404


def test_nurse_cannot_launch_trial_is_403(client):
    # A nurse may CREATE a trial but not LAUNCH it — launching is admin-only.
    trial_id = make_trial(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.patch(
        f"/trials/{trial_id}",
        json={"status": "open"},
        headers=auth_header(token),
    )
    assert r.status_code == 403


def test_patch_trial_without_token_is_401(client):
    r = client.patch("/trials/1", json={"status": "open"})
    assert r.status_code == 401


# --- GET /referrals: nurse lists referred patients (Phase 5 follow-up) ------

def test_nurse_lists_referrals_with_nested_application(client):
    make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.get("/referrals", headers=auth_header(token))
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    assert body[0]["status"] == "referred"
    # The nurse sees WHO was referred from the MINIMIZED nested patient (name + status
    # only). The bulk PHI — email, contact, eligibility answers — is no longer in the
    # list; it travels only on the audited single read (GET /referrals/{id}). See
    # test_referrals.py for the full minimization + audit coverage.
    nested = body[0]["application"]
    assert nested["patient_name"] == "Pat Patient"
    assert "answers" not in nested
    assert "email" not in nested
    assert "contact" not in nested


def test_coordinator_cannot_list_referrals(client):
    # GET /referrals is the nurse follow-up view -> a coordinator gets 403.
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.get("/referrals", headers=auth_header(token))
    assert r.status_code == 403


def test_list_referrals_without_token_is_401(client):
    r = client.get("/referrals")
    assert r.status_code == 401


# --- PATCH /referrals/{id}: nurse records follow-up ------------------------

def test_nurse_marks_referral_contacted(client):
    ref_id, _ = make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.patch(
        f"/referrals/{ref_id}",
        json={"status": "contacted"},
        headers=auth_header(token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "contacted"

    # Side effect: the change persisted — the list reflects the new status.
    listed = client.get("/referrals", headers=auth_header(token)).json()
    assert next(x for x in listed if x["id"] == ref_id)["status"] == "contacted"


def test_patch_referral_invalid_status_is_422(client):
    # "banana" isn't in the Literal -> 422 before our code runs.
    ref_id, _ = make_referral(client)
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.patch(
        f"/referrals/{ref_id}",
        json={"status": "banana"},
        headers=auth_header(token),
    )
    assert r.status_code == 422


def test_patch_missing_referral_is_404(client):
    token = token_for(client, "nurse@crp.test", "nurse123")
    r = client.patch(
        "/referrals/9999",
        json={"status": "contacted"},
        headers=auth_header(token),
    )
    assert r.status_code == 404


def test_coordinator_cannot_patch_referral(client):
    ref_id, _ = make_referral(client)
    token = token_for(client, "coordinator@crp.test", "coord123")
    r = client.patch(
        f"/referrals/{ref_id}",
        json={"status": "contacted"},
        headers=auth_header(token),
    )
    assert r.status_code == 403
