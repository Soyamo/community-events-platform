const API_BASE_URL = "http://127.0.0.1:8000";

export async function getPublishedEvents() {
  const response = await fetch(`${API_BASE_URL}/api/events`);

  if (!response.ok) {
    throw new Error("Failed to load published events.");
  }

  return response.json();
}

export async function registerForEvent(eventId) {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/registrations`,
    {
      method: "POST",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.detail?.message || "Registration failed.";

    throw new Error(message);
  }

  return data;
}