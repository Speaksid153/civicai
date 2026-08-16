import { useState } from "react";
import AIAnalysisReview from "./AIAnalysisReview";
import { addReport, getRecentPublicReports } from "../services/firebase";
import { analyzeReport } from "../services/civicIntelligence";

export default function ReportDrawer({
  drawerOpen,
  setDrawerOpen,
  description,
  setDescription,
  category,
  setCategory,
  handleGetLocation,
  location,
  locationStatus,
  onSubmitSuccess,
}) {
  const departmentByCategory = {
    Road: "BBMP Roads",
    Garbage: "BBMP Sanitation",
    Water: "BWSSB",
    Electricity: "BESCOM",
    Drainage: "BWSSB",
    Other: "BBMP Sanitation",
  };
  const applyCategoryChoice = (analysis) => category
    ? { ...analysis, category, department: departmentByCategory[category], recommendedDepartment: departmentByCategory[category] }
    : analysis;
  const [duplicateCheckRunning, setDuplicateCheckRunning] = useState(false);
  const [submitRunning, setSubmitRunning] = useState(false); // New state for submission
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [checkedForDuplicates, setCheckedForDuplicates] = useState(false);
  const [analysisFingerprint, setAnalysisFingerprint] = useState("");

  // Automated routing review state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAiReview, setShowAiReview] = useState(false);

  const currentFingerprint = () => JSON.stringify([
    description.trim(),
    category,
    location?.latitude,
    location?.longitude,
  ]);

  // Check for potential duplicate reports nearby
  const checkForDuplicates = async () => {
    if (!location || !description.trim()) return;

    setDuplicateCheckRunning(true);
    setCheckedForDuplicates(true);

    try {
      // Get recent reports (last 7 days) to check for duplicates
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentReports = await getRecentPublicReports(sevenDaysAgo, 30);

      // Filter reports that are nearby (approximately 1km radius)
      const nearbyReports = recentReports.filter((report) => {
        if (!report.location) return false;

        const lat1 = location.latitude;
        const lon1 = location.longitude;
        const lat2 = report.location.latitude ?? report.location.lat;
        const lon2 = report.location.longitude ?? report.location.lng;
        if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return false;

        // Haversine formula approximation for distance in kilometers
        const R = 6371; // Earth's radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance <= 1.0; // Within 1km
      });

      if (description.trim().length > 10) {
        const analysis = applyCategoryChoice(analyzeReport(description, nearbyReports));
        setPotentialDuplicates(analysis.duplicates || []);
        setShowDuplicateWarning(analysis.isLikelyDuplicate || false);
        setAiAnalysis(analysis);
        setAnalysisFingerprint(currentFingerprint());
        return analysis;
      } else {
        const analysis = applyCategoryChoice(analyzeReport(description, []));
        setPotentialDuplicates([]);
        setShowDuplicateWarning(false);
        setAiAnalysis(analysis);
        setAnalysisFingerprint(currentFingerprint());
        return analysis;
      }
    } catch (err) {
      console.error("Error checking for duplicates:", err);
      // Continue with submission even if duplicate check fails
      setPotentialDuplicates([]);
      setShowDuplicateWarning(false);
      const analysis = applyCategoryChoice(analyzeReport(description, []));
      setAiAnalysis(analysis);
      setAnalysisFingerprint(currentFingerprint());
      return analysis;
    } finally {
      setDuplicateCheckRunning(false);
    }
  };



  // Handle form submission with local duplicate and routing checks
  const handleDuplicatedSubmit = async (e) => {
    e?.preventDefault?.();

    // Basic validation
    const cleanDescription = description.trim();
    if (cleanDescription.length < 10) {
      alert("Please describe the issue in at least 10 characters");
      return;
    }

    if (cleanDescription.length > 2000) {
      alert("Please keep the description under 2,000 characters");
      return;
    }

    if (!location) {
      alert("Please get your location first");
      return;
    }

    let analysis = aiAnalysis;
    if (!checkedForDuplicates || analysisFingerprint !== currentFingerprint()) {
      analysis = await checkForDuplicates();
    }

    if (analysis?.isLikelyDuplicate && analysis.duplicates?.length > 0) {
      setShowDuplicateWarning(true);
      return;
    }

    setShowDuplicateWarning(false);

    try {
      setSubmitRunning(true);
      if (!analysis) {
        analysis = applyCategoryChoice(analyzeReport(description, []));
        setAiAnalysis(analysis);
      }
      setShowAiReview(true);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitRunning(false);
    }
  };

  // Handle submission from the automated analysis review
  const handleAiReviewSubmit = async (reviewedAnalysis) => {
    try {
      setSubmitRunning(true);
      const reviewedDepartment = departmentByCategory[reviewedAnalysis.category] || "BBMP Sanitation";

      const reportData = {
        description: description.trim(),
        category: reviewedAnalysis.category,
        priority: reviewedAnalysis.priority,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        imageUrl: null,
        analysis: {
          ...aiAnalysis,
          finalCategory: reviewedAnalysis.category,
          finalPriority: reviewedAnalysis.priority,
          userOverride: reviewedAnalysis.userEdited,
          userJustification: reviewedAnalysis.editReason,
          suggestedCategory: aiAnalysis.category,
          suggestedDepartment: aiAnalysis.department,
          suggestedPriority: aiAnalysis.priority,
          category: reviewedAnalysis.category,
          department: reviewedDepartment,
          priority: reviewedAnalysis.priority,
          summary: aiAnalysis.summary,
          confidence: aiAnalysis.confidence,
          imageDescriptionAlignment: aiAnalysis.imageDescriptionAlignment,
          authenticityAssessment: aiAnalysis.authenticityAssessment,
          visibleHazards: aiAnalysis.visibleHazards,
          severityEstimate: aiAnalysis.severityEstimate,
          priorityExplanation: aiAnalysis.priorityExplanation,
          recommendedDepartment: reviewedDepartment,
          urgencyIndicators: aiAnalysis.urgencyIndicators,
        },
      };

      await addReport(reportData);

      // Reset form
      setDescription("");
      setCategory("");

      // Close drawer and reset review state
      setDrawerOpen(false);
      setShowAiReview(false);
      setAiAnalysis(null);
      setCheckedForDuplicates(false);
      setAnalysisFingerprint("");
      setPotentialDuplicates([]);
      setShowDuplicateWarning(false);

      // Show success message
      alert("Report submitted successfully!");
      onSubmitSuccess?.();
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitRunning(false);
    }
  };

  // Handle cancellation from automated analysis review
  const handleAiReviewCancel = () => {
    setShowAiReview(false);
    setAiAnalysis(null);
    setCheckedForDuplicates(false);
    setAnalysisFingerprint("");
    setPotentialDuplicates([]);
    setShowDuplicateWarning(false);
  };

  return (
    <div
      className={`ds-drawer h-[70vh] ${
        duplicateCheckRunning || showDuplicateWarning || drawerOpen
          ? ""
          : "ds-drawer-closed"
      }`}
    >
      {/* Header */}
      <div className="ds-flex-between" style={{ padding: "16px 24px", borderBottom: "1px solid var(--color-divider)" }}>
        <h2 className="ds-title">
          Report an Issue
        </h2>

        <button
          onClick={() => setDrawerOpen(false)}
          className="ds-btn-icon"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Duplicate Warning Banner */}
      {showDuplicateWarning && potentialDuplicates.length > 0 && (
        <div style={{ padding: "16px", backgroundColor: "var(--color-amber-pastel)", borderLeft: "4px solid var(--color-amber)", margin: "0 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-amber)" }}>warning</span>
            <div>
              <p className="ds-body" style={{ fontWeight: "var(--font-weight-medium)", color: "#9A5314", margin: "0 0 4px" }}>
                Similar reports found nearby!
              </p>
              <div className="ds-label" style={{ color: "var(--color-amber)", marginBottom: "12px", whiteSpace: "pre-line" }}>
                {potentialDuplicates
                  .map(
                    (dup) =>
                      `• ${dup.suggestion} (Similarity: ${dup.similarityScore}%)`
                  )
                  .join("\n")}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setShowAiReview(true);
                  }}
                  className="ds-btn" style={{ height: "32px", fontSize: "12px", padding: "0 12px", backgroundColor: "var(--color-amber)", color: "#fff" }}
                >
                  Continue Anyway
                </button>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="ds-btn ds-btn-secondary" style={{ height: "32px", fontSize: "12px", padding: "0 12px", borderColor: "var(--color-amber)", color: "var(--color-amber)" }}
                >
                  Edit report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for submission process */}
      {submitRunning && !showDuplicateWarning && (
        <div style={{ padding: "16px", backgroundColor: "var(--color-primary-pastel)", borderLeft: "4px solid var(--color-primary)", margin: "0 24px 16px", textAlign: "center" }}>
          <div className="ds-flex-center" style={{ gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite", color: "var(--color-primary)" }}>sync</span>
            <span className="ds-body" style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>Submitting report...</span>
          </div>
        </div>
      )}

    {/* Scrollable Content */}
    <div className="overflow-y-auto" style={{ height: "calc(70vh - 75px)", padding: "24px" }}>
      {/* Show automated review screen if active */}
      {showAiReview && aiAnalysis && (
        <AIAnalysisReview
          description={description}
          imageUrl={null}
          aiAnalysis={aiAnalysis}
          onSubmit={handleAiReviewSubmit}
          onCancel={handleAiReviewCancel}
        />
      )}

      {/* Show normal form if not in AI review mode */}
      {!showAiReview && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Description */}
          <div>
            <label className="ds-input-label">
              Issue Description
            </label>

            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setCheckedForDuplicates(false);
                setShowDuplicateWarning(false);
                setAiAnalysis(null);
              }}
              placeholder="Describe the issue..."
              className="ds-textarea"
            />
          </div>

          {/* Category */}
          <div>
            <label className="ds-input-label">
              Category (optional)
            </label>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCheckedForDuplicates(false);
                setShowDuplicateWarning(false);
                setAiAnalysis(null);
              }}
              className="ds-select"
            >
              <option value="">Select Category</option>
              <option value="Road">Road</option>
              <option value="Garbage">Garbage</option>
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Drainage">Drainage</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="ds-input-label">
              Location
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                onClick={handleGetLocation}
                disabled={locationStatus === "loading"}
                className="ds-btn ds-btn-secondary"
                style={{ width: "100%", ...(locationStatus === "success" ? { borderColor: "var(--color-teal)", color: "var(--color-teal)", backgroundColor: "var(--color-teal-pastel)" } : {} ) }}
              >
                {locationStatus === "loading" && (
                  <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite" }}>sync</span>
                )}
                {locationStatus === "error" && (
                  <span className="material-symbols-outlined" style={{ color: "var(--color-error)" }}>error</span>
                )}
                {locationStatus === "success" && (
                  <span className="material-symbols-outlined">check_circle</span>
                )}
                {!locationStatus && (
                  <span className="material-symbols-outlined">my_location</span>
                )}
                Get Location
              </button>

              {location && locationStatus === "success" && (
                <p className="ds-body ds-secondary" style={{ fontSize: "12px", textAlign: "center" }}>
                  Lat: {location.latitude.toFixed(4)}, Lng: {location.longitude.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="ds-flex-between" style={{ marginTop: "16px", paddingTop: "24px", borderTop: "1px solid var(--color-divider)" }}>
            <button
              onClick={() => setDrawerOpen(false)}
              className="ds-btn ds-btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDuplicatedSubmit}
              disabled={submitRunning}
              className="ds-btn ds-btn-primary"
            >
              {submitRunning ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
