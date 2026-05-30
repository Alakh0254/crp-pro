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
- Database: SQLite (development)

## Getting started — backend
1. cd Backend
2. python -m venv venv
3. Activate: .\venv\Scripts\Activate (Windows) or source venv/bin/activate (Mac/Linux)
4. pip install -r requirements.txt
5. uvicorn main:app --reload
6. Open http://127.0.0.1:8000/docs

## Project structure
- /Backend  - FastAPI API
- /Frontend - React app (coming soon)