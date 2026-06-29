import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/auth";

export default function AuthorityNav({ user, setToast }) {
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/");
    } catch (err) {
      console.error(err);
      if (setToast) {
        setToast({ type: "error", message: "Unable to log out." });
      }
    }
  }

  const links = [
    { name: "Dashboard", path: "/authority", icon: "dashboard" },
    { name: "History", path: "/authority/history", icon: "history" },
    { name: "AI Insights", path: "/authority/insights", icon: "lightbulb" },
    { name: "Weekly Report", path: "/authority/weekly-report", icon: "summarize" },
  ];

  return (
    <aside style={{
      width: "var(--layout-sidebar-expanded)",
      backgroundColor: "var(--color-bg-surface)",
      borderRight: "1px solid var(--color-divider)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      flexShrink: 0
    }} className="hidden md:flex">
      
      {/* Brand Header */}
      <div style={{ padding: "24px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid var(--color-divider)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--color-primary)" }}>
          location_city
        </span>
        <h1 style={{ fontSize: "20px", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: 0, letterSpacing: "-0.5px" }}>
          CivicAI
        </h1>
      </div>

      {/* Navigation Links */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "8px", flexGrow: 1 }}>
        <span className="ds-label" style={{ paddingLeft: "12px", marginBottom: "8px" }}>AUTHORITY PORTAL</span>
        {links.map((link) => {
          const isActive = location.pathname === link.path || (link.path !== "/authority" && location.pathname.startsWith(link.path));
          return (
            <Link
              key={link.name}
              to={link.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px",
                borderRadius: "var(--radius-button)",
                backgroundColor: isActive ? "var(--color-primary-pastel)" : "transparent",
                color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                textDecoration: "none",
                fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-normal)",
                transition: "var(--transition-hover)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--color-bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                {link.icon}
              </span>
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Bottom Profile & Logout */}
      <div style={{ padding: "16px", borderTop: "1px solid var(--color-divider)", display: "flex", flexDirection: "column", gap: "16px" }}>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span className="ds-label" style={{ color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {user.email}
              </span>
              <span className="ds-label ds-secondary">
                Authority
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="ds-btn"
          style={{ width: "100%", justifyContent: "center", color: "var(--color-text-secondary)", border: "1px solid var(--color-divider)", backgroundColor: "transparent" }}
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
