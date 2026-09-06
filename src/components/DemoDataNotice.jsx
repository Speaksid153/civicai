import { isSyntheticReport } from "../utils/analytics";

export default function DemoDataNotice({ reports = [], total = reports.length, demoCount = reports.filter(isSyntheticReport).length }) {

  if (demoCount === 0) return null;

  return (
    <div
      role="note"
      className="ds-card"
      style={{
        marginBottom: "24px",
        borderLeft: "4px solid var(--color-amber)",
        background: "var(--color-amber-pastel)",
      }}
    >
      <p className="ds-body" style={{ margin: 0, fontWeight: "var(--font-weight-medium)" }}>
        Demonstration data: {demoCount} of {total} reports are synthetic examples. Performance figures that include them are product demonstrations, not verified municipal results.
      </p>
    </div>
  );
}
