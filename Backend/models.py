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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


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
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

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
    # nurse flow (Phase 5) moves it forward (e.g. "contacted", "enrolled").
    status = Column(String, nullable=False, default="referred")

    # When the referral was made — same timestamp pattern as the other tables.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Python-side link to the referred application, so the nurse flow can read the
    # patient's details (name, contact, eligibility answers) straight off the
    # referral without a second query. One-directional is enough here — we only
    # ever navigate referral -> application, never the reverse — so unlike
    # Application.answers we don't add a back_populates/cascade.
    application = relationship("Application")


class Trial(Base):
    # A clinical trial. A nurse (or admin) creates one in Phase 5; an admin
    # "launches" it in Phase 6 by moving its status forward. Applications point at
    # a trial via Application.trial_id (kept a plain int for now, not a FK).
    __tablename__ = "trials"

    # Primary key — same pattern as every other table.
    id = Column(Integer, primary_key=True, index=True)

    # The trial's short title. Required.
    title = Column(String, nullable=False)

    # A longer description of the trial. Required.
    description = Column(String, nullable=False)

    # Where the trial is in its lifecycle. Starts "draft"; an admin launches it
    # later (Phase 6) by setting it to e.g. "open". Defaulted so the create route
    # doesn't have to set it.
    status = Column(String, nullable=False, default="draft")

    # WHO created the trial: the id of the staff user (nurse/admin) who did it.
    # Filled from the logged-in user, never the request body, so it can't be
    # forged. FK to users.id keeps it pointing at a real account.
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # When the trial was created — same timestamp pattern as the other tables.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditLog(Base):
    # The append-only PHI audit trail. Every PHI read/write/export records one
    # row here: WHO did it (actor_id), WHAT they did (action), to WHICH thing
    # (entity + entity_id), from WHERE (ip), and WHEN (created_at). This is a hard
    # compliance requirement (CLAUDE.md + ARCHITECTURE.md §6) — the trail must be
    # append-only, so app code only ever INSERTs here, never UPDATEs or DELETEs.
    __tablename__ = "audit_log"

    # Primary key — same pattern as every other table.
    id = Column(Integer, primary_key=True, index=True)

    # WHO performed the action: the id of the staff user, taken from the verified
    # token (never the request body) so it can't be forged. Nullable because some
    # future audited actions have no logged-in actor (e.g. the public patient
    # submit) — those record actor_id=None. FK to users.id keeps it pointing at a
    # real account when it is set.
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # WHAT happened, as a short stable string like "application.read". The set of
    # allowed values is pinned by the Action Literal in audit.py.
    action = Column(String, nullable=False)

    # WHICH kind of thing was touched ("application", "referral", ...) and its id.
    # Kept as plain strings/ints rather than a real FK so the audit row survives
    # even if the referenced row is later removed — the trail must never break.
    # entity_id is nullable because some audited actions are BULK reads with no
    # single record — e.g. "application.list" records that the inbox was pulled,
    # not one application id — and those store entity_id=None.
    entity = Column(String, nullable=False)
    entity_id = Column(Integer, nullable=True)

    # WHERE the request came from. Nullable because we can't always resolve a
    # client IP (e.g. an internal/test call). The IP is itself PHI ("IP-linked
    # identity"), so it lives here in the audit trail and never in app logs.
    ip = Column(String, nullable=True)

    # WHEN it happened — same UTC timestamp pattern as the other tables.
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

