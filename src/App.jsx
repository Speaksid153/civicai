import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { logoutUser, observeAuthority } from "./services/auth";

const CitizenHub = lazy(() => import("./pages/CitizenHub"));
const AuthorityDashboard = lazy(() => import("./pages/AuthorityDashboard"));
const AuthorityLogin = lazy(() => import("./pages/AuthorityLogin"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const AIInsightsDashboard = lazy(() => import("./pages/AIInsightsDashboard"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));

function PageLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--color-bg-app)" }}>
      <p className="ds-body ds-secondary">Loading CivicAI...</p>
    </div>
  );
}

function AuthorityRoute({ children }) {
  const [authority, setAuthority] = useState(undefined);

  useEffect(() => {
    const unsubscribe = observeAuthority(setAuthority);

    return unsubscribe;
  }, []);

  if (authority === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--color-bg-app)" }}>
        <h2 className="ds-body ds-secondary" style={{ fontSize: "16px" }}>
          Checking authentication...
        </h2>
      </div>
    );
  }

  if (authority.status === "signed-out") {
    return <AuthorityLogin />;
  }

  if (authority.status === "unconfigured") {
    return (
      <div className="ds-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <div className="ds-card" style={{ maxWidth: "520px" }}>
          <h2 className="ds-title">Authority portal is not configured</h2>
          <p className="ds-body ds-secondary">The public site can still load, but authority access requires the Firebase web configuration in the deployment environment.</p>
        </div>
      </div>
    );
  }

  if (authority.status === "error") {
    return (
      <div className="ds-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <div className="ds-card" style={{ maxWidth: "520px" }}>
          <h2 className="ds-title">Sign-in could not be completed</h2>
          <p className="ds-body ds-secondary">
            {authority.error?.message || "Firebase could not complete the authority sign-in. Reset the session and try again."}
          </p>
          <button className="ds-btn ds-btn-secondary" onClick={logoutUser}>Reset sign-in</button>
        </div>
      </div>
    );
  }

  if (authority.status !== "authorized") {
    return (
      <div className="ds-page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <div className="ds-card" style={{ maxWidth: "520px" }}>
          <h2 className="ds-title">Access not granted</h2>
          <p className="ds-body ds-secondary">This account is signed in but is not listed as an active municipal authority.</p>
          <button className="ds-btn ds-btn-secondary" onClick={logoutUser}>Sign out</button>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>

        <Route
          path="/"
          element={<CitizenHub />}
        />

        <Route
          path="/authority"
          element={
            <AuthorityRoute>
              <AuthorityDashboard />
            </AuthorityRoute>
          }
        />

        <Route
          path="/authority/history"
          element={
            <AuthorityRoute>
              <HistoryPage />
            </AuthorityRoute>
          }
        />

        <Route
          path="/authority/insights"
          element={
            <AuthorityRoute>
              <AIInsightsDashboard />
            </AuthorityRoute>
          }
        />

        <Route
          path="/authority/weekly-report"
          element={
            <AuthorityRoute>
              <WeeklyReport />
            </AuthorityRoute>
          }
        />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
