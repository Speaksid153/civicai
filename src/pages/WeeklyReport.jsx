import { useEffect, useState } from "react";
import AuthorityNav from "../components/AuthorityNav";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Toast from "../components/Toast";
import { observeAuth } from "../services/auth";
import { buildWeeklyReport } from "../services/civicIntelligence";
import { getReports } from "../services/firebase";
import { getReportTimestamp } from "../utils/reports";

function localDateId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeeks() {
  const today = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const anchor = new Date(today);
    anchor.setDate(anchor.getDate() - index * 7);
    const start = new Date(anchor);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return {
      id: `${localDateId(start)}_${localDateId(end)}`,
      label: `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}–${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
      start,
      end,
    };
  });
}

export default function WeeklyReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [weeks] = useState(() => getWeeks());
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]?.id || "");

  useEffect(() => observeAuth(setUser), []);
  useEffect(() => {
    let active = true;
    getReports()
      .then((data) => active && setReports(data))
      .catch(() => active && setToast({ type: "error", message: "Reports could not be loaded." }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selected = weeks.find((week) => week.id === selectedWeek) || weeks[0];
  const weeklyReports = reports.filter((report) => {
    const date = getReportTimestamp(report.createdAt);
    return date && selected && date >= selected.start && date <= selected.end;
  });
  const report = buildWeeklyReport(weeklyReports, selected?.label || "the selected week");

  if (!user) return <div className="ds-page ds-flex-center" style={{ minHeight: "100vh" }}>Checking login...</div>;

  return (
    <div className="authority-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AuthorityNav user={user} setToast={setToast} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ height: "72px", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--color-divider)", background: "var(--color-bg-surface)", position: "sticky", top: 0, zIndex: 100 }}>
          <div><h1 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>Weekly Report</h1><p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Generated instantly from recorded civic metrics.</p></div>
          <button onClick={() => window.print()} className="ds-btn ds-btn-secondary"><span className="material-symbols-outlined">print</span>Print / Save PDF</button>
        </header>

        <main className="ds-container" style={{ paddingBlock: "32px", maxWidth: "980px" }}>
          <div className="ds-flex-between" style={{ marginBottom: "24px", gap: "16px", flexWrap: "wrap" }}>
            <label className="ds-input-label" htmlFor="week-select">Reporting period</label>
            <select id="week-select" className="ds-select" value={selectedWeek} onChange={(event) => setSelectedWeek(event.target.value)} style={{ maxWidth: "320px" }}>
              {weeks.map((week) => <option key={week.id} value={week.id}>{week.label}</option>)}
            </select>
          </div>

          {loading ? <LoadingSkeleton /> : (
            <article className="ds-card ds-shadow-card" style={{ padding: "clamp(24px, 5vw, 56px)" }}>
              <header style={{ textAlign: "center", borderBottom: "1px solid var(--color-divider)", paddingBottom: "24px", marginBottom: "32px" }}>
                <h1 style={{ color: "var(--color-primary)", marginBottom: "8px" }}>CivicAI Weekly Operations Report</h1>
                <p className="ds-body ds-secondary" style={{ margin: 0 }}>{selected?.label} · Bengaluru Municipal Authority</p>
              </header>

              <section style={{ marginBottom: "32px" }}><p className="ds-label">EXECUTIVE SUMMARY</p><p className="ds-body">{report.executiveSummary}</p></section>

              <section className="ds-grid-cards" style={{ marginBottom: "32px" }}>
                {[
                  ["Total reports", report.keyMetrics.totalReports],
                  ["Resolution rate", `${report.keyMetrics.resolutionRate}%`],
                  ["Average resolution", report.keyMetrics.avgResolutionTime],
                ].map(([label, value]) => <div className="ds-card-inset" key={label}><p className="ds-label ds-secondary">{label}</p><p style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{value}</p></div>)}
              </section>

              <section style={{ marginBottom: "32px" }}>
                <p className="ds-label">CATEGORY BREAKDOWN</p>
                {Object.entries(report.keyMetrics.byCategory).length === 0 ? <p className="ds-body ds-secondary">No reports in this period.</p> : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                    {Object.entries(report.keyMetrics.byCategory).map(([category, count]) => <div className="ds-card-inset" key={category}><strong>{category}</strong><p style={{ fontSize: "24px", margin: "8px 0 0" }}>{count}</p></div>)}
                  </div>
                )}
              </section>

              <section style={{ marginBottom: "32px" }}>
                <p className="ds-label">DEPARTMENT PERFORMANCE</p>
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr style={{ textAlign: "left", borderBottom: "1px solid var(--color-divider)" }}><th style={{ padding: "12px" }}>Department</th><th>Workload</th><th>Resolution</th><th>Average time</th></tr></thead>
                  <tbody>{report.departmentAnalysis.map((department) => <tr key={department.department} style={{ borderBottom: "1px solid var(--color-divider)" }}><td style={{ padding: "12px" }}><strong>{department.department}</strong></td><td>{department.workload}</td><td>{department.resolutionRate}%</td><td>{department.avgResolutionTime}</td></tr>)}</tbody>
                </table></div>
              </section>

              <section style={{ marginBottom: "32px" }}><p className="ds-label">RECOMMENDED ACTIONS</p><ol style={{ paddingLeft: "20px" }}>{report.recommendations.map((item) => <li className="ds-body" key={item} style={{ marginBottom: "10px" }}>{item}</li>)}</ol></section>

              <footer className="ds-card-inset"><p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "12px" }}>Method: deterministic aggregation and versioned civic routing rules. No generative model or external AI service was used.</p></footer>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
