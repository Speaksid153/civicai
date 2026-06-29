import { useState } from "react";

export default function AssignModal({
  report,
  onClose,
  onAssign,
}) {
  const [department, setDepartment] = useState(
    report?.ai?.department || ""
  );
  const [officer, setOfficer] = useState("");
  const [priority, setPriority] = useState(
    report?.ai?.priority || "Medium"
  );

  if (!report) return null;

  return (
    <div className="ds-modal-overlay">
      <div className="ds-modal">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "28px" }}>assignment_ind</span>
          <h2 className="ds-title" style={{ margin: 0 }}>Assign Report</h2>
        </div>
        <p className="ds-body ds-secondary" style={{ marginBottom: "24px" }}>
          AI has already suggested a department and priority. Review them before assigning.
        </p>

        {report.ai && (
          <div className="ds-card-inset" style={{ backgroundColor: "var(--color-primary-pastel)", border: "none", marginBottom: "24px", padding: "16px" }}>
            <h3 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>AI RECOMMENDATION</h3>
            <p className="ds-body" style={{ margin: "0 0 8px 0" }}><strong>Summary:</strong> {report.ai.summary}</p>
            <p className="ds-body" style={{ margin: 0 }}><strong>Confidence:</strong> {report.ai.confidence}%</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label className="ds-input-label">Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="ds-select">
              <option>BBMP Roads</option>
              <option>BBMP Sanitation</option>
              <option>BWSSB</option>
              <option>BESCOM</option>
              <option>Traffic Police</option>
            </select>
          </div>

          <div>
            <label className="ds-input-label">Officer Name</label>
            <input value={officer} onChange={(e) => setOfficer(e.target.value)} placeholder="Officer Name" className="ds-input" />
          </div>

          <div>
            <label className="ds-input-label">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="ds-select">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px" }}>
          <button onClick={onClose} className="ds-btn ds-btn-secondary">Cancel</button>
          <button
            onClick={() => onAssign({ department, officer, priority })}
            disabled={!department || !officer}
            className="ds-btn ds-btn-primary"
          >
            Assign Report
          </button>
        </div>
      </div>
    </div>
  );
}
