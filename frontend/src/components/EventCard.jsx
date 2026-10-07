export default function EventCard({ event, showOrganiser = false, showStatus = true, children }) {
  return (
    <article className="event-card">
      <h3>{event.title}</h3>
      <p className="event-description">{event.description}</p>
      <div className="event-details">
        <p><strong>Date:</strong> {new Date(event.date_time).toLocaleString()}</p>
        <p><strong>Capacity:</strong> {event.capacity}</p>
        {showOrganiser && <p><strong>Organiser:</strong> {event.organiser_id}</p>}
      </div>
      <div className="event-footer">
        {showStatus && (
          <span className={`status-badge ${event.status === "PUBLISHED" ? "status-published" : "status-pending"}`}>
            {event.status === "PUBLISHED" ? "Published" : "Pending review"}
          </span>
        )}
        {children}
      </div>
    </article>
  );
}
