import { useState } from "react";
import { formatDateTimeLocal } from "../utils/reports";

function isSafeOptionalUrl(value) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default function ResolutionModal({
  report,
  defaultResolver,
  onClose,
  onResolve,
}) {
  const [resolutionNotes, setResolutionNotes] =
    useState("");
  const [resolvedBy, setResolvedBy] =
    useState(defaultResolver || "");
  const [completionTime, setCompletionTime] =
    useState(formatDateTimeLocal());
  const [afterImageUrl, setAfterImageUrl] =
    useState("");

  if (!report) return null;

  const canResolve =
    resolutionNotes.trim() &&
    resolvedBy.trim() &&
    completionTime &&
    isSafeOptionalUrl(afterImageUrl);

  return (
    <div className="ds-modal-overlay">
      <div className="ds-modal">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-teal)", fontSize: "28px" }}>check_circle</span>
          <h2 className="ds-title" style={{ margin: 0 }}>Resolve Report</h2>
        </div>
        <p className="ds-body ds-secondary" style={{ marginBottom: "24px" }}>
          Add closure details before moving this report to resolved.
        </p>

        <div className="ds-card-inset" style={{ marginBottom: "24px", padding: "16px" }}>
          <p className="ds-body" style={{ fontWeight: "var(--font-weight-medium)", margin: "0 0 4px 0" }}>{report.category}</p>
          <p className="ds-body ds-secondary" style={{ margin: 0 }}>{report.description}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label className="ds-input-label">Resolution Notes</label>
            <textarea
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Describe what was completed."
              className="ds-textarea"
            />
          </div>

          <div>
            <label className="ds-input-label">Resolver Name</label>
            <input
              value={resolvedBy}
              onChange={(e) => setResolvedBy(e.target.value)}
              placeholder="Resolver name"
              maxLength={120}
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-input-label">Completion Timestamp</label>
            <input
              type="datetime-local"
              value={completionTime}
              onChange={(e) => setCompletionTime(e.target.value)}
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-input-label">After Image URL</label>
            <input
              value={afterImageUrl}
              onChange={(e) => setAfterImageUrl(e.target.value)}
              placeholder="Optional for future upload support"
              maxLength={2048}
              className="ds-input"
            />
            {afterImageUrl && !isSafeOptionalUrl(afterImageUrl) && (
              <p className="ds-input-error-text">Use an http:// or https:// image URL.</p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "32px" }}>
          <button onClick={onClose} className="ds-btn ds-btn-secondary">Cancel</button>
          <button
            onClick={() => onResolve({
              resolutionNotes: resolutionNotes.trim(),
              resolvedBy: resolvedBy.trim(),
              resolvedAt: new Date(completionTime),
              afterImageUrl: afterImageUrl.trim(),
            })}
            disabled={!canResolve}
            className="ds-btn ds-btn-teal"
          >
            Mark Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
