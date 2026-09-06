import { useEffect, useMemo, useState } from "react";
import AuthorityNav from "../components/AuthorityNav";
import LoadingSkeleton from "../components/LoadingSkeleton";
import Toast from "../components/Toast";
import DemoDataNotice from "../components/DemoDataNotice";
import { buildOperationalInsights } from "../services/civicIntelligence";
import { observeAuth } from "../services/auth";
import { getReports } from "../services/firebase";
import { getReportsByCategory } from "../utils/analytics";
import { getDepartmentMarkerStyle } from "../utils/mapCategories";

function getAnalysis(report) {
  return report.analysis || report.ai || null;
}

function calculateRuleMetrics(reports) {
  const analyzed = reports.filter((report) => getAnalysis(report));
  const overrides = analyzed.filter((report) => getAnalysis(report)?.userOverride === true);
  const confidenceValues = analyzed
    .map((report) => Number(getAnalysis(report)?.confidence))
    .filter(Number.isFinite);
  return {
    analyzed: analyzed.length,
    acceptedRate: analyzed.length ? Math.round(((analyzed.length - overrides.length) / analyzed.length) * 100) : 0,
    averageConfidence: confidenceValues.length
      ? Math.round(confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length)
      : 0,
    overrides: overrides.length,
  };
}

export default function AIInsightsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => observeAuth(setUser), []);
  useEffect(() => {
    let active = true;
    getReports()
      .then((data) => active && setReports(data))
      .catch(() => active && setToast({ type: "error", message: "Civic reports could not be loaded." }))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const insights = useMemo(() => buildOperationalInsights(reports), [reports]);
  const metrics = useMemo(() => calculateRuleMetrics(reports), [reports]);
  const categoryCounts = useMemo(() => getReportsByCategory(reports), [reports]);
  const maxCategory = Math.max(1, ...Object.values(categoryCounts));

  if (!user) {
    return <div className="ds-page ds-flex-center" style={{ minHeight: "100vh" }}>Checking login...</div>;
  }

  return (
    <div className="authority-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AuthorityNav user={user} setToast={setToast} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <header style={{ height: "72px", padding: "0 32px", display: "flex", alignItems: "center", borderBottom: "1px solid var(--color-divider)", background: "var(--color-bg-surface)", position: "sticky", top: 0, zIndex: 100 }}>
          <div>
            <h1 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>Operational Insights</h1>
            <p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Calculated from civic records with transparent, local rules.</p>
          </div>
        </header>

        <main className="ds-container" style={{ paddingBlock: "32px" }}>
          <DemoDataNotice reports={reports} />
          {loading ? <LoadingSkeleton /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <section className="ds-card ds-shadow-card">
                <p className="ds-label" style={{ color: "var(--color-primary)" }}>DATA-BASED SUMMARY</p>
                <h2 className="ds-title">What the records show</h2>
                <p className="ds-body ds-secondary" style={{ maxWidth: "900px" }}>{insights.executiveSummary}</p>
                <p className="ds-body" style={{ fontSize: "12px", marginBottom: 0 }}>
                  No report text leaves the application for analysis. Results are reproducible from stored metrics and the versioned rules engine.
                </p>
              </section>

              <section className="ds-grid-cards">
                {[
                  ["Civic records", reports.length, "inventory_2"],
                  ["Rule suggestions", metrics.analyzed, "rule"],
                  ["Accepted unchanged", `${metrics.acceptedRate}%`, "check_circle"],
                  ["Manual overrides", metrics.overrides, "edit_note"],
                ].map(([label, value, icon]) => (
                  <div className="ds-card" key={label}>
                    <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>{icon}</span>
                    <p className="ds-label ds-secondary">{label}</p>
                    <p style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>{value}</p>
                  </div>
                ))}
              </section>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
                <section className="ds-card">
                  <h2 className="ds-title">Category volume</h2>
                  {Object.entries(categoryCounts).length === 0 ? <p className="ds-body ds-secondary">No civic data yet.</p> : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {Object.entries(categoryCounts).sort(([, a], [, b]) => b - a).map(([category, count]) => (
                        <div key={category}>
                          <div className="ds-flex-between"><span>{category}</span><strong>{count}</strong></div>
                          <div style={{ height: "7px", background: "var(--color-bg-hover)", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(count / maxCategory) * 100}%`, background: "var(--color-primary)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="ds-card">
                  <h2 className="ds-title">Priority areas</h2>
                  {insights.priorityAreas.length === 0 ? <p className="ds-body ds-secondary">No priority areas calculated.</p> : insights.priorityAreas.map((area) => (
                    <div className="ds-card-inset" key={area.area} style={{ marginBottom: "12px" }}>
                      <div className="ds-flex-between"><strong>{area.area}</strong><span className="ds-badge ds-badge-pending">{area.priorityLevel}</span></div>
                      <p className="ds-body ds-secondary" style={{ marginBottom: 0 }}>{area.reason}</p>
                    </div>
                  ))}
                </section>
              </div>

              <section className="ds-card">
                <div style={{ marginBottom: "20px" }}>
                  <h2 className="ds-title" style={{ marginBottom: "4px" }}>Department workload</h2>
                  <p className="ds-body ds-secondary" style={{ margin: 0 }}>A compact view of load, turnaround, and the next operational check.</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                  {insights.departmentInsights.map((item) => {
                    const sectorStyle = getDepartmentMarkerStyle(item.department);
                    return (
                      <article
                        key={item.department}
                        style={{
                          padding: "18px",
                          borderRadius: "var(--radius-card)",
                          background: "var(--color-bg-surface)",
                          border: "1px solid var(--color-divider)",
                          borderLeft: `4px solid ${sectorStyle.color}`,
                        }}
                      >
                        <div className="ds-flex-between" style={{ gap: "12px", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "9px", minWidth: 0 }}>
                            <span aria-hidden="true" style={{ width: "10px", height: "10px", borderRadius: "50%", background: sectorStyle.color, flexShrink: 0 }} />
                            <h3 style={{ margin: 0, fontSize: "16px", color: sectorStyle.color }}>{item.department}</h3>
                          </div>
                          <span className="ds-chip" style={{ color: sectorStyle.color, borderColor: `${sectorStyle.color}55` }}>
                            {item.workload} load
                          </span>
                        </div>
                        <p className="ds-label ds-secondary" style={{ marginBottom: "4px" }}>AVERAGE RESOLUTION</p>
                        <p style={{ margin: "0 0 14px", fontSize: "24px", fontWeight: 700 }}>{item.avgResolutionTime}</p>
                        <p className="ds-label ds-secondary" style={{ marginBottom: "4px" }}>NEXT CHECK</p>
                        <p className="ds-body" style={{ margin: 0, fontSize: "14px", lineHeight: 1.5 }}>{item.suggestion}</p>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="ds-card">
                <h2 className="ds-title">Recommended actions</h2>
                <ol style={{ paddingLeft: "20px", marginBottom: 0 }}>
                  {insights.recommendations.map((recommendation) => <li className="ds-body" key={recommendation} style={{ marginBottom: "10px" }}>{recommendation}</li>)}
                </ol>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
