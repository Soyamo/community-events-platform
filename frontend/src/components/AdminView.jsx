import { useEffect, useState } from "react";
import { getAllEvents, publishEvent } from "../services/api";
import EventCard from "./EventCard";

export default function AdminView() {
  const [adminFilter, setAdminFilter] = useState("ALL");
  const [adminEvents, setAdminEvents] = useState([]);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [publishingEventId, setPublishingEventId] = useState(null);

  async function handlePublishEvent(eventId) {
    try {
      setPublishingEventId(eventId);
      setAdminError("");
      setAdminMessage("");

      await publishEvent(eventId);

      setAdminMessage("Event published successfully.");

      const refreshedEvents = await getAllEvents();
      setAdminEvents(refreshedEvents);
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setPublishingEventId(null);
    }
  }


  useEffect(() => {
    let active = true;
    getAllEvents().then((data) => {
      if (active) setAdminEvents(data);
    }).catch((error) => {
      if (active) setAdminError(error.message);
    }).finally(() => {
      if (active) setAdminLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredAdminEvents = adminEvents.filter((event) =>
    adminFilter === "ALL" || event.status === adminFilter
  );

  return (
    <section className="dashboard-section">
      <h2>Review and publish events</h2>

      <p>
        Review all events and publish events awaiting review.
      </p>
      <div className="filter-bar">
        <label htmlFor="admin-filter">
          Filter events
        </label>

        <select
          id="admin-filter"
          value={adminFilter}
          onChange={(event) =>
            setAdminFilter(event.target.value)
          }
        >
          <option value="ALL">All Events</option>
          <option value="PENDING_REVIEW">
            Pending Review
          </option>
          <option value="PUBLISHED">
            Published
          </option>
        </select>
      </div>

      {adminMessage && (
        <p className="success-message" role="status">
          {adminMessage}
        </p>
      )}

      {adminError && (
        <p className="error-message" role="alert">
          {adminError}
        </p>
      )}

      {adminLoading && (
        <p className="loading-message">Loading events...</p>
      )}

      {!adminLoading &&
        !adminError &&
        filteredAdminEvents.length === 0 && (
          <p className="empty-message">
            No events match this filter.
          </p>
        )}

      <div className="event-grid">
        {filteredAdminEvents.map((event) => (
          <EventCard key={event.id} event={event} showOrganiser>
              {event.status ===
                "PENDING_REVIEW" && (
                <button
                  className="primary-button"
                  onClick={() =>
                    handlePublishEvent(event.id)
                  }
                  disabled={
                    publishingEventId === event.id
                  }
                >
                  {publishingEventId === event.id
                    ? "Publishing..."
                    : "Publish Event"}
                </button>
              )}

              {event.status === "PUBLISHED" && (
                <p className="published-label">
                  Already published
                </p>
              )}

          </EventCard>
        ))}
      </div>
    </section>
  );
}
