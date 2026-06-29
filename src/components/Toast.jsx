export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const iconMap = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  const accentMap = {
    success: "var(--color-teal)",
    error: "var(--color-error)",
    info: "var(--color-primary)",
  };

  const icon = iconMap[toast.type] || "info";
  const accent = accentMap[toast.type] || accentMap.info;

  return (
    <div className="ds-toast-wrapper">
      <div className="ds-toast" style={{ borderLeft: `3px solid ${accent}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", color: accent, flexShrink: 0 }}>
            {icon}
          </span>
          <span>{toast.message}</span>
        </div>
        <button onClick={onClose} className="ds-toast-close">
          Dismiss
        </button>
      </div>
    </div>
  );
}
