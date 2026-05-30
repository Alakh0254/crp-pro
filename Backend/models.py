from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime, timezone
from database import Base


class User(Base):
    # __tablename__ = the real table name created in app.db
    __tablename__ = "users"

    # Primary key: a unique id for each row. index=True makes lookups fast.
    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    # unique=True: no two users can share an email. It's how staff log in.
    email = Column(String, unique=True, nullable=False, index=True)

    # We NEVER store the raw password — only a hashed version (added in Phase 3).
    hashed_password = Column(String, nullable=False)

    # "coordinator" | "nurse" | "admin". Decides what each user is allowed to do.
    role = Column(String, nullable=False)

    # Lets an admin disable an account without deleting it.
    is_active = Column(Boolean, default=True)

    # When the row was created. We pass the function (no parentheses) so SQLAlchemy
    # calls it at insert time, giving each row its own timestamp.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Application(Base):
    __tablename__ = "applications"

    # Primary key — copy this exactly from your User class
    id = Column(Integer, primary_key=True, index=True)

    # The patient's name. Required (can't be empty).
    patient_name = Column(String, nullable=False)

    # Phone or email so staff can reach them. Required.
    contact = Column(String, nullable=False)

    # Which trial they're applying to. Just a number for now (nullable).
    trial_id = Column(Integer, nullable=True)

    # Where they are in the workflow. Starts as "new".
    status = Column(String, nullable=False, default="new")

    # When the application was submitted — copy this from your User class.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

