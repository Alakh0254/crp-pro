# auth.py — the "engine room" for logging in: password hashing, JWT tokens, and
# the dependencies that protect routes. Everything security-related lives here so
# the rest of the app can just say "give me the current user" without caring how.

# os: lets us read environment variables (so the secret key isn't hardcoded).
import os
# hmac + hashlib: the standard-library crypto we use to SIGN our JWTs (HS256 is
# literally HMAC with SHA-256). hmac.compare_digest also gives us a timing-safe
# comparison so attackers can't guess the signature byte-by-byte.
import hmac
import hashlib
# base64: a JWT is just base64url-encoded JSON pieces joined by dots. We use the
# urlsafe variant because '+' and '/' aren't allowed in URLs/headers.
import base64
# json: the header and payload of a JWT are JSON objects before encoding.
import json
# We stamp each token with an expiry time and check it on the way back in.
from datetime import datetime, timezone, timedelta

# CryptContext is passlib's high-level "hash/verify" helper. We keep passlib (as
# planned) but use the pure-Python pbkdf2_sha256 scheme: the installed bcrypt 5.0
# is incompatible with passlib's bcrypt backend, and pbkdf2_sha256 needs no native
# library — it just works. Swap "pbkdf2_sha256" -> "bcrypt" later if you want.
from passlib.context import CryptContext

# FastAPI plumbing:
# - Depends: the same dependency-injection we use for get_db.
# - HTTPException + status: how we return 401/403 with the right HTTP code.
from fastapi import Depends, HTTPException, status
# OAuth2PasswordBearer does two jobs: (1) it pulls the token out of the
# "Authorization: Bearer <token>" header for us, and (2) it makes /docs show an
# "Authorize" button so you can test protected routes in the browser.
from fastapi.security import OAuth2PasswordBearer

# Session is just the type of the DB connection get_db hands us (for the hint).
from sqlalchemy.orm import Session

# Our per-request DB session dependency and the ORM models.
from database import get_db
import models


# --- Configuration ---------------------------------------------------------

# The secret used to sign tokens. NEVER hardcode real secrets — read it from the
# environment, with a throwaway default for local dev only. (SDLC_PLAN.md: secrets
# via env vars.) On a real deployment you'd set SECRET_KEY to a long random value.
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")

# The signing algorithm name we advertise in the JWT header. HS256 = HMAC-SHA256.
ALGORITHM = "HS256"

# How long a login stays valid. After this, the token is rejected and you log in
# again. 60 minutes is a sane default for a learning app.
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# --- Password hashing ------------------------------------------------------

# One shared CryptContext for the whole app. schemes lists the algorithm(s) we
# accept; deprecated="auto" lets passlib flag old hashes if we ever add a newer
# scheme later.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


# A precomputed hash of a throwaway password. The login route verifies against
# THIS when no user matches the submitted email, so a missing account costs the
# same time as a real account with a wrong password. Without it, the "no user"
# path returns measurably faster (it skips hashing), leaking which emails are
# registered — a timing side-channel that defeats our same-error enumeration
# defense. Computed once at import; the cost is negligible. (See routers/auth.py.)
DUMMY_PASSWORD_HASH = pwd_context.hash("not-a-real-password-timing-guard")


# Turn a plain-text password into a one-way hash for storage. We call this in the
# seed script (and later in POST /users). The raw password is never saved.
def hash_password(plain_password: str) -> str:
    # passlib generates a random salt and embeds it in the returned string, so we
    # don't manage salts ourselves.
    return pwd_context.hash(plain_password)


# Check a login attempt: does this plain password match the stored hash? Returns
# True/False. passlib re-derives the hash using the salt baked into `hashed` and
# compares safely.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT helpers (HS256, by hand) ------------------------------------------
# A JWT is three base64url chunks joined by dots:  header.payload.signature
# We build it with stdlib so there's no dependency to install. This is exactly
# what python-jose would do internally.

# base64url-encode some bytes WITHOUT the trailing '=' padding (JWTs omit it).
def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


# Reverse of the above: add back the padding base64 needs, then decode.
def _b64url_decode(segment: str) -> bytes:
    # Each base64 group is 4 chars; pad up to a multiple of 4 with '='.
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


# Compute the signature for the "header.payload" part using HMAC-SHA256 + our key.
def _sign(signing_input: bytes) -> str:
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return _b64url_encode(signature)


# Build a signed token from a dict of claims (e.g. {"sub": "1", "role": "admin"}).
def create_access_token(data: dict) -> str:
    # Copy so we don't mutate the caller's dict.
    payload = data.copy()
    # "exp" is a standard JWT claim: the expiry time as a Unix timestamp (seconds).
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = int(expire.timestamp())

    # The header declares the type and signing algorithm.
    header = {"alg": ALGORITHM, "typ": "JWT"}

    # Encode header and payload as compact JSON, then base64url them.
    # separators=(",", ":") removes whitespace so the token is as short as possible.
    header_segment = _b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    payload_segment = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode())

    # Sign "header.payload" — the signature covers both, so neither can be altered.
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature_segment = _sign(signing_input)

    # The finished token.
    return f"{header_segment}.{payload_segment}.{signature_segment}"


# Verify a token and return its claims, or raise ValueError if anything is wrong.
def decode_access_token(token: str) -> dict:
    # A valid token has exactly three dot-separated parts.
    try:
        header_segment, payload_segment, signature_segment = token.split(".")
    except ValueError:
        raise ValueError("Malformed token")

    # Re-sign the header.payload we received and compare to the signature we were
    # given. compare_digest is constant-time to avoid timing attacks.
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    expected_signature = _sign(signing_input)
    if not hmac.compare_digest(expected_signature, signature_segment):
        # Wrong signature = forged or tampered token.
        raise ValueError("Bad signature")

    # Signature is good, so the payload is trustworthy. Decode it back to a dict.
    payload = json.loads(_b64url_decode(payload_segment))

    # Enforce expiry ourselves (we signed it in, now we check it).
    if "exp" in payload and datetime.now(timezone.utc).timestamp() > payload["exp"]:
        raise ValueError("Token expired")

    return payload


# --- The auth dependencies (what protects routes) --------------------------

# Tells FastAPI where the login endpoint is (for the /docs Authorize button) and
# how to find the token in incoming requests (the Authorization header).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


# A dependency that turns a request's token into the actual User row. Any route
# that does `Depends(get_current_user)` becomes protected: no valid token -> 401.
def get_current_user(
    # FastAPI runs oauth2_scheme first and injects the raw token string here.
    token: str = Depends(oauth2_scheme),
    # And opens a DB session so we can look the user up.
    db: Session = Depends(get_db),
) -> models.User:
    # The 401 we'll raise if anything about the token is wrong. The
    # WWW-Authenticate header is the OAuth2-standard hint to the client.
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Verify the signature + expiry, pull out the claims, and read the user id.
    # We keep the int() conversion INSIDE the try so a token with a non-numeric
    # "sub" turns into a clean 401 instead of an uncaught ValueError -> 500.
    # (Unreachable today since we always mint sub=str(id) and forged tokens fail
    # the signature check first, but this makes it robust by construction.)
    try:
        payload = decode_access_token(token)
        # "sub" (subject) is where we stored the user id when minting the token.
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except ValueError:
        raise credentials_exception

    # Load that user from the DB (ORM query, no raw SQL).
    user = db.query(models.User).filter(models.User.id == user_id).first()
    # Token referenced a user that no longer exists -> treat as invalid.
    if user is None:
        raise credentials_exception

    # A disabled account shouldn't be allowed in even with a valid token.
    if not user.is_active:
        raise credentials_exception

    # Success: hand the live User object to the route.
    return user


# A FACTORY: call require_role("coordinator", "admin") to GET a dependency that
# only lets those roles through. This is how we do role-based access control.
def require_role(*allowed_roles: str):
    # The inner function is the actual dependency FastAPI will run. It first runs
    # get_current_user (so the user is already authenticated), then checks role.
    def role_checker(user: models.User = Depends(get_current_user)) -> models.User:
        # Authenticated but wrong role -> 403 Forbidden (different from 401: we
        # know who you are, you're just not allowed).
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return user

    # Return the configured dependency so routes can use it in Depends(...).
    return role_checker
