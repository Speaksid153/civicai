export default function DashboardStats({
  total,
  pending,
  assigned,
  resolved,
  archived,
  resolutionRate,
  averageResolutionTime,
}) {
  const stats = [
    {
      title: "Total Reports",
      value: total,
      icon: "description",
      iconColor: "var(--color-primary)",
      iconBg: "var(--color-primary-pastel)",
    },
    {
      title: "Pending",
      value: pending,
      icon: "schedule",
      iconColor: "var(--color-amber)",
      iconBg: "var(--color-amber-pastel)",
    },
    {
      title: "Assigned",
      value: assigned,
      icon: "assignment_ind",
      iconColor: "var(--color-primary)",
      iconBg: "var(--color-primary-pastel)",
    },
    {
      title: "Resolved",
      value: resolved,
      icon: "check_circle",
      iconColor: "var(--color-teal)",
      iconBg: "var(--color-teal-pastel)",
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
      {stats.map((stat, index) => (
        <div
          key={stat.title}
          className="ds-card ds-page-enter ds-shadow-card"
          style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "16px",
            animationDelay: `${index * 50}ms`
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: stat.iconBg,
            color: stat.iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
              {stat.icon}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="ds-label" style={{ color: "var(--color-text-secondary)", marginBottom: "4px" }}>
              {stat.title}
            </span>
            <span style={{ fontSize: "32px", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", lineHeight: 1 }}>
              {stat.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
