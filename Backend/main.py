from fastapi import FastAPI
import models
from database import engine

# Reads every class in models.py and creates the matching tables in app.db
# (only creates tables that don't already exist — safe to run every startup).
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Clinical trial platform is running"}