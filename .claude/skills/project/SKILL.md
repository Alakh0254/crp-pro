---
name: project
description: Load full context for the Clinical Trial Platform — architecture, tech stack, roles, current build state, and how to help. Invoke when chatting about this project so the architecture never has to be re-explained.
---

# Clinical Trial Platform — Project Context

When this skill runs, you are picking up work on **CRP-Pro**, a web app that
connects patients to clinical trials. Load the context below so the user never
has to re-explain the architecture, stack, or where things stand.

## What it is
Patients fill a public application + eligibility questionnaire. Staff move them
through role-based dashboards: review → approve → refer → follow up.

## Roles
- **Patient** — public, no login. Submits application + eligibility questionnaire.
- **Coordinator** — reviews applications, approves eligibility, refers to a hospital.
- **Nurse/Staff** — follows up with referred patients, can create trials.
- **Admin** — manages coordinator/nurse accounts, oversees dashboards, launches trials.

## Architecture
```
[ React (Vite) SPA ]  --HTTP/JSON-->  [ FastAPI ]  -->  [ SQLAlchemy ORM ]  -->  [ SQLite ]
   Patient form                          REST API          models.py            app.db
   Staff dashboards                      Auth + RBAC                          (Postgres later)
```
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite now / PostgreSQL later. Lives in `/Backend`.
- **Frontend**: React + Vite. Lives in `/Frontend` (not built yet).

## Key files (read these for ground truth — do not trust this summary blindly)
- `CLAUDE.md` — project instructions and conventions.
- `SDLC_PLAN.md` — the full phased roadmap. **The source of truth for what to build next.**
- `Backend/database.py` — SQLAlchemy engine, session, Base.
- `Backend/models.py` — table definitions.
- `Backend/main.py` — app entry; creates tables on startup.

## Current build state (update this as the project moves)
- Phase 0 (setup): done — FastAPI runs, DB engine wired, Vite not yet scaffolded.
- Phase 1 (data layer): in progress — `User` model done and table created;
  `Application` model is the immediate next task.
- Everything from Phase 2 on (patient form, auth, dashboards) is not started.

## How to run the backend
`cd Backend`, activate the venv, then `uvicorn main:app --reload`.

## How to help (IMPORTANT — the user is learning)
The user is a beginner learning FastAPI and React. Per `CLAUDE.md`:
- **Explain concepts and review their code.** Help them understand, don't write
  the whole project for them.
- When introducing a new file or model, explain it line by line.
- Prefer giving them a spec + hints to practice, then review what they write.
- Work phase by phase per `SDLC_PLAN.md`; don't jump ahead.
- Commit at the end of each phase with a clear message (git is initialized).

## At the start of a /project chat
1. Briefly confirm the current phase/state (re-read `SDLC_PLAN.md` and the
   `Backend/` files if unsure — they are authoritative over this summary).
2. Ask what they want to work on, or suggest the next step from the roadmap.
