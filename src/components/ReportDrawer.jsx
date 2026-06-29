import { useState } from "react";
import AIAnalysisReview from "./AIAnalysisReview";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db, uploadImage, addReport } from "../services/firebase";
import { ai, analyzeReport, analyzeReportWithImage } from "../services/ai";
import { Type } from "@google/genai";

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
  const [duplicateCheckRunning, setDuplicateCheckRunning] = useState(false);
  const [submitRunning, setSubmitRunning] = useState(false); // New state for submission
  const [potentialDuplicates, setPotentialDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [checkedForDuplicates, setCheckedForDuplicates] = useState(false);

  // Image handling state
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState(null);

  // AI Analysis Review state
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAiReview, setShowAiReview] = useState(false);

  // Check for potential duplicate reports nearby
  const checkForDuplicates = async () => {
    if (!location || !description.trim()) return;

    setDuplicateCheckRunning(true);
    setCheckedForDuplicates(true);

    try {
      // Get recent reports (last 7 days) to check for duplicates
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Query for recent reports
      const q = query(
        collection(db, "reports"),
        where("createdAt", ">=", sevenDaysAgo),
        orderBy("createdAt", "desc"),
        limit(30) // Limit for performance
      );

      const querySnapshot = await getDocs(q);
      const recentReports = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter reports that are nearby (approximately 1km radius)
      const nearbyReports = recentReports.filter((report) => {
        if (!report.location) return false;

        const lat1 = location.latitude;
        const lon1 = location.longitude;
        const lat2 = report.location.latitude;
        const lon2 = report.location.longitude;

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

      if (nearbyReports.length > 0 && description.trim().length > 10) {
        // Use Gemini to check for semantic similarity
        const aiResponse = await checkDuplicateWithAI(
          description,
          nearbyReports
        );
        setPotentialDuplicates(aiResponse.duplicates || []);
        setShowDuplicateWarning(aiResponse.isLikelyDuplicate || false);
      } else {
        setPotentialDuplicates([]);
        setShowDuplicateWarning(false);
      }
    } catch (err) {
      console.error("Error checking for duplicates:", err);
      // Continue with submission even if duplicate check fails
      setPotentialDuplicates([]);
      setShowDuplicateWarning(false);
    } finally {
      setDuplicateCheckRunning(false);
    }
  };

  // Use AI to check for semantic similarity between new report and existing ones
  const checkDuplicateWithAI = async (newDescription, nearbyReports) => {
    try {
      // Prepare nearby reports description for AI
      const nearbyDescriptions = nearbyReports
        .map(
          (report, index) => `
        Report ${index + 1} (ID: ${report.id}):
        Description: "${report.description}"
        Category: ${report.category || "Unknown"}
        Reported: ${new Date(
          report.createdAt?.seconds * 1000 || report.createdAt
        ).toLocaleString()}
      `
        )
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are an AI assistant for CivicAI, a civic issue reporting system.
        Compare the NEW citizen report with the LIST of EXISTING nearby reports to detect potential duplicates.

        NEW REPORT:
        "${newDescription}"

        NEARBY REPORTS (within 1km, from past 7 days):
        ${nearbyDescriptions}

        TASK:
        - Determine if the NEW report is substantially similar to any existing report
        - For each similar report, provide a similarity score (0-100) and explanation
        - Determine if user should submit new report or update existing one

        RETURN ONLY VALID MATCHING THIS JSON SCHEMA:
        {
          "duplicates": [
            {
              "reportId": "string (Firestore document ID)",
              "similarityScore": number (0-100),
              "suggestion": "string explaining why these are similar"
            }
          ],
          "isLikelyDuplicate": boolean (true if ANY similarityScore >= 80),
          "recommendation": "string (either 'submit_new' or 'update_existing:<reportId>')"
        }

        RULES:
        - Only consider reports with similarityScore >= 60 as potential duplicates
        - Be conservative - when in doubt, recommend submitting new report
        - Focus on semantic meaning, not just exact text matches
        - Consider location proximity as part of similarity assessment
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              duplicates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    reportId: { type: Type.STRING },
                    similarityScore: { type: Type.NUMBER },
                    suggestion: { type: Type.STRING },
                  },
                  required: ["reportId", "similarityScore", "suggestion"],
                },
              },
              isLikelyDuplicate: { type: Type.BOOLEAN },
              recommendation: { type: Type.STRING },
            },
            required: ["duplicates", "isLikelyDuplicate", "recommendation"],
          },
        },
      });

      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      console.error("AI duplicate check failed:", error);
      // Return safe default - allow submission
      return {
        duplicates: [],
        isLikelyDuplicate: false,
        recommendation: "submit_new",
      };
    }
  };

  // Handle form submission with duplicate check, image upload, and AI analysis
  const handleDuplicatedSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!description.trim()) {
      alert("Please describe the issue");
      return;
    }

    if (!location) {
      alert("Please get your location first");
      return;
    }

    // If we haven't checked for duplicates yet, do it now
    if (!checkedForDuplicates) {
      await checkForDuplicates();
      // Removed the 1-second wait hack - after await, duplicateCheckRunning is false
    }

    // If duplicates found and user hasn't overridden, show warning
    if (showDuplicateWarning && potentialDuplicates.length > 0) {
      // Show confirmation dialog
      if (
        !window.confirm(
          `Similar reports found nearby. ${potentialDuplicates[0].suggestion}\n\nSubmit anyway?`
        )
      ) {
        return;
      }
    }

    // Reset duplicate check state for next submission
    setCheckedForDuplicates(false);
    setShowDuplicateWarning(false);

    try {
      // Set submission state
      setSubmitRunning(true);

      // Upload image if present
      let finalImageUrl = null;
      if (imageFile) {
        setUploadingImage(true);
        try {
          finalImageUrl = await uploadImage(imageFile);
        } finally {
          setUploadingImage(false);
        }
      }

      // Perform AI analysis (with image if available)
      const aiAnalysisResult = finalImageUrl
        ? await analyzeReportWithImage(description, finalImageUrl)
        : await analyzeReport(description);

      // Store the AI analysis for review
      setAiAnalysis(aiAnalysisResult);
      setShowAiReview(true);
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setSubmitRunning(false);
    }
  };

  // Handle submission from AI analysis review
  const handleAiReviewSubmit = async (reviewedAnalysis) => {
    try {
      setSubmitRunning(true);

      // Prepare report data with both AI suggestion and final decision
      const reportData = {
        description,
        category: reviewedAnalysis.category, // What user ultimately selected
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        imageUrl: imageUrl,
        // Store both AI suggestion and final decision for audit trail
        ai: {
          ...aiAnalysis, // Original AI suggestion
          finalCategory: reviewedAnalysis.category, // What was actually submitted
          finalPriority: reviewedAnalysis.priority,
          userOverride: reviewedAnalysis.userEdited, // Whether user overrode AI
          userJustification: reviewedAnalysis.editReason, // User's explanation if overridden
          // Keep original fields for backward compatibility
          category: aiAnalysis.category,
          department: aiAnalysis.department,
          priority: aiAnalysis.priority,
          summary: aiAnalysis.summary,
          confidence: aiAnalysis.confidence,
          imageDescriptionAlignment: aiAnalysis.imageDescriptionAlignment,
          authenticityAssessment: aiAnalysis.authenticityAssessment,
          visibleHazards: aiAnalysis.visibleHazards,
          severityEstimate: aiAnalysis.severityEstimate,
          priorityExplanation: aiAnalysis.priorityExplanation,
          recommendedDepartment: aiAnalysis.recommendedDepartment,
          urgencyIndicators: aiAnalysis.urgencyIndicators,
        },
      };

      // Add report to Firestore
      await addReport(reportData);

      // Reset form
      setDescription("");
      setCategory(""); // Reset category dropdown
      setImageFile(null);
      setImageUrl(null);
      setImageError(null);

      // Close drawer and reset review state
      setDrawerOpen(false);
      setShowAiReview(false);
      setAiAnalysis(null);

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

  // Handle cancellation from AI analysis review
  const handleAiReviewCancel = () => {
    setShowAiReview(false);
    setAiAnalysis(null);
  };

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setImageError('Please select an image file');
        setImageFile(null);
        setImageUrl(null);
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image file too large (max 5MB)');
        setImageFile(null);
        setImageUrl(null);
        return;
      }

      setImageFile(file);
      setImageError(null);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    } else {
      setImageFile(null);
      setImageUrl(null);
      setImageError(null);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImageUrl(null);
    setImageError(null);
    // Revoke object URL to prevent memory leaks
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  };

  return (
    <div
      className={`ds-drawer h-[70vh] ${
        duplicateCheckRunning || showDuplicateWarning || uploadingImage || drawerOpen
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
                    // Proceed with submission after acknowledging
                    handleDuplicatedSubmit(new Event("submit"));
                  }}
                  className="ds-btn" style={{ height: "32px", fontSize: "12px", padding: "0 12px", backgroundColor: "var(--color-amber)", color: "#fff" }}
                >
                  Continue Anyway
                </button>
                <button
                  onClick={() => setShowDuplicateWarning(false)}
                  className="ds-btn ds-btn-secondary" style={{ height: "32px", fontSize: "12px", padding: "0 12px", borderColor: "var(--color-amber)", color: "var(--color-amber)" }}
                >
                  Review Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator for submission process */}
      {submitRunning && !showDuplicateWarning && !uploadingImage && (
        <div style={{ padding: "16px", backgroundColor: "var(--color-primary-pastel)", borderLeft: "4px solid var(--color-primary)", margin: "0 24px 16px", textAlign: "center" }}>
          <div className="ds-flex-center" style={{ gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite", color: "var(--color-primary)" }}>sync</span>
            <span className="ds-body" style={{ color: "var(--color-primary)", fontWeight: "var(--font-weight-medium)" }}>Submitting report...</span>
          </div>
        </div>
      )}

      {/* Image upload progress */}
      {uploadingImage && !showDuplicateWarning && (
        <div style={{ padding: "16px", backgroundColor: "var(--color-teal-pastel)", borderLeft: "4px solid var(--color-teal)", margin: "0 24px 16px", textAlign: "center" }}>
          <div className="ds-flex-center" style={{ gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ animation: "ds-skeleton-shimmer 1.5s infinite", color: "var(--color-teal)" }}>cloud_upload</span>
            <span className="ds-body" style={{ color: "var(--color-teal)", fontWeight: "var(--font-weight-medium)" }}>Uploading image...</span>
          </div>
        </div>
      )}

    {/* Image error */}
    {imageError && (
      <div style={{ padding: "16px", backgroundColor: "var(--color-error-pastel)", borderLeft: "4px solid var(--color-error)", margin: "0 24px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-error)" }}>error</span>
          <span className="ds-body" style={{ color: "var(--color-error)" }}>{imageError}</span>
        </div>
      </div>
    )}

    {/* Scrollable Content */}
    <div className="overflow-y-auto" style={{ height: "calc(70vh - 75px)", padding: "24px" }}>
      {/* Show AI Review screen if active */}
      {showAiReview && aiAnalysis && (
        <AIAnalysisReview
          description={description}
          imageUrl={imageUrl}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="ds-textarea"
            />
          </div>

          {/* Category */}
          <div>
            <label className="ds-input-label">
              Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

          {/* Image Upload Section */}
          <div>
            <label className="ds-input-label">
              Add Photo (Optional)
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Image Preview/Upload */}
              <div style={{ border: "2px dashed var(--color-input-border)", borderRadius: "var(--radius-card)", padding: "16px", textAlign: "center", cursor: "pointer", transition: "border-color 150ms ease" }}
                   onClick={() => document.getElementById('imageUpload').click()}
                   onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                   onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-input-border)'}
                   >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain", borderRadius: "8px" }}
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--color-text-secondary)" }}>cloud_upload</span>
                    <p className="ds-body" style={{ color: "var(--color-text-secondary)", margin: 0 }}>Click to upload or drag & drop</p>
                    <p className="ds-label" style={{ margin: 0 }}>Max 5MB • JPG, PNG, GIF</p>
                  </div>
                )}
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>

              {/* Image controls */}
              {imageUrl && (
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    onClick={handleRemoveImage}
                    className="ds-btn ds-btn-danger"
                    style={{ height: "32px", padding: "0 12px", fontSize: "12px" }}
                  >
                    Remove
                  </button>
                </div>
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
              disabled={submitRunning || uploadingImage}
              className="ds-btn ds-btn-primary"
            >
              {submitRunning || uploadingImage ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}