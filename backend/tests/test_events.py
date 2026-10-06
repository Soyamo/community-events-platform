from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app


TEST_DATABASE_URL = "sqlite://"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    yield

    Base.metadata.drop_all(bind=test_engine)


def future_date(days=7):
    return (datetime.now() + timedelta(days=days)).isoformat()


def past_date():
    return (datetime.now() - timedelta(days=1)).isoformat()


def create_event(
    title="Test Event",
    capacity=10,
    organiser_id="organiser-1",
    date_time=None,
):
    if date_time is None:
        date_time = future_date()

    return client.post(
        "/api/events",
        json={
            "title": title,
            "description": "Test event description",
            "date_time": date_time,
            "capacity": capacity,
            "organiser_id": organiser_id,
        },
    )


def test_create_event_successfully():
    response = create_event()

    assert response.status_code == 201

    data = response.json()

    assert data["title"] == "Test Event"
    assert data["capacity"] == 10
    assert data["organiser_id"] == "organiser-1"
    assert data["status"] == "PENDING_REVIEW"


def test_reject_invalid_capacity():
    response = create_event(capacity=0)

    assert response.status_code == 400

    data = response.json()

    assert data["code"] == "VALIDATION_ERROR"
    assert data["message"] == "The request contains invalid data."



def test_reject_past_event_date():
    response = create_event(
        date_time=past_date()
    )

    assert response.status_code == 400

    assert response.json()["code"] == "VALIDATION_ERROR"


def test_visitor_cannot_see_unpublished_event():
    create_response = create_event()

    assert create_response.status_code == 201

    response = client.get("/api/events")

    assert response.status_code == 200
    assert response.json() == []


def test_publishing_makes_event_visible():
    create_response = create_event()

    event_id = create_response.json()["id"]

    publish_response = client.post(
        "/api/admin/events/{}/publish".format(event_id)
    )

    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "PUBLISHED"

    visitor_response = client.get("/api/events")

    assert visitor_response.status_code == 200
    assert len(visitor_response.json()) == 1
    assert visitor_response.json()[0]["id"] == event_id


def test_wrong_organiser_cannot_update_event():
    create_response = create_event(
        organiser_id="organiser-2"
    )

    event_id = create_response.json()["id"]

    response = client.put(
        "/api/organisers/organiser-1/events/{}".format(event_id),
        json={
            "title": "Unauthorized Update"
        },
    )

    assert response.status_code == 404
    assert (
        response.json()["detail"]["code"]
        == "EVENT_NOT_FOUND"
    )


def test_reject_registration_for_unpublished_event():
    create_response = create_event()

    event_id = create_response.json()["id"]

    response = client.post(
        "/api/events/{}/registrations".format(event_id)
    )

    assert response.status_code == 409
    assert (
        response.json()["detail"]["code"]
        == "EVENT_NOT_PUBLISHED"
    )


def test_reject_registration_when_event_is_full():
    create_response = create_event(
        capacity=1
    )

    event_id = create_response.json()["id"]

    publish_response = client.post(
        "/api/admin/events/{}/publish".format(event_id)
    )

    assert publish_response.status_code == 200

    first_registration = client.post(
        "/api/events/{}/registrations".format(event_id)
    )

    assert first_registration.status_code == 201

    second_registration = client.post(
        "/api/events/{}/registrations".format(event_id)
    )

    assert second_registration.status_code == 409
    assert (
        second_registration.json()["detail"]["code"]
        == "EVENT_FULL"
    )