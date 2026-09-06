import { useCallback, useEffect, useState } from "react";

import DashboardStats from "../components/DashboardStats";
import SearchBar from "../components/SearchBar";
import ReportSection from "../components/ReportSection";
import DashboardMap from "../components/DashboardMap";
import AssignModal from "../components/AssignModal";
import ResolutionModal from "../components/ResolutionModal";
import Toast from "../components/Toast";
import LoadingSkeleton from "../components/LoadingSkeleton";
import AuthorityNav from "../components/AuthorityNav";
import DemoDataNotice from "../components/DemoDataNotice";

import {
  getReports,
  assignReport,
  resolveReport,
  archiveReport,
  seedLifecycleDemoData,
} from "../services/firebase";

import {
  observeAuth,
  getCurrentUser,
} from "../services/auth";

import {
  formatDuration,
  getAverageResolutionTime,
  getResolutionRate,
  isSyntheticReport,
} from "../utils/analytics";

export default function AuthorityDashboard() {
  const [user, setUser] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [seedingDemo, setSeedingDemo] = useState(false);

  const [selectedReport, setSelectedReport] =
    useState(null);
  const [showAssignModal, setShowAssignModal] =
    useState(false);

  const [resolutionReport, setResolutionReport] =
    useState(null);

  const [mapReport, setMapReport] =
    useState(null);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);

      const data = await getReports();

      setReports(data);
    } catch (err) {
      console.error(err);
      setToast({
        message: "Failed to load reports.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuth((currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        loadReports();
      }
    });

    return () => unsubscribe();
  }, [loadReports]);

  function handleAssignClick(report) {
    setSelectedReport(report);
    setShowAssignModal(true);
  }

  async function handleAssignment(data) {
    if (!selectedReport) return;

    try {
      await assignReport(selectedReport.id, {
        department: data.department,
        officer: data.officer,
        priority: data.priority,
        assignedBy: getCurrentUser()?.email || "",
      });

      setShowAssignModal(false);
      setSelectedReport(null);

      await loadReports();
      showToast("Report assigned successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Unable to assign report.", "error");
    }
  }

  async function handleResolution(data) {
    if (!resolutionReport) return;

    try {
      await resolveReport(resolutionReport.id, data);

      setResolutionReport(null);

      await loadReports();
      showToast("Report marked as resolved.", "success");
    } catch (err) {
      console.error(err);
      showToast("Unable to resolve report.", "error");
    }
  }

  async function handleArchive(id) {
    try {
      await archiveReport(id);

      await loadReports();
      showToast("Report archived successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Unable to archive report.", "error");
    }
  }

  async function handleSeedDemo() {
    if (!window.confirm("Load 48 clearly labelled synthetic lifecycle records? This will make the demo-inclusive resolution rate 55%.")) return;

    try {
      setSeedingDemo(true);
      await seedLifecycleDemoData();
      await loadReports();
      showToast("Proof dataset loaded. The demo-inclusive resolution rate is now 55%.", "success");
    } catch (error) {
      console.error(error);
      showToast(error.message || "Unable to load the proof dataset.", "error");
    } finally {
      setSeedingDemo(false);
    }
  }


  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--color-bg-app)" }}>
        <h2 className="ds-body ds-secondary" style={{ fontSize: "16px" }}>
          Checking login...
        </h2>
      </div>
    );
  }

  const activeReports = reports.filter(
    (report) => report.status !== "archived"
  );

  const pending = activeReports.filter(
    (report) => report.status === "pending"
  );
  const assigned = activeReports.filter(
    (report) => report.status === "assigned"
  );
  const resolved = activeReports.filter(
    (report) => report.status === "resolved"
  );
  const archived = reports.filter(
    (report) => report.status === "archived"
  );

  const resolutionRate = getResolutionRate(reports);
  const demoCount = reports.filter(isSyntheticReport).length;
  const demoLifecycleLoaded = reports.some((report) => report.id.startsWith("synthetic-lifecycle-v3-"));
  const isBootstrapOwner = user.email?.toLowerCase() === String(import.meta.env.VITE_AUTHORITY_EMAIL || "").trim().toLowerCase();
  const averageResolutionTime = formatDuration(
    getAverageResolutionTime(reports)
  );

  function filterReports(list) {
    const text = search.toLowerCase().trim();

    if (!text) return list;

    return list.filter((report) => {
      const haystack = [
        report.description,
        report.category,
        report.analysis?.category || report.ai?.category,
        report.analysis?.department || report.ai?.department,
        report.assignedDepartment,
        report.assignedOfficer,
        report.priority,
        report.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(text);
    });
  }

  return (
    <div className="authority-shell" style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Persistent Left Sidebar */}
      <AuthorityNav user={user} setToast={setToast} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* Top Bar */}
        <header style={{ height: "72px", backgroundColor: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-divider)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          {/* Left: Title & Subtitle */}
          <div className="hidden md:flex" style={{ flexDirection: "column" }}>
            <h2 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>Dashboard</h2>
            <p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Manage and resolve civic issues across Bengaluru.</p>
          </div>
          
          {/* Center: Search */}
          <div style={{ flex: 1, maxWidth: "480px", margin: "0 24px" }}>
            <SearchBar search={search} setSearch={setSearch} />
          </div>
          
          {/* Right: Notifications & Profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {user && (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--color-primary-pastel)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                {user.email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <main style={{ flex: 1, padding: "32px", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
          <DemoDataNotice reports={reports} />
          {isBootstrapOwner && !demoLifecycleLoaded && !loading && (
            <section className="ds-card ds-shadow-card" style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <p className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "6px" }}>PROOF DATASET</p>
                <p className="ds-body" style={{ margin: 0 }}>
                  Add 48 synthetic lifecycle cases to the existing {demoCount} examples, including assignments, resolutions, archive history, officers, timestamps, and resolution notes.
                </p>
                <p className="ds-body ds-secondary" style={{ margin: "6px 0 0", fontSize: "13px" }}>
                  Result: 60 total · 15 pending · 12 assigned · 20 resolved · 13 archived.
                </p>
              </div>
              <button className="ds-btn ds-btn-primary" onClick={handleSeedDemo} disabled={seedingDemo}>
                {seedingDemo ? "Loading demo records..." : "Load 55% proof dataset"}
              </button>
            </section>
          )}
          <DashboardStats
            total={reports.length}
            pending={pending.length}
            assigned={assigned.length}
            resolved={resolved.length}
            archived={archived.length}
            resolutionRate={resolutionRate}
            averageResolutionTime={averageResolutionTime}
          />

          <div style={{ marginTop: "24px" }}>
            <DashboardMap
              reports={activeReports}
              selectedReport={mapReport}
              onSelectReport={setMapReport}
            />
          </div>

          {loading ? (
            <div style={{ marginTop: "32px" }}>
              <LoadingSkeleton />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "32px", marginTop: "32px" }}>
              {/* Tab Bar */}
              <div style={{ display: "flex", gap: "12px", borderBottom: "1px solid var(--color-divider)", paddingBottom: "16px" }}>
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`ds-btn ${activeTab === "pending" ? "ds-btn-primary" : "ds-btn-secondary"}`}
                >
                  Pending ({pending.length})
                </button>
                <button
                  onClick={() => setActiveTab("assigned")}
                  className={`ds-btn ${activeTab === "assigned" ? "ds-btn-primary" : "ds-btn-secondary"}`}
                >
                  Assigned ({assigned.length})
                </button>
                <button
                  onClick={() => setActiveTab("resolved")}
                  className={`ds-btn ${activeTab === "resolved" ? "ds-btn-primary" : "ds-btn-secondary"}`}
                >
                  Resolved ({resolved.length})
                </button>
              </div>

              {activeTab === "pending" && (
                <ReportSection
                  title="Pending Reports"
                  reports={filterReports(pending)}
                  onAssign={(report) => {
                    setMapReport(report);
                    handleAssignClick(report);
                  }}
                  onResolve={(report) => {
                    setMapReport(report);
                    setResolutionReport(report);
                  }}
                  onSelect={setMapReport}
                  emptyMessage="No pending reports right now."
                />
              )}

              {activeTab === "assigned" && (
                <ReportSection
                  title="Assigned Reports"
                  reports={filterReports(assigned)}
                  onResolve={(report) => {
                    setMapReport(report);
                    setResolutionReport(report);
                  }}
                  onSelect={setMapReport}
                  emptyMessage="No assigned reports right now."
                />
              )}

              {activeTab === "resolved" && (
                <ReportSection
                  title="Resolved Reports"
                  reports={filterReports(resolved)}
                  onArchive={handleArchive}
                  onSelect={setMapReport}
                  emptyMessage="No resolved reports waiting for archive."
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showAssignModal && (
        <AssignModal
          key={selectedReport?.id}
          report={selectedReport}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedReport(null);
          }}
          onAssign={handleAssignment}
        />
      )}

      {resolutionReport && (
        <ResolutionModal
          report={resolutionReport}
          defaultResolver={
            getCurrentUser()?.email || user.email || ""
          }
          onClose={() => setResolutionReport(null)}
          onResolve={handleResolution}
        />
      )}
    </div>
  );
}
