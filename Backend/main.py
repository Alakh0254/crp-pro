from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def home():
    return {"message": "Clinical trial platform is running"}