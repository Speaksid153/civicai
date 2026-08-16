import { useEffect, useState } from "react";

import ReportCard from "../components/ReportCard";
import SearchBar from "../components/SearchBar";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Toast from "../components/Toast";

import { getArchivedReports } from "../services/firebase";
import AuthorityNav from "../components/AuthorityNav";
import { getCurrentUser } from "../services/auth";
import {
  formatDateInput,
  formatTimestamp,
  reportCategories,
} from "../utils/reports";
import { departments } from "../utils/departments";
import { priorities } from "../utils/priorities";

function uniqueValues(reports, getValue) {
  return [
    ...new Set(
      reports
        .map(getValue)
        .filter(Boolean)
        .sort()
    ),
  ];
}

export default function HistoryPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [officer, setOfficer] = useState("");
  const [date, setDate] = useState("");
  const [priority, setPriority] = useState("");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let active = true;

    getArchivedReports()
      .then((data) => {
        if (!active) return;

        setReports(data);
      })
      .catch((err) => {
        if (!active) return;

        console.error(err);
        setToast({
          type: "error",
          message: "Failed to load history.",
        });
      })
      .finally(() => {
        if (!active) return;

        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);


  const officers = uniqueValues(
    reports,
    (report) => report.assignedOfficer
  );

  const filteredReports = reports.filter((report) => {
    const text = search.toLowerCase().trim();
    const reportDepartment =
      report.assignedDepartment || report.analysis?.department || report.ai?.department || "";
    const reportDate = formatDateInput(
      report.resolvedAt ||
        report.archivedAt ||
        report.createdAt
    );

    const matchesSearch =
      !text ||
      [
        report.description,
        report.category,
        report.analysis?.category || report.ai?.category,
        reportDepartment,
        report.assignedOfficer,
        report.priority,
        report.resolutionNotes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text);

    return (
      matchesSearch &&
      (!category || report.category === category) &&
      (!department || reportDepartment === department) &&
      (!officer || report.assignedOfficer === officer) &&
      (!date || reportDate === date) &&
      (!priority || report.priority === priority)
    );
  });

  return (
    <div className="authority-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AuthorityNav user={getCurrentUser()} setToast={setToast} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{ height: "72px", backgroundColor: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-divider)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="hidden md:flex" style={{ flexDirection: "column" }}>
            <h2 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>History</h2>
            <p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Archived and resolved civic reports.</p>
          </div>

          <div style={{ flex: 1, maxWidth: "480px", margin: "0 24px" }}>
            <SearchBar search={search} setSearch={setSearch} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {getCurrentUser() && (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--color-primary-pastel)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                {getCurrentUser().email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: "32px" }}>
          {/* Filter Bar */}
          <div className="ds-card ds-shadow-card" style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="ds-select">
                <option value="">All categories</option>
                {reportCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="ds-select">
                <option value="">All departments</option>
                {departments.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <select value={officer} onChange={(e) => setOfficer(e.target.value)} className="ds-select">
                <option value="">All officers</option>
                {officers.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ds-input"
                style={{ height: "48px" }}
              />

              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="ds-select">
                <option value="">All priorities</option>
                {priorities.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <h2 className="ds-section-header" style={{ margin: 0 }}>Archived Reports</h2>
            <span className="ds-badge" style={{ backgroundColor: "var(--color-bg-hover)", color: "var(--color-text-primary)", padding: "4px 12px" }}>
              {filteredReports.length} Report{filteredReports.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : filteredReports.length === 0 ? (
            <div className="ds-card ds-shadow-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0", gap: "12px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--color-text-secondary)" }}>folder_open</span>
              <h3 className="ds-card-title" style={{ color: "var(--color-text-secondary)", margin: 0 }}>No archived reports found</h3>
              <p className="ds-body ds-secondary" style={{ margin: 0 }}>No archived reports match the current filters.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))", gap: "24px" }}>
              {filteredReports.map((report) => (
                <div key={report.id} className="ds-stagger-item">
                  <ReportCard report={report} showResolutionDetails />
                  <p className="ds-label ds-secondary" style={{ margin: "8px 0 0 4px" }}>
                    Resolved: {formatTimestamp(report.resolvedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <p className="ds-label ds-secondary" style={{ marginTop: "32px" }}>
            Signed in as {getCurrentUser()?.email || "authority user"}.
          </p>
        </main>
      </div>
    </div>
  );
}
