import { useState } from "react";
import "./App.css";

function App() {
  const [role, setRole] = useState("visitor");
  const [organiserId, setOrganiserId] = useState("organiser-1");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Community Events Platform</h1>
        <p>Select a demo role to continue.</p>
      </header>

      <main className="role-card">
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

        <section className="role-summary">
          {role === "visitor" && (
            <>
              <h2>Visitor</h2>
              <p>Browse published events and register anonymous interest.</p>
            </>
          )}

          {role === "organiser" && (
            <>
              <h2>Event Organiser</h2>
              <p>
                Manage events for <strong>{organiserId}</strong>.
              </p>
            </>
          )}

          {role === "admin" && (
            <>
              <h2>Administrator</h2>
              <p>Review all events and publish pending events.</p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;