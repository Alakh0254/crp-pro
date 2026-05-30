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
