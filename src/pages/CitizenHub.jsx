import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import MapView from "../components/MapView";
import ReportDrawer from "../components/ReportDrawer";
import DemoDataNotice from "../components/DemoDataNotice";
import { getPublicReports, isFirebaseConfigured } from "../services/firebase";
import { getResolutionRate, isSyntheticReport } from "../utils/analytics";
import { formatTimestamp } from "../utils/reports";
import { getCategoryMarkerStyle } from "../utils/mapCategories";

export default function CitizenHub() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");

  const mapSectionRef = useRef(null);

  // New Live Data State
  const [stats, setStats] = useState({ total: 0, pending: 0, resolutionRate: 0, demoCount: 0 });
  const [recentReports, setRecentReports] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState("");

  // Fetch Live Data
  useEffect(() => {
    async function loadData() {
      try {
        const data = await getPublicReports();
        
        // Calculate stats using existing data array
        const total = data.length;
        const pending = data.filter((r) => r.status === "pending").length;
        const resolutionRate = getResolutionRate(data);
        
        setStats({
          total,
          pending,
          resolutionRate,
          demoCount: data.filter(isSyntheticReport).length,
        });
        
        // Slice top 5 most recent reports (already sorted by createdAt desc)
        setRecentReports(data.slice(0, 5));
      } catch (err) {
        console.error("Error fetching live data for hub:", err);
        setDataError("Live civic data is unavailable. The Firebase rules and publicReports collection may not be deployed yet.");
      } finally {
        setLoadingData(false);
      }
    }
    
    loadData();
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocation(coords);
        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
      }
    );
  };

  const handleSubmissionSuccess = () => {
    setDescription("");
    setCategory("");
    setLocation(null);
    setLocationStatus("");
    setDrawerOpen(false);
    
    // Refresh live data after submission
    getPublicReports().then((data) => {
      setDataError("");
      setStats({
        total: data.length,
        pending: data.filter((r) => r.status === "pending").length,
        resolutionRate: getResolutionRate(data),
        demoCount: data.filter(isSyntheticReport).length,
      });
      setRecentReports(data.slice(0, 5));
    }).catch(() => setDataError("The report was saved, but the public activity feed could not be refreshed."));
  };

  const openReportForm = () => {
    setDrawerOpen(true);
  };

  // Helper for priority color accents on recent reports
  const getPriorityClass = (priority) => {
    if (priority === "High" || priority === "Critical") return "ds-card-priority-high";
    if (priority === "Medium") return "ds-card-priority-medium";
    if (priority === "Low") return "ds-card-priority-low";
    return "";
  };

  return (
    <div className="ds-page">
      
      {/* Hero Landing Section */}
      <section className="ds-hero-gradient" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        
        <header style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "24px 32px" }}>
          <div className="ds-container ds-flex-between">
            <h1 style={{ fontSize: "24px", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: 0 }}>
              CivicAI
            </h1>
            <Link to="/authority" className="ds-label" style={{ color: "var(--color-primary)" }}>
              AUTHORITY LOGIN
            </Link>
          </div>
        </header>

        <div className="ds-container ds-page-enter" style={{ textAlign: "center", maxWidth: "800px" }}>
          <h1 style={{ fontSize: "clamp(48px, 8vw, 80px)", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: "0 0 16px", lineHeight: 1.1, letterSpacing: "-1.5px" }}>
            CivicAI
          </h1>
          
          <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)", margin: "0 0 24px" }}>
            Clear, Fast Civic Issue Management
          </h2>
          
          <p className="ds-body" style={{ fontSize: "20px", color: "var(--color-text-secondary)", marginBottom: "48px" }}>
            Report local issues, get transparent rule-based routing, and help municipal teams resolve problems faster—without sending your report to an AI provider.
          </p>
          
          <div className="ds-flex-center" style={{ gap: "16px", flexWrap: "wrap" }}>
            <button
              onClick={openReportForm}
              className="ds-btn ds-btn-pill-cta"
            >
              Report an Issue
            </button>
            
            <Link
              to="/authority"
              className="ds-btn ds-btn-pill-cta-outline"
            >
              Secure Authority Login
            </Link>
          </div>
        </div>
      </section>

      {/* Live Data & Recent Reports Section */}
      <section className="ds-container" style={{ paddingBlock: "80px" }}>
        <h2 className="ds-title" style={{ marginBottom: "32px", textAlign: "center" }}>Live City Activity</h2>
        {!isFirebaseConfigured && (
          <div className="ds-card" style={{ marginBottom: "24px", borderLeft: "4px solid var(--color-amber)" }}>
            <p className="ds-body" style={{ margin: 0 }}>Live civic data is not configured for this deployment. The site remains available, but submissions and authority access are disabled.</p>
          </div>
        )}
        {dataError && (
          <div className="ds-card" role="status" style={{ marginBottom: "24px", borderLeft: "4px solid var(--color-error)" }}>
            <p className="ds-body" style={{ margin: 0 }}>{dataError}</p>
          </div>
        )}
        <DemoDataNotice reports={recentReports} total={stats.total} demoCount={stats.demoCount} />
        
        {loadingData ? (
          <div className="ds-grid-cards">
             <div className="ds-skeleton ds-skeleton-card" />
             <div className="ds-skeleton ds-skeleton-card" />
             <div className="ds-skeleton ds-skeleton-card" />
          </div>
        ) : (
          <div style={{ display: "grid", gap: "var(--layout-card-gap)", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", marginBottom: "48px" }}>
            <div className="ds-card ds-page-enter" style={{ animationDelay: "50ms", textAlign: "center" }}>
              <p className="ds-label">TOTAL REPORTS</p>
              <p style={{ fontSize: "48px", fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)", margin: "8px 0 0" }}>{stats.total}</p>
            </div>
            <div className="ds-card ds-page-enter" style={{ animationDelay: "100ms", textAlign: "center" }}>
              <p className="ds-label">PENDING RESOLUTION</p>
              <p style={{ fontSize: "48px", fontWeight: "var(--font-weight-bold)", color: "var(--color-amber)", margin: "8px 0 0" }}>{stats.pending}</p>
            </div>
            <div className="ds-card ds-page-enter" style={{ animationDelay: "150ms", textAlign: "center" }}>
              <p className="ds-label">
                {stats.demoCount > 0 ? "DEMO-INCLUSIVE RESOLUTION RATE" : "RESOLUTION RATE"}
              </p>
              <p style={{ fontSize: "48px", fontWeight: "var(--font-weight-bold)", color: "var(--color-teal)", margin: "8px 0 0" }}>{stats.resolutionRate}%</p>
            </div>
          </div>
        )}

        <h3 className="ds-section-header" style={{ marginBottom: "24px" }}>Recent Reports</h3>
        {loadingData ? (
          <div className="ds-skeleton ds-skeleton-text" style={{ width: "100%", height: "200px" }} />
        ) : recentReports.length === 0 ? (
          <p className="ds-body ds-secondary">No recent reports found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {recentReports.map((report, i) => (
              <div
                key={report.id}
                className={`ds-card ${getPriorityClass(report.priority)} ds-stagger-item`}
                style={{
                  animationDelay: `${200 + i * 50}ms`,
                  background: getCategoryMarkerStyle(report.category).background,
                }}
              >
                <div className="ds-flex-between" style={{ marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div className="ds-flex-center" style={{ gap: "8px" }}>
                    <span
                      className="ds-chip"
                      style={{
                        color: getCategoryMarkerStyle(report.category).color,
                        background: getCategoryMarkerStyle(report.category).background,
                      }}
                    >
                      {report.category}
                    </span>
                    <span className={`ds-badge ds-badge-${report.status || "pending"}`}>{String(report.status || "pending").toUpperCase()}</span>
                    {isSyntheticReport(report) && <span className="ds-badge ds-badge-assigned">DEMO</span>}
                  </div>
                  <span className="ds-label ds-secondary">
                    {formatTimestamp(report.createdAt)}
                  </span>
                </div>
                <p className="ds-card-title">{report.category || "Civic"} issue reported near this location.</p>
                {report.location && (
                  <p className="ds-body ds-secondary" style={{ marginTop: "8px", fontSize: "12px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px", verticalAlign: "middle", marginRight: "4px" }}>location_on</span>
                    {Number(report.location.latitude ?? report.location.lat).toFixed(3)}, {Number(report.location.longitude ?? report.location.lng).toFixed(3)} (approximate)
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Existing Map Section */}
      <section ref={mapSectionRef} style={{ position: "relative", height: "80vh", width: "100%", overflow: "hidden", borderTop: "1px solid var(--color-divider)" }}>
        
        {/* Hidden map container that just takes height */}
        <div style={{ height: "100%", width: "100%" }}>
          <MapView location={location} />
        </div>

        <button
          onClick={() => setDrawerOpen(true)}
          className="ds-btn ds-btn-primary ds-shadow-card"
          style={{ position: "absolute", bottom: "32px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, borderRadius: "99px", height: "48px", padding: "0 24px" }}
        >
          <span className="material-symbols-outlined">add</span>
          Report Issue Here
        </button>

        <ReportDrawer
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          handleGetLocation={handleGetLocation}
          location={location}
          locationStatus={locationStatus}
          onSubmitSuccess={handleSubmissionSuccess}
        />
      </section>
    </div>
  );
}
