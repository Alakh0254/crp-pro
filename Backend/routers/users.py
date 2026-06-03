# routers/users.py — the admin account-management endpoints (Phase 6). An admin
# creates coordinator/nurse accounts, lists every staff account, and enables or
# disables one. This is the backend half of the admin dashboard; the seed script
# (seed_users.py) only exists to break the chicken-and-egg of the first admin —
# from here on, an admin manages accounts through these routes.

# APIRouter groups these routes; Depends injects the DB and the role guard.
# HTTPException + status let us return 400 (duplicate email / self-disable) with
# the right HTTP code.
from fastapi import APIRouter, Depends, HTTPException, status

# The type of the DB session (for the hint).
from sqlalchemy.orm import Session

# Our per-request session dependency.
from database import get_db
# models = the SQLAlchemy tables; schemas = the Pydantic request/response shapes.
import models
import schemas
# auth.require_role is the Phase 3 role guard; auth.hash_password stores the new
# account's password as a hash, never in the clear (same as the seed script).
import auth


# A mini-app for everything under /users. tags=["users"] groups it in /docs.
router = APIRouter(prefix="/users", tags=["users"])


# POST /users  → an admin creates a coordinator/nurse account. status_code=201 =
# "a new resource was created". response_model=UserRead strips the row down to the
# safe fields, so the password hash can never escape in the response.
@router.post("", response_model=schemas.UserRead, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    # Admin only: creating accounts is the one thing only an admin may do.
    _: models.User = Depends(auth.require_role("admin")),
):
    # 1. Emails are unique (it's how staff log in), so reject a duplicate up front
    #    with a clean 400 rather than letting the DB raise an IntegrityError -> 500.
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email already exists",
        )

    # 2. Build the row, hashing the password on the way in. is_active/created_at
    #    use the model defaults (True / now).
    user = models.User(
        name=payload.name,
        email=payload.email,
        hashed_password=auth.hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    # Refresh so the server-generated fields (id, is_active, created_at) are
    # populated on the object we return.
    db.refresh(user)
    return user


# GET /users  → an admin lists every staff account (newest first), so the admin
# dashboard can show who exists and who's disabled. UserRead omits the password
# hash, so the list is safe to send.
@router.get("", response_model=list[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_role("admin")),
):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()


# PATCH /users/{user_id}  → an admin enables or disables an account. Disabling
# (is_active=False) is how an admin "removes" a staff member without deleting the
# row: the login route already refuses a disabled account, and get_current_user
# rejects an existing token for one. PATCH (not PUT) because we update ONE field.
@router.patch("/{user_id}", response_model=schemas.UserRead)
def update_user_status(
    user_id: int,
    payload: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
    # We need the acting admin (not just "an admin") so we can stop them disabling
    # their OWN account, which would lock them out of the only management routes.
    current_user: models.User = Depends(auth.require_role("admin")),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    # No row with that id -> 404 Not Found (rather than returning null/200).
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    # Guard against self-lockout: an admin disabling themselves would be unable to
    # re-enable the account (every management route is admin-only). Reject with 400.
    if user.id == current_user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot disable your own account",
        )

    # Apply the change, then commit + refresh so the response reflects the DB.
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
