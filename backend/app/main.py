from fastapi import FastAPI

from .database import Base, engine
from . import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Community Events Platform API",
    description="Backend API for the Community Events Platform",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "Community Events Platform API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }