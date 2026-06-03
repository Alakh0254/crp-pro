# routers/trials.py — the endpoints for clinical trials (Phase 5, nurse flow). A
# nurse (or admin) can create a trial and list the existing ones. Every new trial
# starts as "draft"; an admin "launches" it later (Phase 6) by moving its status.

# APIRouter groups these routes; Depends injects the DB and the role guard.
# HTTPException + status let the launch route return a clean 404 when a trial id
# doesn't exist.
from fastapi import APIRouter, Depends, HTTPException, status

# The type of the DB session (for the hint).
from sqlalchemy.orm import Session

# Our per-request session dependency.
from database import get_db
# models = the SQLAlchemy tables; schemas = the Pydantic request/response shapes.
import models
import schemas
# auth.require_role is the Phase 3 role guard. We also read the logged-in user to
# stamp "created_by" on a new trial.
import auth


# A mini-app for everything under /trials. tags=["trials"] groups it in /docs.
router = APIRouter(prefix="/trials", tags=["trials"])


# POST /trials  → a nurse (or admin) creates a trial. status_code=201 = "created".
@router.post("", response_model=schemas.TrialRead, status_code=201)
def create_trial(
    payload: schemas.TrialCreate,
    db: Session = Depends(get_db),
    # The guard enforces auth AND hands us the user, so we can record WHO created
    # the trial. Nurses and admins may create; coordinators may not.
    current_user: models.User = Depends(auth.require_role("nurse", "admin")),
):
    # Build the trial row. created_by comes from the logged-in user, never the
    # request, so it can't be forged. status/created_at use the model defaults
    # ("draft" / now).
    trial = models.Trial(
        title=payload.title,
        description=payload.description,
        created_by=current_user.id,
    )
    db.add(trial)
    db.commit()
    # Refresh so the server-generated fields (id, created_at, default status) are
    # populated on the object we return.
    db.refresh(trial)
    return trial


# GET /trials  → list every trial (newest first). Same nurse/admin guard as above.
@router.get("", response_model=list[schemas.TrialRead])
def list_trials(
    db: Session = Depends(get_db),
    # We don't use the user here; depending on the guard is what enforces the auth
    # check. The "_" name signals "intentionally unused".
    _: models.User = Depends(auth.require_role("nurse", "admin")),
):
    return db.query(models.Trial).order_by(models.Trial.created_at.desc()).all()


# PATCH /trials/{trial_id}  → an admin "launches" a trial by moving its status
# forward (draft -> open), or later closes it. This is the admin-only half of the
# trials flow: nurses create trials as drafts (above), an admin decides when one
# goes live. TrialStatusUpdate.status is a Literal, so an invalid value is rejected
# with a 422 before we reach this body.
@router.patch("/{trial_id}", response_model=schemas.TrialRead)
def update_trial_status(
    trial_id: int,
    payload: schemas.TrialStatusUpdate,
    db: Session = Depends(get_db),
    # Admin only — creating a trial is nurse/admin, but launching it is the admin's
    # call (SDLC_PLAN.md Phase 6: "admin launches trials").
    _: models.User = Depends(auth.require_role("admin")),
):
    trial = db.query(models.Trial).filter(models.Trial.id == trial_id).first()
    # No row with that id -> 404 Not Found (rather than returning null/200).
    if trial is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Trial not found"
        )

    # Apply the new status, then commit + refresh so the response reflects the DB.
    trial.status = payload.status
    db.commit()
    db.refresh(trial)
    return trial
