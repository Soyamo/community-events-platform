const API_BASE_URL = "http://127.0.0.1:8000";

export async function getPublishedEvents() {
  const response = await fetch(`${API_BASE_URL}/api/events`);

  if (!response.ok) {
    throw new Error("Failed to load published events.");
  }

  return response.json();
}