from pydantic import BaseModel, ConfigDict
from datetime import datetime


# INPUT: a single eligibility answer the patient sends.
# Just the question + answer — the id and the application link are server-side.
class EligibilityAnswerCreate(BaseModel):
    question: str
    answer: str


# OUTPUT: a single eligibility answer the API sends back. Adds the id.
class EligibilityAnswerRead(BaseModel):
    id: int
    question: str
    answer: str

    # Lets Pydantic read this straight from an EligibilityAnswer model object.
    model_config = ConfigDict(from_attributes=True)


# INPUT: what a patient sends when applying.
# Notice: no id, no status, no created_at — the server fills those in.
class ApplicationCreate(BaseModel):
    patient_name: str
    contact: str
    trial_id: int | None = None
    # A nested list: each item is validated as an EligibilityAnswerCreate.
    # Defaults to [] so an application with no answers is still valid input.
    answers: list[EligibilityAnswerCreate] = []


# OUTPUT: what the API sends back. Includes the server-generated fields.
class ApplicationRead(BaseModel):
    id: int
    patient_name: str
    contact: str
    trial_id: int | None
    status: str
    created_at: datetime
    # The saved answers, each shaped by EligibilityAnswerRead (so each shows its id).
    answers: list[EligibilityAnswerRead] = []

    # Lets Pydantic read data straight from a SQLAlchemy model object.
    model_config = ConfigDict(from_attributes=True)
