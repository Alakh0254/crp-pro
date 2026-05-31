from pydantic import BaseModel, ConfigDict
from datetime import datetime


# INPUT: what a patient sends when applying.
# Notice: no id, no status, no created_at — the server fills those in.
class ApplicationCreate(BaseModel):
    patient_name: str
    contact: str
    trial_id: int | None = None


# OUTPUT: what the API sends back. Includes the server-generated fields.
class ApplicationRead(BaseModel):
    id: int
    patient_name: str
    contact: str
    trial_id: int | None
    status: str
    created_at: datetime

    # Lets Pydantic read data straight from a SQLAlchemy model object.
    model_config = ConfigDict(from_attributes=True)
