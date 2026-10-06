from fastapi import Depends, FastAPI, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import Base, engine, get_db

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


@app.post(
    "/api/events",
    response_model=schemas.EventResponse,
    status_code=status.HTTP_201_CREATED
)
def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db)
):
    new_event = models.Event(
        title=event.title,
        description=event.description,
        date_time=event.date_time,
        capacity=event.capacity,
        organiser_id=event.organiser_id,
        status=models.EventStatus.PENDING_REVIEW
    )

    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    return new_event

@app.get(
    "/api/events",
    response_model=List[schemas.EventResponse]
)
def get_published_events(
    db: Session = Depends(get_db)
):
    events = (
        db.query(models.Event)
        .filter(models.Event.status == models.EventStatus.PUBLISHED)
        .all()
    )

    return events


@app.get(
    "/api/organisers/{organiser_id}/events",
    response_model=List[schemas.EventResponse]
)
def get_organiser_events(
    organiser_id: str,
    db: Session = Depends(get_db)
):
    events = (
        db.query(models.Event)
        .filter(models.Event.organiser_id == organiser_id)
        .all()
    )

    return events


@app.get(
    "/api/admin/events",
    response_model=List[schemas.EventResponse]
)
def get_all_events(
    db: Session = Depends(get_db)
):
    return db.query(models.Event).all()