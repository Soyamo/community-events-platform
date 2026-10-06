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

@app.post(
    "/api/admin/events/{event_id}/publish",
    response_model=schemas.EventResponse
)
def publish_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EVENT_NOT_FOUND",
                "message": "Event not found."
            }
        )

    if event.status == models.EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EVENT_ALREADY_PUBLISHED",
                "message": "Event is already published."
            }
        )

    event.status = models.EventStatus.PUBLISHED

    db.commit()
    db.refresh(event)

    return event

@app.post(
    "/api/events/{event_id}/registrations",
    response_model=schemas.RegistrationResponse,
    status_code=status.HTTP_201_CREATED
)
def register_interest(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EVENT_NOT_FOUND",
                "message": "Event not found."
            }
        )

    if event.status != models.EventStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EVENT_NOT_PUBLISHED",
                "message": "Registration is only available for published events."
            }
        )

    registration_count = (
        db.query(models.Registration)
        .filter(models.Registration.event_id == event_id)
        .count()
    )

    if registration_count >= event.capacity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "EVENT_FULL",
                "message": "Registration is no longer available because this event is full."
            }
        )

    registration = models.Registration(
        event_id=event_id
    )

    db.add(registration)
    db.commit()
    db.refresh(registration)

    return registration

@app.put(
    "/api/organisers/{organiser_id}/events/{event_id}",
    response_model=schemas.EventResponse
)
def update_event(
    organiser_id: str,
    event_id: int,
    event_update: schemas.EventUpdate,
    db: Session = Depends(get_db)
):
    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id,
            models.Event.organiser_id == organiser_id
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EVENT_NOT_FOUND",
                "message": "Event not found for this organiser."
            }
        )

    update_data = event_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(event, field, value)

    db.commit()
    db.refresh(event)

    return event