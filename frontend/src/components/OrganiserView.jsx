import { useEffect, useRef, useState } from "react";
import { createEvent, getOrganiserEvents, updateEvent } from "../services/api";
import { toLocalInput } from "../utils/dates";
import EventCard from "./EventCard";

export default function OrganiserView({ organiserId, organiserSaving, setOrganiserSaving }) {
  const formRef = useRef(null);
  const [organiserEvents, setOrganiserEvents] = useState([]);
  const [organiserLoading, setOrganiserLoading] = useState(true);
  const [organiserError, setOrganiserError] = useState("");
  const [organiserMessage, setOrganiserMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date_time: "",
    capacity: 1,
  });

  function handleEventFormChange(event) {
    const { name, value } = event.target;

    setEventForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetEventForm() {
    setEventForm({
      title: "",
      description: "",
      date_time: "",
      capacity: 1,
    });

    setEditingEventId(null);
  }

  function startEditingEvent(event) {
    setEditingEventId(event.id);
    formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });

    setEventForm({
      title: event.title,
      description: event.description || "",
      date_time: toLocalInput(event.date_time),
      capacity: event.capacity,
    });

    setOrganiserMessage("");
    setOrganiserError("");
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    if (organiserSaving || organiserLoading) {
      return;
    }

    try {
      setOrganiserSaving(true);
      setOrganiserError("");
      setOrganiserMessage("");

      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        date_time: eventForm.date_time,
        capacity: Number(eventForm.capacity),
        organiser_id: organiserId,
      };

      if (editingEventId) {
        const updatePayload = {
          title: payload.title,
          description: payload.description,
          date_time: payload.date_time,
          capacity: payload.capacity,
        };

        await updateEvent(
          organiserId,
          editingEventId,
          updatePayload
        );

        setOrganiserMessage("Event updated successfully.");
      } else {
        await createEvent(payload);

        setOrganiserMessage(
          "Event created successfully and is awaiting review."
        );
      }

      resetEventForm();

      const refreshedEvents =
        await getOrganiserEvents(organiserId);

      setOrganiserEvents(refreshedEvents);
    } catch (error) {
      setOrganiserError(error.message);
    } finally {
      setOrganiserSaving(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadOrganiserEvents() {
      try {
        setOrganiserLoading(true);
        setOrganiserError("");
        setOrganiserMessage("");

        const data = await getOrganiserEvents(organiserId);
        if (active) {
          setOrganiserEvents(data);
        }
      } catch (error) {
        if (active) {
          setOrganiserError(error.message);
        }
      } finally {
        if (active) {
          setOrganiserLoading(false);
        }
      }
    }

    loadOrganiserEvents();
    return () => {
      active = false;
    };
  }, [organiserId]);


  return (
    <section className="dashboard-section">
      <h2>Manage your events</h2>

      <p>
        Managing events for{" "}
        <strong>{organiserId}</strong>.
      </p>

      {organiserMessage && (
        <p className="success-message" role="status">
          {organiserMessage}
        </p>
      )}

      {organiserError && (
        <p className="error-message" role="alert">
          {organiserError}
        </p>
      )}

      <form
        className="event-form" ref={formRef}
        onSubmit={handleEventSubmit}
      >
        <h3>
          {editingEventId
            ? "Edit Event"
            : "Create Event"}
        </h3>

        <div className="form-field">
          <label htmlFor="title">
            Title
          </label>

          <input
            id="title"
            name="title"
            value={eventForm.title}
            onChange={handleEventFormChange}
            disabled={organiserSaving}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="description">
            Description <span className="optional-label">(optional)</span>
          </label>

          <textarea
            id="description"
            name="description"
            value={eventForm.description}
            onChange={handleEventFormChange}
            disabled={organiserSaving}
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="date_time">
              Date and Time
            </label>

            <input
              id="date_time"
              name="date_time"
              type="datetime-local" min={toLocalInput(new Date())}
              value={eventForm.date_time}
              onChange={handleEventFormChange}
              disabled={organiserSaving}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="capacity">
              Capacity
            </label>

            <input
              id="capacity"
              name="capacity"
              type="number" step="1"
              min="1"
              value={eventForm.capacity}
              onChange={handleEventFormChange}
              disabled={organiserSaving}
              required
            />
          </div>
        </div>

        <p className="form-hint">New events are submitted for administrator review before publication.</p>

        <div className="form-actions">
          <button
            className="primary-button"
            type="submit"
            disabled={organiserSaving || organiserLoading}
          >
            {organiserSaving
              ? "Saving..."
              : editingEventId
              ? "Update Event"
              : "Create Event"}
          </button>

          {editingEventId && (
            <button
              className="secondary-button"
              type="button"
              onClick={resetEventForm}
              disabled={organiserSaving}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h3>Your Events</h3>

      {organiserLoading && (
        <p className="loading-message">Loading events...</p>
      )}

      {!organiserLoading &&
        !organiserError &&
        organiserEvents.length === 0 && (
          <p className="empty-message">You haven’t created any events yet. Use the form above to submit your first event.</p>
        )}

      <div className="event-grid">
        {organiserEvents.map((event) => (
          <EventCard key={event.id} event={event}>
            <button className="secondary-button" disabled={organiserSaving || organiserLoading} onClick={() => startEditingEvent(event)}>
              Edit Event
            </button>
          </EventCard>
        ))}
      </div>
    </section>
  );
}
