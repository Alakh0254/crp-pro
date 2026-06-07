# CRP-Pro

CRP-Pro is a **clinical-trial patient-recruitment platform** built as a portfolio /
learning project while working through FastAPI and React. Because the domain involves
patient health information (PHI), the code is written with a **HIPAA-aware** mindset —
role-based access control, PHI minimization on list endpoints, an append-only audit
trail on PHI reads, and generic login errors are all enforced today. It is **not** a
production-ready HIPAA system: several controls a real deployment would require
(consent capture, encryption at rest, multi-tenant `org_id` isolation, audit on write
paths) are **planned but not yet built**. Each section below is explicit about what is
**built today** versus what is **planned**, so nothing here oversells what the code
actually does.

> **Note on the design docs:** `claude.md` and `ARCHITECTURE.md` describe an
> *aspirational target architecture* (async SQLAlchemy, a monorepo of separate apps,
> Redis/Celery, multi-tenancy). The current code is a single flat FastAPI app and a
> single React app — it intentionally differs from those documents.

## What it does

- **Patients (public, no login).** A patient submits an application through a single
  public endpoint, `POST /applications` — name, contact details, and eligibility
  answers in one request. That is the whole patient surface. Patients **cannot browse
  trials**: listing trials is a staff-only endpoint today.
- **Staff (three roles, one login).** Coordinators, nurses, and admins all sign in
  through the **same login page**. There is one set of credentials per account; the
  **role stored on the user row in the database** — verified server-side on every
  request — decides which dashboard the user lands on and what they may do. The login
  page itself grants no access.
  - **Coordinator** — reviews the incoming application inbox, opens an application,
    and refers an approved patient to a hospital.
  - **Nurse** — works the referrals sent by coordinators and can create trials.
  - **Admin** — manages staff accounts, oversees the dashboards, and launches trials.

## Tech stack

**Backend**
- **FastAPI** (Python 3.12), with Pydantic **v2** for request/response validation.
- **SQLAlchemy 2.0**, used **synchronously** (not async).
- **Hand-rolled HS256 JWTs** built with the standard library (`hmac` + `hashlib` +
  `base64`), and **passlib** with the **`pbkdf2_sha256`** scheme for password hashing.
- **SQLite** by default (a local file, zero setup); **PostgreSQL** via `DATABASE_URL`.

**Frontend**
- **React + Vite + TypeScript**, with **TanStack Query** for server state and
  **React Router** for routing.

**Other**
- **Docker** / Docker Compose for the full stack (Postgres + backend + frontend).
- **There is no Redis and no Celery** — there is no background worker or task queue.

## Architecture

The repository is a flat two-folder layout: a FastAPI app under `Backend/` and a React
app under `Frontend/`.

### Backend structure

```
Backend/
  config.py         # env-driven settings (SECRET_KEY policy, DATABASE_URL, CORS)
  database.py       # engine, session, get_db dependency, Base
  main.py           # FastAPI app, CORS, router registration
  auth.py           # password hashing, JWT sign/verify, get_current_user, require_role
  audit.py          # write_audit() — the only writer to the append-only audit trail
  models.py         # SQLAlchemy ORM models
  schemas.py        # Pydantic v2 request/response models
  seed_users.py     # one-off script that creates the staff accounts
  routers/
    auth.py         # login, current user
    users.py        # admin account management
    applications.py # public submit + coordinator inbox
    referrals.py    # coordinator creates, nurse works
    trials.py       # create / list / launch
  tests/            # pytest suite (RBAC, audit, PHI minimization)
```

### Frontend structure

```
Frontend/src/
  pages/            # Login, PatientForm, StaffHome, Coordinator/Nurse/Admin dashboards
  routes/           # ProtectedRoute — gates staff pages by auth/role
  ui/               # shared components (AppShell, Button, Card, Drawer, ...)
  auth/             # AuthContext — token + current-user state
  hooks/            # queries.ts — TanStack Query hooks
  api.ts            # fetch wrapper / API client
  App.tsx           # routes
  main.tsx          # entry point
```

## Database models

Six SQLAlchemy models live in [Backend/models.py](Backend/models.py):

- **User** — staff account: name, email, hashed password, `role`
  (`coordinator` / `nurse` / `admin`), and an `is_active` flag for disabling accounts.
- **Application** — a patient submission: name, email, contact, `trial_id`, and a
  `status` workflow field. **`trial_id` is a plain integer, not a foreign key.**
- **EligibilityAnswer** — one question/answer pair belonging to an application
  (foreign key to `applications`).
- **Referral** — records that a coordinator referred an application to a hospital;
  tracks who referred it and a status.
- **Trial** — a clinical trial: title, description, status, and who created it.
- **AuditLog** — the PHI audit trail: actor, action, entity + id, IP, and timestamp.
  It is **insert-only** — app code only ever INSERTs here, never UPDATEs or DELETEs.

## API overview

Five route groups, each guarded server-side. `require_role(...)` is **default-deny**
(no valid token → 401, wrong role → 403), and **PHI read routes are audited** before
the data is returned.

- **`/auth`** — `POST /auth/login` (public), `GET /auth/me` (any signed-in staff).
- **`/users`** — admin only: create, list, and update (enable/disable) staff accounts.
- **`/applications`** — `POST /applications` is **public** (the patient submit);
  the list and detail reads are **coordinator/admin** and are audited; status updates
  are coordinator/admin.
- **`/referrals`** — coordinators (and admins) **create** referrals; nurses (and
  admins) **list/read/update** them. The PHI reads are audited.
- **`/trials`** — nurse/admin can create and list trials; **admin only** can launch
  (update) a trial.

## Security posture

### Enforced today

These are implemented and covered by tests:

- **Role-based access control, default-deny.** Every staff route declares
  `require_role(...)`; an unauthenticated or wrong-role request is rejected (401/403).
- **PHI minimization on list endpoints.** Inbox/list responses return trimmed summary
  schemas rather than full patient records.
- **Audit logging on PHI read routes, fail-closed.** `write_audit()` does not swallow
  errors — if the audit write fails, the request fails and the PHI is never served.
- **Config-driven secrets with a fail-loud `SECRET_KEY`.** Outside `dev`, the app
  **refuses to start** without a `SECRET_KEY`; `dev` falls back to a throwaway key with
  a loud warning.
- **Generic login errors with a timing-safe dummy hash.** A missing account verifies
  against a precomputed dummy hash so it costs the same time as a wrong password, and
  the error message never reveals whether an account exists.
- **No password-hash leakage.** Response schemas never include the stored hash.
- **Disabled-account token revocation.** A still-valid token for a deactivated account
  is rejected — `is_active` is re-checked on every request.

### Planned (not yet built)

- Consent capture (versioned, timestamped, immutable) before contact capture.
- Audit logging on **write** routes (today only PHI reads are audited).
- Structured reject-reason on application/eligibility decisions.
- Per-nurse referral ownership (a nurse seeing only their own referrals).
- Multi-tenant `org_id` scoping and cross-org isolation.
- Alembic migrations (tables are currently created from the models directly).
- PHI encryption at rest (application-layer encryption of PII and answers).
- SMS / email messaging to patients.

## Getting started (local backend)

SQLite is the default, so **no database setup is required** — a local `app.db` file is
created on first run.

```bash
cd Backend
python -m venv venv
# Windows:        .\venv\Scripts\Activate
# macOS / Linux:  source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Then open the interactive API docs at **http://127.0.0.1:8000/docs**.

A fresh database has **no staff accounts**, so you must **seed them once before you can
log in**. Run the seeder against your local database:

```bash
python seed_users.py
```

See [Backend/seed_users.py](Backend/seed_users.py) for the accounts it creates.

## Running with Docker

The full stack (Postgres + backend + frontend) runs with Docker Compose:

```bash
docker compose up --build
```

The services are published on these host ports:

- Frontend: http://localhost:8080
- Backend:  http://localhost:8000
- Postgres: localhost:5433

A fresh Postgres database also has **no staff accounts**, so seed them once into the
running backend container:

```bash
docker compose cp Backend/seed_users.py backend:/app/seed_users.py   # copy the seeder in
docker compose exec backend python seed_users.py                     # create the staff accounts
docker compose exec backend rm /app/seed_users.py                    # remove the seeder again
```

`seed_users.py` is intentionally excluded from the image via `Backend/.dockerignore`,
so dev credentials never bake into a production image. That's why it is copied in, run,
and then deleted rather than shipped inside the container. See
[Backend/seed_users.py](Backend/seed_users.py) for the seeded accounts.

## Testing

The backend has a pytest suite of around **78 tests** covering **RBAC** (default-deny,
role boundaries), **audit logging** (PHI reads recorded, fail-closed), and **PHI
minimization** on list endpoints.

```bash
cd Backend
pytest
```

## Roadmap

Planned but not yet built (see the Security posture → Planned list for detail):

- Consent capture before contact capture.
- Audit logging on write routes.
- Reject-reason on eligibility/application decisions.
- Per-nurse referral ownership.
- Multi-tenant `org_id` scoping and cross-org isolation.
- Alembic migrations.
- PHI encryption at rest.
- SMS / email patient messaging.
