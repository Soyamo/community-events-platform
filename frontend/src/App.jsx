import { useEffect, useState } from "react";
import "./App.css";
import {
  createEvent,
  getAllEvents,
  getOrganiserEvents,
  getPublishedEvents,
  publishEvent,
  registerForEvent,
  updateEvent,
} from "./services/api";

function App() {
  const [organiserEvents, setOrganiserEvents] = useState([]);
  const [organiserLoading, setOrganiserLoading] = useState(false);
  const [organiserError, setOrganiserError] = useState("");
  const [organiserMessage, setOrganiserMessage] = useState("");
  const [organiserSaving, setOrganiserSaving] = useState(false);
  const [adminFilter, setAdminFilter] = useState("ALL");

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

  const [adminEvents, setAdminEvents] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [publishingEventId, setPublishingEventId] = useState(null);

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

  function handleOrganiserChange(event) {
    resetEventForm();
    setOrganiserEvents([]);
    setOrganiserLoading(true);
    setOrganiserError("");
    setOrganiserMessage("");
    setOrganiserId(event.target.value);
  }

  function handleRoleChange(event) {
    if (event.target.value === "organiser") {
      setOrganiserEvents([]);
      setOrganiserLoading(true);
    }
    setRole(event.target.value);
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
  }, [role, organiserId]);

  useEffect(() => {
    if (role !== "admin") {
      return;
    }

    async function loadAdminEvents() {
      try {
        setAdminLoading(true);
        setAdminError("");
        setAdminMessage("");

        const data = await getAllEvents();
        setAdminEvents(data);
      } catch (error) {
        setAdminError(error.message);
      } finally {
        setAdminLoading(false);
      }
    }

    loadAdminEvents();
  }, [role]);


  const filteredAdminEvents = adminEvents.filter((event) => {
    if (adminFilter === "ALL") {
      return true;
    }

    return event.status === adminFilter;
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Community Events Platform</h1>
        <p>Community connections, made simple.</p>
        <p className="header-guidance">Select a demo role to continue.</p>
      </header>

      <main className="main-content">
        <section className="role-card">
          <div className="control-field">
            <label htmlFor="role">Role</label>

            <select
              id="role"
              value={role}
              onChange={handleRoleChange}
              disabled={organiserSaving}
            >
              <option value="visitor">Visitor</option>
              <option value="organiser">Event Organiser</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {role === "organiser" && (
            <div className="control-field">
              <label htmlFor="organiser">
                Organiser
              </label>

              <select
                id="organiser"
                value={organiserId}
                onChange={handleOrganiserChange}
                disabled={organiserSaving}
              >
                <option value="organiser-1">
                  Organiser 1
                </option>
                <option value="organiser-2">
                  Organiser 2
                </option>
              </select>
            </div>
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

            {loadingEvents && (
              <p className="loading-message">Loading events...</p>
            )}

            {eventError && (
              <p className="error-message">
                {eventError}
              </p>
            )}

            {!loadingEvents &&
              !eventError &&
              events.length === 0 && (
                <p className="empty-message">
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

                  <p className="event-description">{event.description}</p>

                  <div className="event-details">
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
                  </div>

                  <div className="event-footer">
                    <span className={`status-badge ${
                      event.status === "PUBLISHED" ? "status-published" : "status-pending"
                    }`}>
                      {event.status === "PUBLISHED" ? "Published" : "Pending review"}
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
                  </div>
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
                  Description
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
                    type="datetime-local"
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
                    type="number"
                    min="1"
                    value={eventForm.capacity}
                    onChange={handleEventFormChange}
                    disabled={organiserSaving}
                    required
                  />
                </div>
              </div>

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
                <p className="empty-message">No events created yet.</p>
              )}

            <div className="event-grid">
              {organiserEvents.map((event) => (
                <article
                  className="event-card"
                  key={event.id}
                >
                  <h3>{event.title}</h3>

                  <p className="event-description">{event.description}</p>

                  <div className="event-details">
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
                  </div>

                  <div className="event-footer">
                    <span className={`status-badge ${
                      event.status === "PUBLISHED" ? "status-published" : "status-pending"
                    }`}>
                      {event.status === "PUBLISHED" ? "Published" : "Pending review"}
                    </span>

                    <button
                      className="secondary-button"
                      disabled={organiserSaving || organiserLoading}
                      onClick={() =>
                        startEditingEvent(event)
                      }
                    >
                      Edit Event
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {role === "admin" && (
          <section className="dashboard-section">
            <h2>Administrator</h2>

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
              <p className="success-message">
                {adminMessage}
              </p>
            )}

            {adminError && (
              <p className="error-message">
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
                  No events are currently available.
                </p>
              )}

            <div className="event-grid">
              {filteredAdminEvents.map((event) => (
                <article
                  className="event-card"
                  key={event.id}
                >
                  <h3>{event.title}</h3>

                  <p className="event-description">{event.description}</p>

                  <div className="event-details">
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
                  </div>

                  <div className="event-footer">
                    <span
                      className={`status-badge ${
                        event.status === "PUBLISHED"
                          ? "status-published"
                          : "status-pending"
                      }`}
                    >
                      {event.status === "PUBLISHED" ? "Published" : "Pending review"}
                    </span>

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
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
