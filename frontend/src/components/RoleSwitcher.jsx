export default function RoleSwitcher({ role, organiserId, organiserSaving, onRoleChange, onOrganiserChange }) {
  return (
    <section className="role-card">
      <div className="role-context">
        <h2>Demo workspace</h2>
        <p>Switch roles to explore each part of the event workflow.</p>
      </div>
      <div className="control-field">
        <label htmlFor="role">Role</label>

        <select
          id="role"
          value={role}
          onChange={onRoleChange}
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
            onChange={onOrganiserChange}
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
  );
}
