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