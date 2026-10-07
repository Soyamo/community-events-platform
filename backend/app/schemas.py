from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_future_date(value: datetime):
    # Keep SQLite and datetime-local values in the backend's local wall time.
    if value.tzinfo is not None:
        value = value.astimezone().replace(tzinfo=None)
    if value <= datetime.now():
        raise ValueError("Event date and time must be in the future.")
    return value


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    date_time: datetime
    capacity: int = Field(gt=0)
    organiser_id: str = Field(min_length=1, max_length=100)

    @field_validator("title", "organiser_id", mode="before")
    @classmethod
    def strip_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("capacity", mode="before")
    @classmethod
    def reject_boolean_capacity(cls, value):
        if isinstance(value, bool):
            raise ValueError("Capacity must be a whole number, not a boolean.")
        return value

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, value: datetime):
        return validate_future_date(value)


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    date_time: datetime
    capacity: int
    status: str
    organiser_id: str
    remaining_spots: int


class RegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    registered_at: datetime


class EventUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    date_time: Optional[datetime] = None
    capacity: Optional[int] = Field(default=None, gt=0)

    @field_validator("title", "date_time", "capacity", mode="before")
    @classmethod
    def reject_null_required_fields(cls, value):
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("capacity", mode="before")
    @classmethod
    def reject_boolean_capacity(cls, value):
        if isinstance(value, bool):
            raise ValueError("Capacity must be a whole number, not a boolean.")
        return value

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, value):
        return validate_future_date(value)
