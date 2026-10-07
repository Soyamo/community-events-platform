import { useState } from "react";
import "./App.css";
import RoleSwitcher from "./components/RoleSwitcher";
import VisitorView from "./components/VisitorView";
import OrganiserView from "./components/OrganiserView";
import AdminView from "./components/AdminView";

export default function App() {
  const [role, setRole] = useState("visitor");
  const [organiserId, setOrganiserId] = useState("organiser-1");
  const [organiserSaving, setOrganiserSaving] = useState(false);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Community Events Platform</h1>
        <p>Local events. Shared experiences.</p>
      </header>
      <main className="main-content">
        <RoleSwitcher role={role} organiserId={organiserId} organiserSaving={organiserSaving}
          onRoleChange={(event) => setRole(event.target.value)}
          onOrganiserChange={(event) => setOrganiserId(event.target.value)} />
        {role === "visitor" && <VisitorView />}
        {role === "organiser" && <OrganiserView key={organiserId} organiserId={organiserId} organiserSaving={organiserSaving} setOrganiserSaving={setOrganiserSaving} />}
        {role === "admin" && <AdminView />}
      </main>
    </div>
  );
}
