# SDLC Plan — Clinical Trial Platform

> A roadmap for building the platform that connects patients to clinical trials.
> Written for a solo beginner learning FastAPI + React. Each phase is small,
> testable, and builds on the last.

---

## 1. What SDLC means here

SDLC = Software Development Life Cycle: the ordered stages a project moves
through, from idea to a running, maintained app. We'll use an **iterative**
model — build one slice end-to-end, learn, then build the next — rather than
trying to design everything up front. That fits a learning project best.

The stages:

1. Requirements   → decide *what* to build
2. Design         → decide *how* it fits together
3. Implementation → write the code, phase by phase
4. Testing        → prove each piece works
5. Deployment     → put it somewhere others can use
6. Maintenance    → fix, improve, and keep it healthy

---

## 2. Requirements

### Actors (from CLAUDE.md)
- **Patient** — public, no login. Submits an application + eligibility questionnaire.
- **Coordinator** — reviews applications, approves eligibility, refers to a hospital.
- **Nurse/Staff** — follows up with referred patients, can create trials.
- **Admin** — manages coordinator/nurse accounts, oversees dashboards, launches trials.

### Core user stories (the MVP)
- As a **patient**, I can fill a public form and an eligibility questionnaire.
- As a **coordinator**, I can log in, see new applications, and approve/reject eligibility.
- As a **coordinator**, I can refer an eligible patient to a hospital.
- As a **nurse**, I can see referred patients and record follow-up.
- As a **nurse**, I can create a trial.
- As an **admin**, I can create coordinator/nurse accounts and launch trials.

### Non-functional requirements
- Patient data is sensitive → auth on every staff route, no patient PII exposed publicly.
- Role-based access control (RBAC) — each role sees only what it should.
- Works on SQLite now, switchable to PostgreSQL later (use SQLAlchemy, no raw SQL).

### Out of scope (for v1)
Email/SMS notifications, file uploads, analytics dashboards, multi-language.
Park these so they don't expand the first build.

---

## 3. Design

### Architecture
```
[ React (Vite) SPA ]  --HTTP/JSON-->  [ FastAPI ]  -->  [ SQLAlchemy ]  -->  [ SQLite ]
   Patient form                          REST API          ORM models         app.db
   Staff dashboards                      Auth + RBAC
```

### Data model (first draft)
- **User** — id, name, email, hashed_password, role, is_active, created_at
- **Trial** — id, title, description, status, created_by, created_at
- **Application** — id, patient_name, contact, trial_id, status, created_at
- **EligibilityAnswer** — id, application_id, question, answer
- **Referral** — id, application_id, hospital, referred_by, status, created_at

### API surface (first draft)
- `POST /applications` — public, patient submits
- `POST /auth/login` — staff login, returns a token
- `GET /applications` — coordinator, list/review (auth)
- `PATCH /applications/{id}` — coordinator, approve/reject (auth)
- `POST /referrals` — coordinator (auth)
- `GET /referrals` — nurse (auth)
- `POST /trials` — nurse/admin (auth)
- `POST /users` — admin only (auth)

### Folder structure (target)
```
Backend/
  main.py            # app + router includes
  database.py        # engine, session, Base   (done)
  models.py          # SQLAlchemy tables
  schemas.py         # Pydantic request/response models
  auth.py            # password hashing, tokens, role checks
  routers/           # one file per resource (applications, trials, users...)
Frontend/
  src/
    pages/           # PatientForm, Login, CoordinatorDashboard...
    components/
    api.js           # one place that talks to the backend
```

---

## 4. Implementation — phased plan

Build in vertical slices. Each phase ends with something you can run and see.

| Phase | Goal | Backend | Frontend | "Done when…" |
|-------|------|---------|----------|--------------|
| **0. Setup** ✅ mostly done | Project skeleton runs | venv, FastAPI hello route, DB engine | Vite app scaffolded | `uvicorn` serves `/`, Vite serves a page |
| **1. Data layer** | Tables exist | Define models, create tables, add `schemas.py` | — | `app.db` has tables; can open in a DB viewer |
| **2. Patient application** | Patient can apply | `POST /applications` + eligibility | Public form page → posts to API | Submitting the form saves a row |
| **3. Auth + roles** | Staff can log in | `auth.py`, login route, password hashing, RBAC dependency | Login page, store token | A coordinator logs in, gets a token |
| **4. Coordinator flow** | Review + refer | `GET/PATCH /applications`, `POST /referrals` | Coordinator dashboard | Coordinator approves and refers an application |
| **5. Nurse flow** | Follow-up + trials | `GET /referrals`, `POST /trials` | Nurse dashboard | Nurse sees referrals, creates a trial |
| **6. Admin flow** | Manage accounts | `POST /users`, launch trials | Admin dashboard | Admin creates a coordinator account |
| **7. Polish** | Usable + safe | Validation, error handling, CORS | Loading/error states, form validation | No crashes on bad input |

> Rule of thumb: don't start a phase until the previous one runs end-to-end.

---

## 5. Testing

- **Manual first**: use FastAPI's built-in docs at `/docs` to hit every endpoint.
- **Automated** (introduce around Phase 3): `pytest` + FastAPI `TestClient`.
  - One test per route: happy path + one failure (e.g. wrong role → 403).
- **Frontend**: manual click-through per page; add Vitest later if you want.
- **Definition of done per feature**: works in `/docs`, works from the UI,
  rejects bad/unauthorized input.

---

## 6. Deployment

- **Now**: runs locally — backend `uvicorn main:app --reload`, frontend `npm run dev`.
- **Later (v1 release)**:
  - Move SQLite → PostgreSQL (change the URL in `database.py`, run a migration).
  - Backend → Render / Railway / Fly.io. Frontend → Vercel / Netlify.
  - Use environment variables for secrets (DB URL, token secret) — never hardcode.
- Add a `requirements.txt` (backend) and confirm `package.json` (frontend) before deploying.

---

## 7. Maintenance

- Use **git** from now — commit at the end of each phase with a clear message.
- Keep a short CHANGELOG or use commit history.
- Track bugs/ideas in a simple `TODO.md` or GitHub Issues.
- Revisit the "out of scope" list once the MVP is stable.

---

## 8. Suggested timeline (flexible, learning-paced)

| Week | Focus |
|------|-------|
| 1 | Phase 1 — models & schemas (learn SQLAlchemy + Pydantic) |
| 2 | Phase 2 — patient application end-to-end (first React page) |
| 3 | Phase 3 — auth + roles (the trickiest concept; take your time) |
| 4 | Phase 4 — coordinator flow |
| 5 | Phase 5–6 — nurse & admin flows |
| 6 | Phase 7 — polish, tests, first deployment |

---

## Immediate next step

**Phase 1**: define the `User` and `Application` models in [models.py](Backend/models.py),
add a `schemas.py`, and create the tables. That's the natural follow-on from the
skeleton you already have.
