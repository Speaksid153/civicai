import { formatTimestamp } from "../utils/reports";
import { isSyntheticReport } from "../utils/analytics";
import { getCategoryMarkerStyle } from "../utils/mapCategories";

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export default function ReportCard({
  report,
  onAssign,
  onResolve,
  onArchive,
  onSelect,
  showResolutionDetails = false,
}) {
  const statusMap = {
    pending: "ds-badge-pending",
    assigned: "ds-badge-assigned",
    resolved: "ds-badge-resolved",
    archived: "ds-badge-archived",
  };

  const priorityMap = {
    Low: "ds-priority-low",
    Medium: "ds-priority-medium",
    High: "ds-priority-high",
    Critical: "ds-priority-high",
  };
  
  const priorityDotMap = {
    Low: "ds-priority-dot-low",
    Medium: "ds-priority-dot-medium",
    High: "ds-priority-dot-high",
    Critical: "ds-priority-dot-high",
  };

  const priorityKey = report.priority || "Low";
  const cardBorderClass = `ds-card-priority-${priorityKey.toLowerCase()}`;
  const analysis = report.analysis || report.ai;
  const safeAfterImageUrl = safeExternalUrl(report.afterImageUrl);
  const categoryStyle = getCategoryMarkerStyle(report.category);

  return (
    <div
      onClick={() => onSelect?.(report)}
      className={`ds-card ds-shadow-card ${cardBorderClass}`}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: "16px", padding: "20px", transition: "var(--transition-hover)" }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--color-bg-hover)"}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--color-bg-surface)"}
    >
      {/* Tags & Status */}
      <div style={{ display: "flex", alignItems: "center", justifyItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <span className={`ds-badge ${statusMap[report.status] || "ds-badge-archived"}`}>
          {String(report.status || "pending").toUpperCase()}
        </span>
        {isSyntheticReport(report) && (
          <span className="ds-badge ds-badge-assigned">DEMO</span>
        )}
        {report.priority && (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "var(--font-weight-medium)" }} className={priorityMap[report.priority] || ""}>
            <span className={`ds-priority-dot ${priorityDotMap[report.priority] || ""}`}></span>
            {report.priority}
          </span>
        )}
        <span
          className="ds-chip"
          style={{ marginLeft: "auto", color: categoryStyle.color, background: categoryStyle.background }}
        >
          {report.category}
        </span>
      </div>

      {/* Description */}
      <h3 className="ds-card-title" style={{ margin: 0, fontSize: "18px", lineHeight: "1.4" }}>
        {report.description}
      </h3>

      {/* Details Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px", color: "var(--color-text-secondary)", marginTop: "4px" }}>
        {report.location ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>location_on</span>
            <span>
              {typeof (report.location.latitude ?? report.location.lat) === 'number' 
                ? (report.location.latitude ?? report.location.lat).toFixed(5) 
                : "N/A"},{" "}
              {typeof (report.location.longitude ?? report.location.lng) === 'number'
                ? (report.location.longitude ?? report.location.lng).toFixed(5)
                : "N/A"}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>location_off</span>
            <span>Location not provided</span>
          </div>
        )}

        {report.assignedDepartment && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>domain</span>
            <span>{report.assignedDepartment}</span>
          </div>
        )}

        {report.assignedOfficer && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>badge</span>
            <span>{report.assignedOfficer}</span>
          </div>
        )}
        
        {report.assignedBy && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>person</span>
            <span>Assigned by {report.assignedBy}</span>
          </div>
        )}
      </div>

      {showResolutionDetails && (
        <div className="ds-card-inset" style={{ marginTop: "8px", backgroundColor: "var(--color-teal-pastel)", border: "none", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-teal)", fontSize: "18px" }}>task_alt</span>
            <span className="ds-label" style={{ color: "var(--color-teal)", margin: 0 }}>RESOLUTION DETAILS</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
            <p style={{ margin: 0 }}><strong>Resolver:</strong> {report.resolvedBy || "Not available"}</p>
            <p style={{ margin: 0 }}><strong>Resolved At:</strong> {formatTimestamp(report.resolvedAt)}</p>
            {report.archivedAt && (
              <p style={{ margin: 0 }}><strong>Archived At:</strong> {formatTimestamp(report.archivedAt)}</p>
            )}
            <p style={{ margin: 0 }}><strong>Notes:</strong> {report.resolutionNotes || "Not available"}</p>
            {safeAfterImageUrl && (
              <p style={{ margin: 0 }}>
                <strong>After Image:</strong>{" "}
                <a
                  href={safeAfterImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--color-primary)", textDecoration: "underline" }}
                  onClick={(event) => event.stopPropagation()}
                >
                  View image
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Automated routing analysis */}
      {analysis && (
        <div className="ds-card-inset" style={{ marginTop: "8px", backgroundColor: "var(--color-primary-pastel)", border: "none", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "18px" }}>auto_awesome</span>
            <span className="ds-label" style={{ color: "var(--color-primary)", margin: 0 }}>ROUTING ANALYSIS</span>
            <span className="ds-badge ds-badge-assigned" style={{ marginLeft: "auto", fontSize: "11px", padding: "2px 8px" }}>{analysis.confidence}% rule match</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
            <p style={{ margin: 0 }}><strong>Category:</strong> {analysis.category}</p>
            <p style={{ margin: 0 }}><strong>Department:</strong> {analysis.department}</p>
            <p style={{ margin: 0 }}>
              <strong>Suggested Priority:</strong>{" "}
              <span className={priorityMap[analysis.priority] || ""}>{analysis.priority}</span>
            </p>
            <p style={{ margin: 0, marginTop: "4px", lineHeight: "1.5" }}><strong>Summary:</strong> {analysis.summary}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
        {report.status === "pending" && onAssign && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onAssign(report);
            }}
            className="ds-btn ds-btn-primary"
            style={{ padding: "0 16px", height: "36px", fontSize: "13px" }}
          >
            Assign
          </button>
        )}

        {report.status === "assigned" && onResolve && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onResolve(report);
            }}
            className="ds-btn ds-btn-teal"
            style={{ padding: "0 16px", height: "36px", fontSize: "13px" }}
          >
            Resolve
          </button>
        )}

        {report.status === "resolved" && onArchive && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onArchive(report.id);
            }}
            className="ds-btn ds-btn-secondary"
            style={{ padding: "0 16px", height: "36px", fontSize: "13px", color: "var(--color-text-secondary)", borderColor: "var(--color-divider)" }}
          >
            Archive
          </button>
        )}
      </div>
    </div>
  );
}
