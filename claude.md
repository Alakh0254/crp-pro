# CLAUDE.md

## Project: Clinical Trial Platform
A web app connecting patients to clinical trials. Patients fill a public form
and eligibility questionnaire; staff manage them through role-based dashboards.

## Roles
- Patient: public, no login. Fills application + eligibility questionnaire.
- Coordinator: reviews applications, approves eligibility, refers to a hospital.
- Nurse/Staff: follows up with referred patients, can create trials.
- Admin: manages coordinator/nurse accounts, oversees dashboards, launches trials.

## Tech stack
- Backend: FastAPI (Python), SQLite for now (PostgreSQL later)
- Frontend: React (Vite)

## Structure
- /Backend  - FastAPI app
- /Frontend - React app

## How to run the backend
cd Backend, activate the venv, then: uvicorn main:app --reload

## Notes for Claude
I'm a beginner learning FastAPI and React. Explain concepts and review my code.
Help me understand things rather than writing the whole project for me.

# CLAUDE.md

> Project context for Claude Code. Read this fully before writing or changing code.
> Deep design lives in **ARCHITECTURE.md** (system, data model, security) and
> **UI_SPEC.md** (landing page sections, every button, all three dashboards, and which
> fields are mandatory). Read the relevant one before building screens or anything PHI.
> Replace `CRP-Pro` with the real name; resolve `TODO:`s.

## What we're building

**CRP-Pro** is a multi-tenant clinical-trial **patient-recruitment platform**.
A public funnel turns ad traffic into screened, consented leads; internal staff move
each lead from submission to enrollment. The whole product is one entity — an
**application (lead)** — moving through states (see ARCHITECTURE.md §4).

**Stack:** React (Vite) frontends · FastAPI backend · PostgreSQL · Redis/Celery.

## Roles (all org-scoped — no cross-org access, ever)

- **Patient** — public, no login. Sees active trials → opens a trial → submits name + contact, answers the eligibility questionnaire, gives consent, submits. Role ends there.
- **Coordinator** — lead inbox; clicking a patient opens a detail drawer where actions appear (approve/reject eligibility, refer to a Nurse, SMS/contact). Actions are hidden until a patient is selected.
- **Nurse** — works patients referred by a Coordinator; follows up by call/SMS/email (logged); can create/launch trials.
- **Admin** — org oversight of both dashboards; creates/disables Coordinator & Nurse accounts; can create/launch trials. (Admin is org-scoped, **not** a global super-admin.)

## ⚠️ Domain rules — non-negotiable

This product handles **PHI**. These are hard constraints. If a request conflicts with
one, stop and flag it.

- **PHI = patient name, phone, email, IP-linked identity, AND all eligibility answers and follow-up notes.**
- **Never log PHI** — not in app logs, stdout, error trackers, or analytics. Redact before anything leaves the trust boundary.
- **Encrypt PHI** in transit (TLS) and at rest; application-layer encryption on `patient_pii` and eligibility answers.
- **Audit every PHI read/write/export** (actor, action, entity, id, ip, time). `audit_log` is append-only — never update/delete it.
- **Consent precedes contact capture.** Versioned, timestamped, IP-stamped, immutable. No consent → reject the submission.
- **RBAC is default-deny and enforced server-side per query**, with a mandatory `org_id` filter. Hiding a button is not authorization. Tests must prove cross-org access fails.
- **MFA for staff**; short-lived access tokens + rotating refresh.
- **Single shared staff login.** One login page/route (`/login`) for all staff roles. After authentication the account's role — from the DB, verified server-side on every request — determines which dashboard the user lands on. The page is UI only; it does not grant role or access. Wrong credentials are **rejected with a generic "invalid credentials"** message (never reveal whether an account exists or its role).
- **Public submit endpoint** needs rate limiting + CAPTCHA (it's an unauthenticated write).
- **BAA required** for any vendor touching PHI (hosting, DB, SMS/email, error tracking). No BAA → no PHI to that vendor. Leave a `# BAA: <vendor>` note when integrating one.
- **Ads can't target by medical condition** (platform policy). Targeting is contextual; the landing-page pre-screener qualifies. Ad creative must be IRB-approved. Conversion tracking is server-side with hashed IDs.

If unsure whether something is PHI, treat it as PHI.

## Monorepo layout

```
/apps
  /patient-web      # public React SPA — NO auth code, NO other patients' PHI
  /dashboard-web    # internal React SPA — coordinator/nurse/admin
/services
  /api              # FastAPI: router -> service -> repository -> model
    /routers
    /services       # business rules + state-machine transitions + authz decisions
    /repositories   # ONLY layer that touches SQLAlchemy
    /models
    /core           # auth, org-scope dependency, audit, rate limiting, encryption
  /worker           # Celery tasks: SMS/email, notifications, conversions
/packages
  /ui               # shared React components/design tokens
/migrations         # Alembic
/tests
```

**Hard rule:** the patient app talks only to `/api/public/*` and must never bundle auth,
RBAC, or other patients' data.

## Backend conventions (FastAPI)

- Python 3.12, type hints everywhere; **Pydantic v2** for all I/O validation at the boundary.
- **async SQLAlchemy 2.0** + Alembic. DB access lives only in `/repositories`.
- Every authenticated route: authenticate -> resolve `org_id` -> authorize (role + ownership) -> handle -> audit PHI access.
- State transitions go through the application service, which enforces the state machine and writes the audit record. Don't mutate `application.status` directly in a router.
- Never put PHI in log lines or exception messages returned to clients.

## Frontend conventions (React)

- **Build screens to `UI_SPEC.md`** — it defines the landing-page sections, every button, each dashboard's layout, and required-vs-optional fields. Don't invent UI that contradicts it.
- React + Vite + TypeScript (strict). TanStack Query for server state, React Router for routing.
- UI gating mirrors API permissions but is **not** the security boundary — the API is.
- Coordinator detail drawer: actions render only when an application is selected.
- Keep the eligibility questionnaire **data-driven** from the trial's `eligibility_schema` (JSONB) — don't hardcode questions per trial.

## Commands

```bash
# API
cd services/api && uvicorn app.main:app --reload
alembic upgrade head            # apply migrations
alembic revision --autogenerate -m "msg"
pytest                          # API tests (must include cross-org denial tests)

# Worker
cd services/worker && celery -A app.worker worker -l info

# Frontends
cd apps/dashboard-web && npm run dev
cd apps/patient-web   && npm run dev
npm run build && npm run test && npm run typecheck   # per app
```

Lint, typecheck, and tests must pass before a change is done.

## Environments & data

- dev / staging / prod. **Real PHI only in prod**; lower envs use synthetic data.
- Secrets via a managed secret store — never commit secrets, never put PHI in fixtures.

## Ask before touching

`/services/api/core` (auth, audit, encryption, org-scope), the consent flow, the
`audit_log`, or anything that changes RBAC / multi-tenant isolation. Mistakes there are
compliance incidents, not bugs. When in doubt, read ARCHITECTURE.md and ask.
