# routers/referrals.py — the endpoint a coordinator uses to refer an approved
# application to a hospital. This is the second half of the Phase 4 coordinator
# flow (the first half — review + approve — lives in routers/applications.py).

# APIRouter groups these routes; Depends injects the DB and the role guard.
# HTTPException + status let us return 404 (no such application) and 400 (the
# application isn't approved yet) with the right HTTP codes.
from fastapi import APIRouter, Depends, HTTPException, Request, status

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
# audit.write_audit records PHI access to the append-only audit trail.
import audit


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
# response_model=list[ReferralSummary] nests each referral's patient as the MINIMAL
# ApplicationSummary (name + status only) — it drops the bulk PHI (email, contact,
# eligibility answers), which now travels only on the audited single read below
# (GET /referrals/{id}). The list still carries patient_name, which IS PHI, so this
# read is itself audited (a coarse "referral.list" row). The require_role guard runs
# FIRST: no token -> 401, wrong role (e.g. a coordinator) -> 403. Newest first.
@router.get("", response_model=list[schemas.ReferralSummary])
def list_referrals(
    # Request gives us the client IP to stamp on the audit record. It has no default,
    # so it sits before the Depends(...) params (which do).
    request: Request,
    db: Session = Depends(get_db),
    # We need the actual user now (not a throwaway "_") so the audit row records WHO
    # pulled the referral inbox, taken from the verified token.
    current_user: models.User = Depends(auth.require_role("nurse", "admin")),
):
    referrals = (
        db.query(models.Referral)
        .order_by(models.Referral.created_at.desc())
        .all()
    )

    # The inbox returns patient names (PHI), so a list read is itself a PHI read and
    # must be audited. It's a BULK read, not one record, so entity_id is None — the
    # row records WHO pulled the inbox, not which referral. Read-only, so write_audit's
    # own commit is all that's needed. Fail-closed like the applications inbox: if the
    # audit write raises, the exception propagates and the inbox is never returned.
    audit.write_audit(
        db,
        actor_id=current_user.id,
        action="referral.list",
        entity="referral",
        entity_id=None,
        # request.client can be None in some ASGI setups; fall back to no IP then.
        ip=request.client.host if request.client else None,
    )
    return referrals


# GET /referrals/{referral_id}  → a nurse (or admin) opens ONE referral in full — the
# audited single-record read. Unlike the minimized list above, this returns the full
# ReferralDetailRead: the nested patient's email, contact, and every eligibility answer.
# The nurse drawer calls this when a patient is opened, so the bulk PHI travels only for
# the one record being viewed, and we write a per-record audit row for that read.
@router.get("/{referral_id}", response_model=schemas.ReferralDetailRead)
def get_referral(
    referral_id: int,
    # Request gives us the client IP to stamp on the audit record. It has no default,
    # so it sits before the Depends(...) params (which do).
    request: Request,
    db: Session = Depends(get_db),
    # We need the actual user now (not a throwaway "_") so the audit row records WHO
    # read this patient's PHI, taken from the verified token.
    current_user: models.User = Depends(auth.require_role("nurse", "admin")),
):
    referral = (
        db.query(models.Referral)
        .filter(models.Referral.id == referral_id)
        .first()
    )
    # No row with that id -> 404 Not Found. This check runs BEFORE the audit write, so a
    # miss leaves no audit row (we only record an actual PHI read of a real referral).
    if referral is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Referral not found"
        )

    # Deferred ownership: any nurse can currently open any referral — there's no
    # per-nurse assignment on the model yet (referrals carry referred_by, the
    # coordinator, not an assigned nurse). When that lands, scope this read to the
    # owning nurse (404, not 403, to avoid leaking existence) the same way. For now
    # the guard is role-only, matching GET /applications/{id}.
    #
    # Record the PHI read BEFORE returning. write_audit is fail-closed: if it raises,
    # the exception propagates and the patient's data is never sent back — an
    # unauditable PHI access must not succeed.
    audit.write_audit(
        db,
        actor_id=current_user.id,
        action="referral.read",
        entity="referral",
        entity_id=referral.id,
        # request.client can be None in some ASGI setups; fall back to no IP then.
        ip=request.client.host if request.client else None,
    )
    return referral


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
