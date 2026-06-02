# ForeignKey lets one table point at a row in another (an answer -> its application).
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
# relationship gives us Python-side links (e.g. application.answers) so we can
# navigate between related rows without writing SQL joins by hand.
from sqlalchemy.orm import relationship
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

    # The patient's email address. Required — a separate field from the phone so
    # we can store and search the two independently. (index speeds up lookups.)
    email = Column(String, nullable=False, index=True)

    # The patient's phone/contact number. Required.
    contact = Column(String, nullable=False)

    # Which trial they're applying to. Just a number for now (nullable).
    trial_id = Column(Integer, nullable=True)

    # Where they are in the workflow. Starts as "new".
    status = Column(String, nullable=False, default="new")

    # When the application was submitted — copy this from your User class.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # The Python-side link to this application's eligibility answers.
    # - "EligibilityAnswer": the class on the other end of the link.
    # - back_populates="application": keeps both sides in sync — appending to
    #   application.answers automatically sets answer.application, and vice versa.
    # - cascade: when we add answers to this object, save them in the same commit;
    #   deleting an application also deletes its orphaned answers.
    answers = relationship(
        "EligibilityAnswer",
        back_populates="application",
        cascade="all, delete-orphan",
    )


class EligibilityAnswer(Base):
    __tablename__ = "eligibility_answers"

    # Primary key — same pattern as every other table.
    id = Column(Integer, primary_key=True, index=True)

    # The foreign key: which application this answer belongs to. It stores the
    # id of a row in the "applications" table (ForeignKey("applications.id")).
    # nullable=False: an answer must always belong to an application.
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)

    # The eligibility question that was asked. Required.
    question = Column(String, nullable=False)

    # The patient's answer to that question. Required.
    answer = Column(String, nullable=False)

    # The other side of the relationship defined on Application.answers above.
    # Lets us write answer.application to get the parent Application object.
    application = relationship("Application", back_populates="answers")


class Referral(Base):
    # A referral records that a coordinator sent an (approved) application on to a
    # hospital. One application could be referred more than once over time, so this
    # is its own table rather than a column on Application.
    __tablename__ = "referrals"

    # Primary key — same pattern as every other table.
    id = Column(Integer, primary_key=True, index=True)

    # Which application is being referred. ForeignKey ties this row to a real
    # application; nullable=False means a referral must always point at one.
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)

    # The hospital the patient is being referred to. Just free text for now.
    hospital = Column(String, nullable=False)

    # WHO made the referral: the id of the staff user (coordinator/admin) who did
    # it. We fill this from the logged-in user, never from the request body, so it
    # can't be forged. FK to users.id keeps it pointing at a real account.
    referred_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Where this referral is in its own little lifecycle. Starts "referred"; the
    # nurse flow (Phase 5) will move it forward (e.g. "contacted", "enrolled").
    status = Column(String, nullable=False, default="referred")

    # When the referral was made — same timestamp pattern as the other tables.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

