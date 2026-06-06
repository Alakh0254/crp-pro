from pydantic import BaseModel, ConfigDict
from datetime import datetime
# Literal lets us pin a field to an exact set of allowed strings. Anything else
# is rejected by Pydantic with a 422 automatically — no hand-written checks.
from typing import Literal


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


# OUTPUT: the INBOX view of an application — deliberately minimal. The coordinator's
# lead list (GET /applications) returns many rows at once, so it sends only what the
# inbox needs to triage: the id, the patient's name, the linked trial, the workflow
# status, and when it arrived. It MINIMIZES PHI to name + status — it drops the bulk
# (email, phone/contact, and every eligibility answer) so that data never travels just
# to render a list. The patient_name it does carry is still PHI, so the list read is
# itself audited server-side. To see the rest, the coordinator opens one application
# (GET /applications/{id}), which returns the full ApplicationRead and writes a
# per-record audit row.
class ApplicationSummary(BaseModel):
    id: int
    patient_name: str
    trial_id: int | None
    status: str
    created_at: datetime

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


# INPUT: what a coordinator sends to move an application along the workflow.
# Only the status changes here, so this schema has exactly one field. The Literal
# pins it to the three values a coordinator may set by hand — "new" is the starting
# state and "referred" is set by the referrals endpoint, so neither is allowed here.
# Send anything outside this set and Pydantic returns 422 before our code runs.
class ApplicationStatusUpdate(BaseModel):
    status: Literal["reviewed", "approved", "rejected"]


# INPUT: what a coordinator sends to refer an approved application to a hospital.
# Notice there's no referred_by here — the server fills that from the logged-in
# user so the "who referred this" can't be spoofed by the client.
class ReferralCreate(BaseModel):
    application_id: int
    hospital: str


# OUTPUT: what the API sends back after a referral is created. Includes the
# server-filled fields (id, referred_by, status, created_at).
class ReferralRead(BaseModel):
    id: int
    application_id: int
    hospital: str
    referred_by: int
    status: str
    created_at: datetime

    # Lets Pydantic read straight from a Referral ORM object.
    model_config = ConfigDict(from_attributes=True)


# OUTPUT: a referral WITH the full patient application nested inside it. The nurse
# dashboard (Phase 5) lists referrals and needs to see WHO was referred — name,
# contact, eligibility answers — without a second request. Pydantic fills the
# nested `application` automatically by reading the Referral.application
# relationship (added to the model in Phase 5).
class ReferralDetailRead(BaseModel):
    id: int
    application_id: int
    hospital: str
    referred_by: int
    status: str
    created_at: datetime
    # The referred patient's application, shaped by ApplicationRead (defined above).
    application: ApplicationRead

    # Lets Pydantic read straight from a Referral ORM object (and walk .application).
    model_config = ConfigDict(from_attributes=True)


# OUTPUT: the INBOX view of a referral — the minimized parallel to ReferralDetailRead,
# the same idea as ApplicationSummary vs ApplicationRead. The nurse's follow-up list
# (GET /referrals) returns many rows at once, so it nests the patient as an
# ApplicationSummary (id, name, trial, status, created_at) — NOT the full ApplicationRead.
# It MINIMIZES PHI: the nested patient drops email, contact, and every eligibility answer,
# so that bulk PHI never travels just to render the list. The patient_name it does carry
# is still PHI, so the list read is itself audited server-side. To see the rest, the nurse
# opens one referral (GET /referrals/{id}), which returns the full ReferralDetailRead and
# writes a per-record audit row.
class ReferralSummary(BaseModel):
    id: int
    application_id: int
    hospital: str
    referred_by: int
    status: str
    created_at: datetime
    # The referred patient, shaped by the MINIMAL ApplicationSummary (name + status only).
    application: ApplicationSummary

    model_config = ConfigDict(from_attributes=True)


# INPUT: what a nurse sends to record follow-up on a referral. Like
# ApplicationStatusUpdate, the Literal pins the status to the values a nurse may
# set — "referred" is the starting state (set by the referrals POST), so it's not
# allowed here. Anything outside this set is rejected with a 422 before our code runs.
class ReferralStatusUpdate(BaseModel):
    status: Literal["contacted", "enrolled", "declined"]


# INPUT: what a nurse (or admin) sends to create a trial. No id/status/created_by/
# created_at — the server fills those in (status defaults to "draft", created_by
# comes from the logged-in user).
class TrialCreate(BaseModel):
    title: str
    description: str


# OUTPUT: what the API sends back for a trial. Includes the server-filled fields.
class TrialRead(BaseModel):
    id: int
    title: str
    description: str
    status: str
    created_by: int
    created_at: datetime

    # Lets Pydantic read straight from a Trial ORM object.
    model_config = ConfigDict(from_attributes=True)


# INPUT: what an admin sends to "launch" (or later close) a trial. Same Literal
# pattern as the status updates above — "draft" is the starting state (set at
# creation), so it's not a value an admin sets by hand here. Launching a trial
# means moving it "draft" -> "open". Anything outside this set is rejected with a
# 422 before our code runs.
class TrialStatusUpdate(BaseModel):
    status: Literal["open", "closed"]


# INPUT: what an admin sends to create a coordinator/nurse account (Phase 6).
# No id/is_active/created_at — the server fills those in (is_active defaults to
# True). role is pinned with a Literal to the two account types an admin manages:
# admins are seeded directly (see seed_users.py), never minted through this route.
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Literal["coordinator", "nurse"]


# INPUT: what an admin sends to enable or disable an account. Disabling (setting
# is_active=False) is how an admin "removes" a staff member without deleting the
# row — the login route already refuses a disabled account. One field only, so
# like the status updates this schema is a single Boolean.
class UserStatusUpdate(BaseModel):
    is_active: bool
