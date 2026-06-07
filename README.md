# Clinical Trial Platform

A web application that connects patients with clinical trials.

## What it does
Patients see a trial ad, land on a page, and submit their details plus an
eligibility questionnaire. Staff then process each application:
- Coordinators approve eligibility and refer patients to a hospital.
- Nurses follow up with referred patients and can create new trials.
- Admins manage staff accounts and oversee everything.

## Tech stack
- Backend: FastAPI (Python)
- Frontend: React
- Database: SQLite (local dev) / PostgreSQL via Docker (full stack)

## Getting started — backend
1. cd Backend
2. python -m venv venv
3. Activate: .\venv\Scripts\Activate (Windows) or source venv/bin/activate (Mac/Linux)
4. pip install -r requirements.txt
5. uvicorn main:app --reload
6. Open http://127.0.0.1:8000/docs

## Running with Docker

```bash
docker compose up --build
```

This builds and starts Postgres, the backend, and the frontend together.

The services are published on these host ports:
- Frontend: http://localhost:8080
- Backend: http://localhost:8000
- Postgres: localhost:5433

A fresh database has **no staff accounts** — they are not auto-created, so you must
seed them once before you can log in.

```bash
docker compose cp Backend/seed_users.py backend:/app/seed_users.py   # copy the seeder into the running backend container
docker compose exec backend python seed_users.py                     # create the staff accounts in Postgres
docker compose exec backend rm /app/seed_users.py                    # remove the seeder from the container again
```

`seed_users.py` is intentionally excluded from the image via `Backend/.dockerignore`
so dev credentials never bake into a production image. That's why it is copied in,
run, and then deleted rather than shipped inside the container.

See [Backend/seed_users.py](Backend/seed_users.py) for the seeded login details.

## Project structure
- /Backend  - FastAPI API
- /Frontend - React app (coming soon)