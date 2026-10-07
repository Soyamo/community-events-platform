// Offset-free API dates are local wall time. Offset-bearing dates are converted
// to browser-local time, matching the date displayed on event cards.
export function toLocalInput(value) {
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
