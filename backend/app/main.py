from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
import uuid

from fastapi import Request
from .logging_config import logger
from . import models, schemas
from .database import Base, engine, get_db

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Community Events Platform API",
    description="Backend API for the Community Events Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get(
        "X-Request-ID",
        str(uuid.uuid4())
    )

    request.state.request_id = request_id

    logger.info(
        "request_received request_id=%s method=%s path=%s",
        request_id,
        request.method,
        request.url.path
    )

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id

    logger.info(
        "request_completed request_id=%s method=%s path=%s status_code=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code
    )

    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    request_id = getattr(
        request.state,
        "request_id",
        "unknown"
    )

    logger.warning(
        "validation_failed request_id=%s path=%s errors=%s",
        request_id,
        request.url.path,
        exc.errors()
    )

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "code": "VALIDATION_ERROR",
            "message": "The request contains invalid data.",
            "errors": [
                {
                    "field": ".".join(
                        str(part)
                        for part in error["loc"]
                        if part != "body"
                    ),
                    "message": error["msg"]
                }
                for error in exc.errors()
            ]
        },
        headers={
            "X-Request-ID": request_id
        }
    )

@app.exception_handler(Exception)
async def unexpected_exception_handler(
    request: Request,
    exc: Exception
):
    request_id = getattr(
        request.state,
        "request_id",
        "unknown"
    )

    logger.exception(
        "unexpected_error request_id=%s path=%s",
        request_id,
        request.url.path
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred."
        },
        headers={
            "X-Request-ID": request_id
        }
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

    activity = models.Activity(
        event_id=event.id,
        action="EVENT_PUBLISHED"
    )

    db.add(activity)

    db.commit()
    db.refresh(event)

    logger.info(
        "event_published event_id=%s outcome=success",
        event.id
    )

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

    activity = models.Activity(
        event_id=event_id,
        registration_id=registration.id,
        action="REGISTRATION_CREATED"
    )

    db.add(activity)
    db.commit()

    logger.info(
        "registration_created event_id=%s registration_id=%s outcome=success",
        event_id,
        registration.id
    )

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