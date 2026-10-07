import { useEffect, useState } from "react";
import { getPublishedEvents, registerForEvent } from "../services/api";
import EventCard from "./EventCard";

export default function VisitorView() {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventError, setEventError] = useState("");
  const [feedback, setFeedback] = useState({});
  const [pending, setPending] = useState({});

  useEffect(() => {
    let active = true;
    getPublishedEvents().then((data) => {
      if (active) setEvents(data);
    }).catch((error) => {
      if (active) setEventError(error.message);
    }).finally(() => {
      if (active) setLoadingEvents(false);
    });
    return () => { active = false; };
  }, []);

  async function handleRegistration(eventId) {
    if (pending[eventId]) return;
    setPending((current) => ({ ...current, [eventId]: true }));
    setFeedback((current) => ({ ...current, [eventId]: {} }));
    try {
      const registration = await registerForEvent(eventId);
      setFeedback((current) => ({ ...current, [eventId]: { message: `Interest registered successfully. Registration ID: ${registration.id}` } }));
      setEvents((current) => current.map((event) => event.id === eventId ? { ...event, remaining_spots: Math.max(0, event.remaining_spots - 1) } : event));
      // Refresh availability, including registrations from other visitors.
      try {
        setEvents(await getPublishedEvents());
      } catch {
        // The registration succeeded; retain its confirmation and local count.
      }
    } catch (error) {
      setFeedback((current) => ({ ...current, [eventId]: { error: error.message } }));
      try {
        setEvents(await getPublishedEvents());
      } catch {
        // Keep the registration error visible if availability cannot refresh.
      }
    } finally {
      setPending((current) => ({ ...current, [eventId]: false }));
    }
  }

  return (
    <section className="dashboard-section">
      <h2>Explore community events</h2>
      <p>Browse published events and register your interest. No personal details are required.</p>

      {loadingEvents && (
        <p className="loading-message">Loading events...</p>
      )}

      {eventError && (
        <p className="error-message" role="alert">
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
          <EventCard key={event.id} event={event} showOrganiser showStatus={false}>
            <p className="availability">{event.remaining_spots === 0 ? "Full" : `${event.remaining_spots} ${event.remaining_spots === 1 ? "spot" : "spots"} left`}</p>
            {feedback[event.id]?.message && <p className="success-message" role="status">{feedback[event.id].message}</p>}
            {feedback[event.id]?.error && <p className="error-message" role="alert">{feedback[event.id].error}</p>}
            <button className="primary-button" onClick={() => handleRegistration(event.id)} disabled={pending[event.id] || event.remaining_spots === 0}>
              {pending[event.id] ? "Registering..." : event.remaining_spots === 0 ? "Full" : "Register Interest"}
            </button>
          </EventCard>
        ))}
      </div>
    </section>
  );
}
