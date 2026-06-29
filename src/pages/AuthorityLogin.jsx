import { useState } from "react";
import { Link } from "react-router-dom";
import { loginUser, registerUser } from "../services/auth";

export default function AuthorityLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await loginUser(email, password);

      if (onLogin) {
        onLogin();
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Development only
  async function handleRegister() {
    if (!email || !password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await registerUser(email, password);

      alert("Authority account created successfully.");

    } catch (err) {
      setError(err.message);
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

        {/* Login Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div>
            <label className="ds-input-label">Email address</label>
            <div style={{ position: "relative", marginTop: "4px" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }}>mail</span>
              <input
                type="email"
                className={`ds-input ${error ? 'ds-input-error' : ''}`}
                style={{ paddingLeft: "44px" }}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
            </div>
          </div>

          <div>
            <label className="ds-input-label">Password</label>
            <div style={{ position: "relative", marginTop: "4px" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }}>lock</span>
              <input
                type={showPassword ? "text" : "password"}
                className={`ds-input ${error ? 'ds-input-error' : ''}`}
                style={{ paddingLeft: "44px", paddingRight: "44px" }}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLogin();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="ds-btn-icon"
                style={{ position: "absolute", right: "4px", top: "50%", transform: "translateY(-50%)", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {error && (
              <p className="ds-input-error-text" style={{ marginTop: "8px", fontSize: "12px" }}>
                {error}
              </p>
            )}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="ds-btn ds-btn-primary"
            style={{ width: "100%", height: "48px", marginTop: "12px" }}
          >
            {loading ? (
              <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite" }}>sync</span>
            ) : (
              "Sign in"
            )}
          </button>

          <p style={{ textAlign: "center", fontSize: "14px", color: "var(--color-text-secondary)", marginTop: "16px", marginBottom: "0" }}>
            For citizens, use the <Link to="/" style={{ color: "var(--color-primary)", fontWeight: "500", textDecoration: "none" }}>public portal &rarr;</Link>
          </p>

          <button
            onClick={handleRegister}
            disabled={loading}
            className="ds-btn"
            style={{ width: "100%", background: "transparent", border: "none", color: "var(--color-text-secondary)", fontSize: "12px", marginTop: "8px", textDecoration: "underline", padding: 0 }}
          >
            Register Authority (Development)
          </button>

        </div>
      </div>

      {/* Footer */}
      <p style={{ fontSize: "12px", color: "#5F6368", marginTop: "32px", textAlign: "center" }}>
        CivicAI &mdash; Built for Google AI Hackathon
      </p>

    </div>
  );
}