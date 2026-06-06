from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Settings come from config.py (the one place that reads the environment).
import config

# 1. Where the database lives. Defaults to the local SQLite file (sqlite:///./app.db);
#    a Postgres URL can be supplied via the env later without editing this file.
SQLALCHEMY_DATABASE_URL = config.DATABASE_URL

# 2. The engine: the actual connection to the database. check_same_thread=False is
#    a SQLite-only quirk (it lets FastAPI reuse the connection across threads); it's
#    an invalid argument for other drivers, so we only pass it for sqlite:// URLs.
connect_args = (
    {"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {}
)
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)

# 3. A factory that produces database "sessions" (one conversation with the DB).
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Base class. Every table model we write will inherit from this.
Base = declarative_base()


# 5. The get_db dependency.
# FastAPI runs this BEFORE a route that asks for it, and passes in whatever we
# `yield`. We use `yield` (not `return`) so the cleanup code after it runs AFTER
# the response is sent — that's what closes the session every time.
def get_db():
    # Open one session: a single, private "conversation" with the DB for THIS request.
    db = SessionLocal()
    try:
        # Hand the session to the route function. Execution pauses here until the
        # route is done.
        yield db
    finally:
        # Always runs — whether the route succeeded or raised — so we never leak
        # an open connection.
        db.close()
