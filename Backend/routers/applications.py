# APIRouter lets us define a group of routes here and plug them into the main
# app later. Depends is how we ask FastAPI to inject our get_db session.
from fastapi import APIRouter, Depends

# The type of object get_db hands us — used only for the type hint below.
from sqlalchemy.orm import Session

# Our session-per-request dependency, defined in database.py.
from database import get_db

# models = the SQLAlchemy tables; schemas = the Pydantic request/response shapes.
import models
import schemas


# A mini-app for everything under /applications.
# - prefix: every route here automatically starts with "/applications".
# - tags: groups these routes together in the /docs page.
router = APIRouter(prefix="/applications", tags=["applications"])


# POST /applications  → a patient submits an application (public, no login).
# - response_model: the return value is filtered through ApplicationRead, so we
#   can only ever send back those exact fields (no accidental data leaks).
# - status_code=201: the correct HTTP code for "a new resource was created"
#   (the default would be 200 "OK").
@router.post("", response_model=schemas.ApplicationRead, status_code=201)
def create_application(
    # FastAPI reads the JSON body and validates it against ApplicationCreate.
    # If it's missing a field or has the wrong type, FastAPI returns 422 for us.
    payload: schemas.ApplicationCreate,
    # FastAPI runs get_db and passes the open session in here.
    db: Session = Depends(get_db),
):
    # 1. Build an ORM row from the validated input.
    #    payload only carries patient_name, contact, trial_id — the server fills
    #    in id, status ("new"), and created_at via the model's defaults.
    application = models.Application(
        patient_name=payload.patient_name,
        email=payload.email,
        contact=payload.contact,
        trial_id=payload.trial_id,
    )

    # 1b. Turn each validated answer into an EligibilityAnswer row and link it to
    #     this application. Appending to application.answers sets the answer's
    #     application_id for us (that's what the relationship does), so all of
    #     these get saved together in the single commit below — all or nothing.
    for a in payload.answers:
        application.answers.append(
            models.EligibilityAnswer(question=a.question, answer=a.answer)
        )

    # 2. Stage the new row in the session (not saved to the DB file yet).
    #    Thanks to the cascade on the relationship, the linked answers are staged too.
    db.add(application)

    # 3. Commit: actually write the row to app.db.
    db.commit()

    # 4. Refresh: re-read the row from the DB so the server-generated fields
    #    (id, created_at, the default status) are populated on our object.
    db.refresh(application)

    # 5. Return the ORM object. response_model=ApplicationRead converts it into
    #    the response shape (works because ApplicationRead has from_attributes).
    return application
