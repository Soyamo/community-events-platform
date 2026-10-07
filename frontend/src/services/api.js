const API_BASE_URL = "http://127.0.0.1:8000";

async function readResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = data?.errors ||
      (Array.isArray(data?.detail) ? data.detail : []);
    const fieldMessages = errors.map((error) => {
      const field = error.field || error.loc?.join(".");
      const message = error.message || error.msg;
      return field ? `${field}: ${message}` : message;
    }).filter(Boolean);
    const message = data?.message || data?.detail?.message ||
      (typeof data?.detail === "string" ? data.detail : "") ||
      fallbackMessage;
    throw new Error([message, ...fieldMessages].join(" "));
  }

  if (data === null) {
    throw new Error("The server returned an invalid response.");
  }
  return data;
}

export async function getPublishedEvents() {
  const response = await fetch(`${API_BASE_URL}/api/events`);

  return readResponse(response, "Failed to load published events.");
}

export async function registerForEvent(eventId) {
  const response = await fetch(
    `${API_BASE_URL}/api/events/${eventId}/registrations`,
    {
      method: "POST",
    }
  );

  return readResponse(response, "Registration failed.");
}

export async function getOrganiserEvents(organiserId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organisers/${organiserId}/events`
  );

  return readResponse(response, "Failed to load organiser events.");
}

export async function createEvent(eventData) {
  const response = await fetch(`${API_BASE_URL}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  });

  return readResponse(response, "Failed to create event.");
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

  return readResponse(response, "Failed to update event.");
}

export async function getAllEvents() {
  const response = await fetch(`${API_BASE_URL}/api/admin/events`);

  return readResponse(response, "Failed to load events.");
}

export async function publishEvent(eventId) {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/events/${eventId}/publish`,
    {
      method: "POST",
    }
  );

  return readResponse(response, "Failed to publish event.");
}
