import { useEffect, useState } from "react";
import "./App.css";
import {
  createEvent,
  getOrganiserEvents,
  getPublishedEvents,
  registerForEvent,
  updateEvent,
} from "./services/api";

function App() {
  const [organiserEvents, setOrganiserEvents] = useState([]);
  const [organiserLoading, setOrganiserLoading] = useState(false);
  const [organiserError, setOrganiserError] = useState("");
  const [organiserMessage, setOrganiserMessage] = useState("");

  const [editingEventId, setEditingEventId] = useState(null);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date_time: "",
    capacity: 1,
  });

  const [registrationMessage, setRegistrationMessage] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [registeringEventId, setRegisteringEventId] = useState(null);

  const [role, setRole] = useState("visitor");
  const [organiserId, setOrganiserId] = useState("organiser-1");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventError, setEventError] = useState("");

  async function handleRegistration(eventId) {
    try {
      setRegisteringEventId(eventId);
      setRegistrationMessage("");
      setRegistrationError("");

      const registration = await registerForEvent(eventId);

      setRegistrationMessage(
        `Interest registered successfully. Registration ID: ${registration.id}`
      );
    } catch (error) {
      setRegistrationError(error.message);
    } finally {
      setRegisteringEventId(null);
    }
  }

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

    setEventForm({
      title: event.title,
      description: event.description || "",
      date_time: event.date_time.slice(0, 16),
      capacity: event.capacity,
    });

    setOrganiserMessage("");
    setOrganiserError("");
  }

  async function handleEventSubmit(event) {
    event.preventDefault();

    try {
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
    }
  }

  useEffect(() => {
    if (role !== "visitor") {
      return;
    }

    async function loadEvents() {
      try {
        setLoadingEvents(true);
        setEventError("");
        setRegistrationMessage("");
        setRegistrationError("");

        const data = await getPublishedEvents();
        setEvents(data);
      } catch (error) {
        setEventError(error.message);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [role]);

  useEffect(() => {
    if (role !== "organiser") {
      return;
    }

    async function loadOrganiserEvents() {
      try {
        setOrganiserLoading(true);
        setOrganiserError("");
        setOrganiserMessage("");

        const data = await getOrganiserEvents(organiserId);
        setOrganiserEvents(data);
      } catch (error) {
        setOrganiserError(error.message);
      } finally {
        setOrganiserLoading(false);
      }
    }

    loadOrganiserEvents();
  }, [role, organiserId]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Community Events Platform</h1>
        <p>Select a demo role to continue.</p>
      </header>

      <main className="main-content">
        <section className="role-card">
          <label htmlFor="role">Role</label>

          <select
            id="role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="visitor">Visitor</option>
            <option value="organiser">Event Organiser</option>
            <option value="admin">Administrator</option>
          </select>

          {role === "organiser" && (
            <>
              <label htmlFor="organiser">Organiser</label>

              <select
                id="organiser"
                value={organiserId}
                onChange={(event) =>
                  setOrganiserId(event.target.value)
                }
              >
                <option value="organiser-1">
                  Organiser 1
                </option>
                <option value="organiser-2">
                  Organiser 2
                </option>
              </select>
            </>
          )}
        </section>

        {role === "visitor" && (
          <section className="dashboard-section">
            <h2>Published Events</h2>
            <p>Browse available community events.</p>

            {registrationMessage && (
              <p className="success-message">
                {registrationMessage}
              </p>
            )}

            {registrationError && (
              <p className="error-message">
                {registrationError}
              </p>
            )}

            {loadingEvents && <p>Loading events...</p>}

            {eventError && (
              <p className="error-message">
                {eventError}
              </p>
            )}

            {!loadingEvents &&
              !eventError &&
              events.length === 0 && (
                <p>
                  No published events are currently available.
                </p>
              )}

            <div className="event-grid">
              {events.map((event) => (
                <article
                  className="event-card"
                  key={event.id}
                >
                  <h3>{event.title}</h3>

                  <p>{event.description}</p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      event.date_time
                    ).toLocaleString()}
                  </p>

                  <p>
                    <strong>Capacity:</strong>{" "}
                    {event.capacity}
                  </p>

                  <p>
                    <strong>Organiser:</strong>{" "}
                    {event.organiser_id}
                  </p>

                  <span className="status-badge">
                    {event.status}
                  </span>

                  <button
                    className="primary-button"
                    onClick={() =>
                      handleRegistration(event.id)
                    }
                    disabled={
                      registeringEventId === event.id
                    }
                  >
                    {registeringEventId === event.id
                      ? "Registering..."
                      : "Register Interest"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {role === "organiser" && (
          <section className="dashboard-section">
            <h2>Event Organiser</h2>

            <p>
              Managing events for{" "}
              <strong>{organiserId}</strong>.
            </p>

            {organiserMessage && (
              <p className="success-message">
                {organiserMessage}
              </p>
            )}

            {organiserError && (
              <p className="error-message">
                {organiserError}
              </p>
            )}

            <form
              className="event-form"
              onSubmit={handleEventSubmit}
            >
              <h3>
                {editingEventId
                  ? "Edit Event"
                  : "Create Event"}
              </h3>

              <label htmlFor="title">Title</label>

              <input
                id="title"
                name="title"
                value={eventForm.title}
                onChange={handleEventFormChange}
                required
              />

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                name="description"
                value={eventForm.description}
                onChange={handleEventFormChange}
              />

              <label htmlFor="date_time">
                Date and Time
              </label>

              <input
                id="date_time"
                name="date_time"
                type="datetime-local"
                value={eventForm.date_time}
                onChange={handleEventFormChange}
                required
              />

              <label htmlFor="capacity">
                Capacity
              </label>

              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={eventForm.capacity}
                onChange={handleEventFormChange}
                required
              />

              <button
                className="primary-button"
                type="submit"
              >
                {editingEventId
                  ? "Update Event"
                  : "Create Event"}
              </button>

              {editingEventId && (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetEventForm}
                >
                  Cancel Edit
                </button>
              )}
            </form>

            <h3>Your Events</h3>

            {organiserLoading && (
              <p>Loading events...</p>
            )}

            {!organiserLoading &&
              !organiserError &&
              organiserEvents.length === 0 && (
                <p>No events created yet.</p>
              )}

            <div className="event-grid">
              {organiserEvents.map((event) => (
                <article
                  className="event-card"
                  key={event.id}
                >
                  <h3>{event.title}</h3>

                  <p>{event.description}</p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(
                      event.date_time
                    ).toLocaleString()}
                  </p>

                  <p>
                    <strong>Capacity:</strong>{" "}
                    {event.capacity}
                  </p>

                  <span className="status-badge">
                    {event.status}
                  </span>

                  <button
                    className="secondary-button"
                    onClick={() =>
                      startEditingEvent(event)
                    }
                  >
                    Edit Event
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {role === "admin" && (
          <section className="dashboard-section">
            <h2>Administrator</h2>

            <p>
              Review all events and publish pending events.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;