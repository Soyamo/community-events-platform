from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    date_time: datetime
    capacity: int = Field(gt=0)
    organiser_id: str = Field(min_length=1, max_length=100)

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, value: datetime):
        if value <= datetime.now():
            raise ValueError("Event date and time must be in the future.")
        return value


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str]
    date_time: datetime
    capacity: int
    status: str
    organiser_id: str


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

    @field_validator("date_time")
    @classmethod
    def validate_future_date(cls, value):
        if value is not None and value <= datetime.now():
            raise ValueError("Event date and time must be in the future.")
        return value