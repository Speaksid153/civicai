export default function LoadingSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "32px" }}>
      {[1, 2, 3].map((item) => (
        <div key={item} className="ds-card ds-shadow-card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="ds-skeleton ds-skeleton-title" style={{ width: "30%" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="ds-skeleton ds-skeleton-card" />
            <div className="ds-skeleton ds-skeleton-card" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="ds-skeleton ds-skeleton-text" style={{ width: "90%" }} />
            <div className="ds-skeleton ds-skeleton-text" style={{ width: "75%" }} />
            <div className="ds-skeleton ds-skeleton-text" style={{ width: "55%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

