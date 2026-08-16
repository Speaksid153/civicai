import { useState } from "react";
import { Link } from "react-router-dom";
import { sendAuthoritySignInLink } from "../services/auth";

export default function AuthorityLogin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError("");
      await sendAuthoritySignInLink(email);
      setSent(true);
    } catch (err) {
      setError(err.message || "The secure sign-in link could not be sent. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#F1EFE8", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      
      <div className="ds-card ds-page-enter ds-shadow-card" style={{ width: "100%", maxWidth: "400px", padding: "40px", backgroundColor: "#FFFFFF", borderRadius: "12px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "#1A3F6F", marginBottom: "8px" }}>
            location_city
          </span>
          <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#1A3F6F", margin: "0 0 4px 0" }}>
            CivicAI
          </h1>
          <p style={{ fontSize: "14px", color: "#5F6368", margin: 0 }}>
            Authority Portal
          </p>
        </div>
        
        <hr className="ds-divider" style={{ marginBottom: "24px" }} />

        {/* Login */}
        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <p className="ds-body ds-secondary" style={{ textAlign: "center", margin: 0 }}>
            Enter the registered authority email. We will send a one-time secure sign-in link—no password or popup required.
          </p>

          <label className="ds-label" htmlFor="authority-email">Authority email</label>
          <input
            id="authority-email"
            type="email"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setSent(false); }}
            autoComplete="email"
            required
            className="ds-input"
            placeholder="name@municipality.gov"
          />

          <button
            disabled={loading}
            type="submit"
            className="ds-btn ds-btn-primary"
            style={{ width: "100%", height: "48px", marginTop: "4px" }}
          >
            {loading ? (
              <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite" }}>sync</span>
            ) : (
              "Email me a secure sign-in link"
            )}
          </button>

          {sent && (
            <p role="status" style={{ margin: 0, fontSize: "13px", textAlign: "center", color: "var(--color-success, #137333)" }}>
              Link sent. Open the email on this device to finish signing in.
            </p>
          )}

          {error && (
            <p className="ds-input-error-text" role="alert" style={{ margin: 0, fontSize: "12px", textAlign: "center" }}>
              {error}
            </p>
          )}

          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)", marginTop: "16px", marginBottom: "0" }}>
            For citizens, use the <Link to="/" style={{ color: "var(--color-primary)", fontWeight: "500", textDecoration: "none" }}>public portal &rarr;</Link>
          </p>

        </form>
      </div>

      {/* Footer */}
      <p style={{ fontSize: "12px", color: "#5F6368", marginTop: "32px", textAlign: "center" }}>
        CivicAI &mdash; Municipal operations portal
      </p>

    </div>
  );
}
