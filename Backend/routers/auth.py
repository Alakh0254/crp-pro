# routers/auth.py — the actual HTTP endpoints for logging in and for checking
# "who am I". The security logic lives in auth.py; this file just wires it to URLs.

# APIRouter groups these routes; Depends injects our dependencies (DB, current user).
from fastapi import APIRouter, Depends, HTTPException, status

# OAuth2PasswordRequestForm makes the login endpoint accept FORM fields named
# "username" and "password" (the OAuth2 standard) instead of a JSON body. This is
# what lets the /docs Authorize popup log you in directly.
from fastapi.security import OAuth2PasswordRequestForm

# The type of the DB session (for the hint).
from sqlalchemy.orm import Session

# Our per-request session dependency.
from database import get_db
# The ORM models (we query models.User) and the Pydantic response shapes.
import models
import schemas
# The auth engine: password check, token minting, and the current-user dependency.
import auth


# A mini-app for everything under /auth. tags=["auth"] groups it in /docs.
router = APIRouter(prefix="/auth", tags=["auth"])


# POST /auth/login → check email + password, hand back a JWT.
# response_model=Token means the reply is filtered to exactly {access_token, token_type}.
@router.post("/login", response_model=schemas.Token)
def login(
    # FastAPI fills this from the submitted form fields. We use the email as the
    # "username". Depends() (with no argument) tells FastAPI to build the form for us.
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # 1. Find the user by email (ORM query, no raw SQL). form_data.username holds
    #    whatever was typed in the username box — for us, the email.
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # 2. Check the password. If no user matched, we STILL run a verify against a
    #    throwaway hash so a missing email takes the same time as a real one with a
    #    wrong password — otherwise the early-out would leak (via timing) which
    #    emails are registered, defeating the same-error defense below.
    if user:
        password_ok = auth.verify_password(form_data.password, user.hashed_password)
    else:
        auth.verify_password(form_data.password, auth.DUMMY_PASSWORD_HASH)
        password_ok = False

    # 3. Reject — with one generic 401 — if the email is unknown, the password is
    #    wrong, OR the account is disabled. We never reveal which, so an attacker
    #    learns nothing. `not password_ok` short-circuits when user is None, so
    #    `user.is_active` is only read when we actually have a user.
    if not password_ok or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 4. Build the token. "sub" (subject) carries the user id; we also stash the
    #    role so later route guards can read it. sub must be a string per the JWT spec.
    access_token = auth.create_access_token({"sub": str(user.id), "role": user.role})

    # 5. Return it in the standard shape. token_type defaults to "bearer" in the schema.
    return schemas.Token(access_token=access_token)


# GET /auth/me → return the logged-in user. This route's only job is to PROVE the
# token works: it depends on get_current_user, so without a valid token you get a
# 401 and never reach the function body.
@router.get("/me", response_model=schemas.UserRead)
def read_me(current_user: models.User = Depends(auth.get_current_user)):
    # current_user is the User row resolved from the token. response_model strips
    # it down to UserRead (so the password hash can't escape).
    return current_user
