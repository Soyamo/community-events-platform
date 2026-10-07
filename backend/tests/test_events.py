from datetime import datetime, timedelta, timezone
import logging
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event as sqlalchemy_event
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models import Activity, Event, Registration


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


@pytest.mark.parametrize("offset", [timezone.utc, timezone(timedelta(hours=2))])
def test_timezone_aware_dates_are_normalized_for_create_and_update(offset):
    date = (datetime.now(offset) + timedelta(days=7)).replace(microsecond=0)
    response = create_event(date_time=date.isoformat())
    assert response.status_code == 201
    expected = date.astimezone().replace(tzinfo=None).isoformat()
    assert response.json()["date_time"] == expected

    event_id = response.json()["id"]
    updated_date = date + timedelta(days=1)
    response = client.put(
        f"/api/organisers/organiser-1/events/{event_id}",
        json={"date_time": updated_date.isoformat()},
    )
    assert response.status_code == 200
    assert response.json()["date_time"] == (
        updated_date.astimezone().replace(tzinfo=None).isoformat()
    )


def test_timezone_aware_past_date_returns_validation_error():
    response = create_event(
        date_time=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    )
    assert response.status_code == 400
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.parametrize("field", ["title", "date_time", "capacity"])
def test_null_required_update_fields_are_rejected_without_changing_event(field):
    original = create_event().json()
    response = client.put(
        f"/api/organisers/organiser-1/events/{original['id']}",
        json={field: None},
    )
    assert response.status_code == 400
    assert response.json()["errors"][0]["field"] == field
    assert client.get("/api/organisers/organiser-1/events").json() == [original]


def test_description_can_be_cleared_with_null():
    event_id = create_event().json()["id"]
    response = client.put(
        f"/api/organisers/organiser-1/events/{event_id}",
        json={"description": None},
    )
    assert response.status_code == 200
    assert response.json()["description"] is None


@pytest.mark.parametrize("field", ["title", "organiser_id"])
def test_whitespace_only_required_text_is_rejected(field):
    response = create_event(**{field: " \t\n "})
    assert response.status_code == 400
    assert response.json()["errors"][0]["field"] == field


def test_whitespace_only_update_title_is_rejected():
    original = create_event().json()
    response = client.put(
        f"/api/organisers/organiser-1/events/{original['id']}",
        json={"title": " \t "},
    )
    assert response.status_code == 400
    assert client.get("/api/organisers/organiser-1/events").json() == [original]


@pytest.mark.parametrize("capacity", [True, False])
def test_boolean_capacity_is_rejected_for_create_and_update(capacity):
    response = create_event(capacity=capacity)
    assert response.status_code == 400
    original = create_event().json()
    response = client.put(
        f"/api/organisers/organiser-1/events/{original['id']}",
        json={"capacity": capacity},
    )
    assert response.status_code == 400
    assert client.get("/api/organisers/organiser-1/events").json() == [original]


def test_capacity_cannot_be_reduced_below_existing_registrations():
    original = create_event(capacity=3).json()
    event_id = original["id"]
    assert client.post(f"/api/admin/events/{event_id}/publish").status_code == 200
    for _ in range(2):
        assert client.post(f"/api/events/{event_id}/registrations").status_code == 201

    response = client.put(
        f"/api/organisers/organiser-1/events/{event_id}",
        json={"capacity": 1, "title": "Must not persist"},
    )
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "CAPACITY_BELOW_REGISTRATIONS"
    with TestingSessionLocal() as db:
        stored = db.query(Event).filter(Event.id == event_id).one()
        assert stored.capacity == 3
        assert stored.title == original["title"]

    response = client.put(
        f"/api/organisers/organiser-1/events/{event_id}", json={"capacity": 2}
    )
    assert response.status_code == 200
    assert response.json()["capacity"] == 2


def test_successful_registration_persists_activity():
    event_id = create_event().json()["id"]
    assert client.post(f"/api/admin/events/{event_id}/publish").status_code == 200
    response = client.post(f"/api/events/{event_id}/registrations")
    assert response.status_code == 201
    registration_id = response.json()["id"]
    with TestingSessionLocal() as db:
        registration = db.query(Registration).filter_by(id=registration_id).one()
        activity = db.query(Activity).filter_by(
            registration_id=registration_id, action="REGISTRATION_CREATED"
        ).one()
        assert registration.event_id == activity.event_id == event_id


def test_activity_failure_rolls_back_registration():
    event_id = create_event(capacity=1).json()["id"]
    assert client.post(f"/api/admin/events/{event_id}/publish").status_code == 200

    def fail_activity_insert(mapper, connection, target):
        if target.action == "REGISTRATION_CREATED":
            raise RuntimeError("Simulated activity insert failure")

    sqlalchemy_event.listen(Activity, "before_insert", fail_activity_insert)
    try:
        response = client.post(f"/api/events/{event_id}/registrations")
        assert response.status_code == 500
        assert response.json()["code"] == "INTERNAL_SERVER_ERROR"
    finally:
        sqlalchemy_event.remove(Activity, "before_insert", fail_activity_insert)

    with TestingSessionLocal() as db:
        assert db.query(Registration).filter_by(event_id=event_id).count() == 0
        assert db.query(Activity).filter_by(action="REGISTRATION_CREATED").count() == 0
    assert client.post(f"/api/events/{event_id}/registrations").status_code == 201


def test_validation_logs_exclude_body_query_and_header_values(caplog):
    caplog.set_level(logging.INFO, logger="community-events")
    private_value = "fictional.visitor@example.invalid"
    response = client.post(
        "/api/events",
        params={"visitor": private_value},
        headers={"X-Request-ID": private_value, "X-Private-Note": private_value},
        json={
            "title": private_value * 10,
            "description": private_value,
            "date_time": private_value,
            "capacity": private_value,
            "organiser_id": private_value,
        },
    )
    assert response.status_code == 400
    assert response.headers["X-Request-ID"] == private_value
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert {error["field"] for error in response.json()["errors"]} == {
        "title", "date_time", "capacity"
    }
    messages = [r.getMessage() for r in caplog.records if r.name == "community-events"]
    assert private_value not in "\n".join(messages)
    validation = next(message for message in messages if message.startswith("validation_failed"))
    assert "route=/api/events" in validation
    assert "error_count=3" in validation
    assert "string_too_long" in validation
    assert "int_parsing" in validation
    log_id = validation.split("request_id=", 1)[1].split(" ", 1)[0]
    assert str(uuid.UUID(log_id)) == log_id
    assert all(f"request_id={log_id}" in message for message in messages)


def test_invalid_path_logs_use_route_template_and_preserve_error_response(caplog):
    caplog.set_level(logging.INFO, logger="community-events")
    request_id = "3f8b4d46-8470-47c4-94c3-38c711b92e91"
    private_value = "fictional.visitor@example.invalid"
    response = client.post(
        f"/api/events/{private_value}/registrations",
        params={"visitor": private_value},
        headers={"X-Request-ID": request_id, "X-Forwarded-For": "192.0.2.123"},
    )
    assert response.status_code == 400
    assert response.headers["X-Request-ID"] == request_id
    assert response.json() == {
        "code": "VALIDATION_ERROR",
        "message": "The request contains invalid data.",
        "errors": [{
            "field": "path.event_id",
            "message": "Input should be a valid integer, unable to parse string as an integer",
        }],
    }
    messages = [r.getMessage() for r in caplog.records if r.name == "community-events"]
    assert private_value not in "\n".join(messages)
    assert "192.0.2.123" not in "\n".join(messages)
    assert messages[0] == f"request_received request_id={request_id} method=POST"
    assert (
        f"validation_failed request_id={request_id} "
        "route=/api/events/{event_id}/registrations error_count=1 error_types=['int_parsing']"
    ) in messages
    assert "route=/api/events/{event_id}/registrations" in messages[-1]


def test_unmatched_route_logs_do_not_include_literal_path(caplog):
    caplog.set_level(logging.INFO, logger="community-events")
    private_value = "fictional.visitor@example.invalid"
    response = client.get(f"/{private_value}")
    assert response.status_code == 404
    messages = [r.getMessage() for r in caplog.records if r.name == "community-events"]
    assert private_value not in "\n".join(messages)
    assert "route=unmatched" in messages[-1]


def test_unexpected_error_logs_exclude_exception_values(caplog, monkeypatch):
    caplog.set_level(logging.INFO, logger="community-events")
    private_value = "fictional.visitor@example.invalid"

    def failing_db():
        raise RuntimeError(private_value)

    monkeypatch.setitem(app.dependency_overrides, get_db, failing_db)
    response = client.get("/api/events", params={"visitor": private_value})
    assert response.status_code == 500
    assert response.json() == {
        "code": "INTERNAL_SERVER_ERROR",
        "message": "An unexpected server error occurred.",
    }
    records = [r for r in caplog.records if r.name == "community-events"]
    messages = [r.getMessage() for r in records]
    assert private_value not in "\n".join(messages)
    assert all(record.exc_info is None for record in records)
    assert any("route=/api/events error_type=RuntimeError" in message for message in messages)
    assert "status_code=500" in messages[-1]
