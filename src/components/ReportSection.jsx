import ReportCard from "./ReportCard";

export default function ReportSection({
  title,
  reports,
  onAssign,
  onResolve,
  onArchive,
  onSelect,
  emptyMessage = "No reports found.",
}) {
  return (
    <section className="ds-card ds-shadow-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h2 className="ds-title" style={{ margin: 0 }}>
          {title}
        </h2>
        <span className="ds-badge" style={{ backgroundColor: "var(--color-bg-hover)", color: "var(--color-text-primary)", padding: "4px 12px" }}>
          {reports.length} Report{reports.length !== 1 ? "s" : ""}
        </span>
      </div>

      {reports.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", gap: "12px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--color-text-secondary)" }}>
            inbox
          </span>
          <h3 className="ds-card-title" style={{ color: "var(--color-text-secondary)", margin: 0 }}>
            No reports available
          </h3>
          <p className="ds-body ds-secondary" style={{ margin: 0 }}>
            {emptyMessage}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxHeight: "600px", overflowY: "auto", paddingRight: "8px" }}>
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onAssign={onAssign}
              onResolve={onResolve}
              onArchive={onArchive}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
