from fastapi import FastAPI
# CORSMiddleware lets us tell the browser which other origins (websites) are
# allowed to call this API. Without it, a page served from localhost:5173
# (our React dev server) is BLOCKED from fetching localhost:8000 (this API),
# because they are different origins. This is a browser security rule (CORS).
from fastapi.middleware.cors import CORSMiddleware
import config
import models
from database import engine
# Our routers: applications (public patient form + coordinator review), auth
# (staff login), referrals (coordinator refers; nurse follows up), and trials
# (nurse/admin create trials).
from routers import applications, auth, referrals, trials, users

# Reads every class in models.py and creates the matching tables in app.db
# (only creates tables that don't already exist — safe to run every startup).
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Turn on CORS so the React app is allowed to talk to this API from the browser.
app.add_middleware(
    CORSMiddleware,
    # Only requests coming FROM these origins are allowed. Sourced from config
    # (default: the Vite dev server); set CORS_ORIGINS in the env to add the real
    # site URL for deployment — comma-separated for more than one.
    allow_origins=config.CORS_ORIGINS,
    # Allow cookies/auth headers to ride along on requests (harmless now, needed
    # once we add login in Phase 3).
    allow_credentials=True,
    # "*" = allow every HTTP method (GET, POST, PATCH, ...). We mainly need POST.
    allow_methods=["*"],
    # "*" = allow every request header (e.g. Content-Type: application/json).
    allow_headers=["*"],
)

# Plug the applications router into the app. Without this line, the routes
# defined in routers/applications.py would never be served.
app.include_router(applications.router)

# Plug in the auth router too — this is what serves POST /auth/login and GET /auth/me.
app.include_router(auth.router)

# Plug in the referrals router — serves POST /referrals (coordinator refers an
# approved application), plus GET /referrals and PATCH /referrals/{id} (the nurse
# follow-up flow).
app.include_router(referrals.router)

# Plug in the trials router — serves POST /trials and GET /trials (nurse/admin
# create and list clinical trials), plus PATCH /trials/{id} (admin launches one).
app.include_router(trials.router)

# Plug in the users router — serves POST /users, GET /users and PATCH /users/{id}
# (admin-only account management: create coordinator/nurse accounts, list them,
# and enable/disable one). This is the Phase 6 admin flow.
app.include_router(users.router)

@app.get("/")
def home():
    return {"message": "Clinical trial platform is running"}