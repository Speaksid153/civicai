import { BrowserRouter, Routes, Route } from "react-router-dom";

import CitizenHub from "./pages/CitizenHub";
import AuthorityDashboard from "./pages/AuthorityDashboard";
import AuthorityLogin from "./pages/AuthorityLogin";
import HistoryPage from "./pages/HistoryPage";
import AIInsightsDashboard from "./pages/AIInsightsDashboard";
import WeeklyReport from "./pages/WeeklyReport";

import { useEffect, useState } from "react";
import { observeAuth } from "./services/auth";

function AuthorityRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = observeAuth((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  if (user === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--color-bg-app)" }}>
        <h2 className="ds-body ds-secondary" style={{ fontSize: "16px" }}>
          Checking authentication...
        </h2>
      </div>
    );
  }

  if (!user) {
    return <AuthorityLogin />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
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

      </Routes>
    </BrowserRouter>
  );
}