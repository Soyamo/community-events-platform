from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


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
    id: int
    title: str
    description: Optional[str]
    date_time: datetime
    capacity: int
    status: str
    organiser_id: str

    class Config:
        from_attributes = True