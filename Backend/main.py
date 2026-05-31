from fastapi import FastAPI
import models
from database import engine
# Our applications router (the POST /applications endpoint lives here).
from routers import applications

# Reads every class in models.py and creates the matching tables in app.db
# (only creates tables that don't already exist — safe to run every startup).
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Plug the applications router into the app. Without this line, the routes
# defined in routers/applications.py would never be served.
app.include_router(applications.router)

@app.get("/")
def home():
    return {"message": "Clinical trial platform is running"}