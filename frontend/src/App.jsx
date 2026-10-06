import { useEffect, useState } from "react";
import "./App.css";
import {
  getPublishedEvents,
  registerForEvent,
} from "./services/api";

function App() {
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
                onChange={(event) => setOrganiserId(event.target.value)}
              >
                <option value="organiser-1">Organiser 1</option>
                <option value="organiser-2">Organiser 2</option>
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
                <p>No published events are currently available.</p>
              )}

            <div className="event-grid">
              {events.map((event) => (
                <article className="event-card" key={event.id}>
                  <h3>{event.title}</h3>

                  <p>{event.description}</p>

                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(event.date_time).toLocaleString()}
                  </p>

                  <p>
                    <strong>Capacity:</strong> {event.capacity}
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
                    onClick={() => handleRegistration(event.id)}
                    disabled={registeringEventId === event.id}
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