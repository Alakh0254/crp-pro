# seed_users.py — a one-off script (NOT part of the running API) that creates the
# first staff accounts so you have something to log in with. Run it once:
#
#     python seed_users.py
#
# It's safe to re-run: it skips any user whose email already exists.
#
# Why we need this: POST /users will be admin-only later, but there's no admin yet
# (chicken-and-egg). Seeding directly into the DB breaks that loop.

# SessionLocal opens a DB session the same way get_db does, but here we're outside
# a web request so we manage it ourselves.
from database import SessionLocal, engine
# We need the table definitions, and we ensure the tables exist before inserting.
import models
# hash_password so we store hashes, never raw passwords.
from auth import hash_password


# The accounts to create. In real life you'd never hardcode passwords like this —
# this is purely a local dev convenience for testing the login flow.
SEED_USERS = [
    {
        "name": "Admin User",
        "email": "admin@crp.test",
        "password": "admin123",
        "role": "admin",
    },
    {
        "name": "Coordinator User",
        "email": "coordinator@crp.test",
        "password": "coord123",
        "role": "coordinator",
    },
    {
        "name": "Nurse User",
        "email": "nurse@crp.test",
        "password": "nurse123",
        "role": "nurse",
    },
]


def seed():
    # Make sure the tables exist (harmless if they already do) — same call main.py makes.
    models.Base.metadata.create_all(bind=engine)

    # Open one session for the whole script.
    db = SessionLocal()
    try:
        # Walk through each account we want to ensure exists.
        for entry in SEED_USERS:
            # Is there already a user with this email? (ORM query, no raw SQL.)
            existing = db.query(models.User).filter(models.User.email == entry["email"]).first()
            if existing:
                # Idempotent: don't create duplicates on a re-run.
                print(f"skip  {entry['email']} (already exists)")
                continue

            # Build the row, hashing the password on the way in.
            user = models.User(
                name=entry["name"],
                email=entry["email"],
                hashed_password=hash_password(entry["password"]),
                role=entry["role"],
            )
            # Stage it for insertion.
            db.add(user)
            print(f"create {entry['email']} (role={entry['role']})")

        # Write everything we staged in a single commit.
        db.commit()
        print("done.")
    finally:
        # Always close the session, success or failure.
        db.close()


# Only run when executed directly (python seed_users.py), not when imported.
if __name__ == "__main__":
    seed()
