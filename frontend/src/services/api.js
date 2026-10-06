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

export async function getOrganiserEvents(organiserId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organisers/${organiserId}/events`
  );

  if (!response.ok) {
    throw new Error("Failed to load organiser events.");
  }

  return response.json();
}

export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.detail?.message ||
      data?.detail?.[0]?.msg ||
      "Failed to create event.";

    throw new Error(message);
  }

  return data;
}

export async function updateEvent(
  organiserId,
  eventId,
  eventData
) {
  const response = await fetch(
    `${API_BASE_URL}/api/organisers/${organiserId}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.detail?.message ||
      data?.detail?.[0]?.msg ||
      "Failed to update event.";

    throw new Error(message);
  }

  return data;
}

export async function getAllEvents() {
  const response = await fetch(`${API_BASE_URL}/api/admin/events`);

  if (!response.ok) {
    throw new Error("Failed to load events.");
  }

  return response.json();
}

export async function publishEvent(eventId) {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/events/${eventId}/publish`,
    {
      method: "POST",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.detail?.message || "Failed to publish event.";

    throw new Error(message);
  }

  return data;
}