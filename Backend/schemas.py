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
    # The patient's email. EmailStr would validate the format, but to avoid a new
    # dependency we keep it a plain str for now (the frontend uses type="email").
    email: str
    contact: str
    trial_id: int | None = None
    # A nested list: each item is validated as an EligibilityAnswerCreate.
    # Defaults to [] so an application with no answers is still valid input.
    answers: list[EligibilityAnswerCreate] = []


# OUTPUT: what the API sends back. Includes the server-generated fields.
class ApplicationRead(BaseModel):
    id: int
    patient_name: str
    email: str
    contact: str
    trial_id: int | None
    status: str
    created_at: datetime
    # The saved answers, each shaped by EligibilityAnswerRead (so each shows its id).
    answers: list[EligibilityAnswerRead] = []

    # Lets Pydantic read data straight from a SQLAlchemy model object.
    model_config = ConfigDict(from_attributes=True)


# OUTPUT: what POST /auth/login sends back after a successful login.
# This shape ("access_token" + "token_type") is the OAuth2 standard, which is
# what makes the /docs "Authorize" button understand the response automatically.
class Token(BaseModel):
    access_token: str
    # Always the string "bearer" — it tells the client to send the token back as
    # "Authorization: Bearer <token>". Defaulted so the route doesn't set it each time.
    token_type: str = "bearer"


# OUTPUT: a safe view of a user. Notice there is NO hashed_password field — by
# leaving it out, the API physically cannot leak the password hash. This is the
# same Create/Read split idea as ApplicationRead (we just don't need a UserCreate
# this phase, because the seed script creates users directly).
class UserRead(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool

    # Lets Pydantic read straight from a User ORM object (user.id, user.name, ...).
    model_config = ConfigDict(from_attributes=True)
