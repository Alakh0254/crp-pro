from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Where the SQLite file lives. "./app.db" = a file named app.db in /Backend.
SQLALCHEMY_DATABASE_URL = "sqlite:///./app.db"

# 2. The engine: the actual connection to the database.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

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
