import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class EventStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    PUBLISHED = "PUBLISHED"


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(
        String(200),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    date_time = Column(
        DateTime,
        nullable=False
    )

    capacity = Column(
        Integer,
        nullable=False
    )

    status = Column(
        Enum(EventStatus),
        nullable=False,
        default=EventStatus.PENDING_REVIEW
    )

    organiser_id = Column(
        String(100),
        nullable=False
    )

    created_at = Column(
        DateTime,
        server_default=func.now()
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now()
    )

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    registered_at = Column(
        DateTime,
        server_default=func.now(),
        nullable=False
    )