# config.py — the single place the app reads its environment-driven settings.
# Everything that differs between dev / staging / prod (the JWT secret, the token
# lifetime, the database URL, the allowed CORS origins) is resolved here ONCE, so
# the rest of the code imports a ready-made constant instead of poking at
# os.environ itself. (CLAUDE.md: secrets via env vars, never hardcoded.)

# os: read the raw environment variables. warnings: emit the dev-only nudge below
# without crashing (unlike raising, a warning lets local work continue).
import os
import warnings

# load_dotenv reads a local .env file (if one exists) into the process
# environment BEFORE we look anything up below. .env is git-ignored and holds dev
# values; in staging/prod the real values come from the platform's environment,
# not a committed file. Calling it with no file present is a harmless no-op.
from dotenv import load_dotenv

load_dotenv()


# Which environment we're running in. This drives the SECRET_KEY policy below:
# "dev" is forgiving (so `uvicorn main:app` Just Works on a fresh checkout),
# anything else (staging/prod) is strict.
APP_ENV = os.environ.get("APP_ENV", "dev")


# The secret used to sign JWTs. There is no safe HARDCODED default for a real
# deployment, so the policy depends on APP_ENV:
#   - dev: fall back to a throwaway key, but WARN loudly so it's obvious the
#     signing key isn't real.
#   - anything else: refuse to start at all. A missing secret in staging/prod is
#     a security incident, not something to paper over with a default.
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if APP_ENV == "dev":
        warnings.warn(
            "SECRET_KEY is not set; falling back to an insecure dev-only key. "
            "Set SECRET_KEY in your environment before any non-dev deployment.",
            stacklevel=2,
        )
        SECRET_KEY = "dev-only-change-me"
    else:
        # Fail loud and early — better a refused startup than tokens signed with
        # a guessable key in an environment that handles real PHI.
        raise RuntimeError(
            f"SECRET_KEY must be set when APP_ENV={APP_ENV!r} "
            "(refusing to start without a signing key outside dev)."
        )


# How long a freshly minted access token stays valid, in minutes. Read from the
# env so prod can shorten it without a code change; defaults to 60.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


# Where the database lives. Defaults to the local SQLite file we've used all
# along; a Postgres URL can be supplied via the env later (that's the Docker
# task, not this one). database.py decides connect_args from this value.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")


# Which browser origins may call this API (CORS). Stored as a comma-separated
# string in the env (one var is easier to set than a list) and split into a list
# here. Blank entries are dropped so a trailing comma can't add an empty origin.
# Defaults to the Vite dev server.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]
