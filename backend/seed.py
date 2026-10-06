from datetime import datetime, timedelta

from backend.app.database import Base, SessionLocal, engine
from backend.app.models import Event, EventStatus


def seed_database():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        existing_events = db.query(Event).count()

        if existing_events > 0:
            print("Seed skipped: events already exist.")
            return

        now = datetime.now()

        events = [
            Event(
                title="Community Coding Workshop",
                description="Introductory coding workshop for local residents.",
                date_time=now + timedelta(days=7),
                capacity=25,
                status=EventStatus.PUBLISHED,
                organiser_id="organiser-1",
            ),
            Event(
                title="Local Technology Meetup",
                description="A community meetup focused on technology and networking.",
                date_time=now + timedelta(days=10),
                capacity=40,
                status=EventStatus.PENDING_REVIEW,
                organiser_id="organiser-2",
            ),
            Event(
                title="Small Coding Session",
                description="A small hands-on programming session.",
                date_time=now + timedelta(days=14),
                capacity=1,
                status=EventStatus.PUBLISHED,
                organiser_id="organiser-1",
            ),
        ]

        db.add_all(events)
        db.commit()

        print("Demo data seeded successfully.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()