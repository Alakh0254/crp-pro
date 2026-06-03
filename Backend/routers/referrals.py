# routers/referrals.py — the endpoint a coordinator uses to refer an approved
# application to a hospital. This is the second half of the Phase 4 coordinator
# flow (the first half — review + approve — lives in routers/applications.py).

# APIRouter groups these routes; Depends injects the DB and the role guard.
# HTTPException + status let us return 404 (no such application) and 400 (the
# application isn't approved yet) with the right HTTP codes.
from fastapi import APIRouter, Depends, HTTPException, status

# The type of the DB session (for the hint).
from sqlalchemy.orm import Session

# Our per-request session dependency.
from database import get_db
# models = the SQLAlchemy tables; schemas = the Pydantic request/response shapes.
import models
import schemas
# auth.require_role is the Phase 3 role guard; auth.get_current_user is used
# indirectly through it. We read the logged-in user to stamp "referred_by".
import auth


# A mini-app for everything under /referrals. tags=["referrals"] groups it in /docs.
router = APIRouter(prefix="/referrals", tags=["referrals"])


# POST /referrals  → a coordinator (or admin) refers an approved application to a
# hospital. status_code=201 = "a new resource was created".
@router.post("", response_model=schemas.ReferralRead, status_code=201)
def create_referral(
    payload: schemas.ReferralCreate,
    db: Session = Depends(get_db),
    # The guard both enforces auth AND hands us the user, so we can record WHO
    # made the referral. Same allowed roles as the review routes.
    current_user: models.User = Depends(auth.require_role("coordinator", "admin")),
):
    # 1. The application must exist. Look it up by the id in the request body.
    application = (
        db.query(models.Application)
        .filter(models.Application.id == payload.application_id)
        .first()
    )
    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    # 2. Enforce the workflow rule: you can only refer an application that has been
    #    approved. This mirrors real life ("approve eligibility, THEN refer") and
    #    gives us a clean 400 for the out-of-order case (a wrong-input rejection).
    if application.status != "approved":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only approved applications can be referred",
        )

    # 3. Build the referral row. referred_by comes from the logged-in user, never
    #    from the request, so it can't be forged. status/created_at use the model
    #    defaults ("referred" / now).
    referral = models.Referral(
        application_id=application.id,
        hospital=payload.hospital,
        referred_by=current_user.id,
    )
    db.add(referral)

    # 4. Advance the application itself to "referred" so the review list reflects
    #    that it's been handed off. Both changes are saved in the single commit
    #    below — all or nothing.
    application.status = "referred"

    db.commit()
    # Refresh so the server-generated fields (id, created_at, the default status)
    # are populated on the object we return.
    db.refresh(referral)
    return referral


# GET /referrals  → a nurse (or admin) lists referred patients to follow up on.
# response_model=list[ReferralDetailRead] nests each referral's patient application
# (name, contact, eligibility answers) so the nurse sees WHO was referred without a
# second request. The require_role guard runs FIRST: no token -> 401, wrong role
# (e.g. a coordinator) -> 403. Newest first, like the applications list.
@router.get("", response_model=list[schemas.ReferralDetailRead])
def list_referrals(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_role("nurse", "admin")),
):
    return (
        db.query(models.Referral)
        .order_by(models.Referral.created_at.desc())
        .all()
    )


# PATCH /referrals/{referral_id}  → a nurse records follow-up by moving a referral
# along its lifecycle (contacted / enrolled / declined). PATCH (not PUT) because
# we're updating ONE field. ReferralStatusUpdate.status is a Literal, so an invalid
# value is rejected with a 422 before we reach this body.
@router.patch("/{referral_id}", response_model=schemas.ReferralRead)
def update_referral_status(
    referral_id: int,
    payload: schemas.ReferralStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_role("nurse", "admin")),
):
    referral = (
        db.query(models.Referral)
        .filter(models.Referral.id == referral_id)
        .first()
    )
    # No row with that id -> 404 Not Found (rather than returning null/200).
    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found"
        )

    # Apply the new status, then commit + refresh so the response reflects the DB.
    referral.status = payload.status
    db.commit()
    db.refresh(referral)
    return referral
