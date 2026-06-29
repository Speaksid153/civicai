import { useState } from "react";

const AIAnalysisReview = ({
  description,
  imageUrl,
  aiAnalysis,
  onSubmit,
  onCancel
}) => {
  const [editedCategory, setEditedCategory] = useState("");
  const [editedPriority, setEditedPriority] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Determine if user actually edited anything
      const userEdited = editedCategory !== aiAnalysis.category || editedPriority !== aiAnalysis.priority;
      const editReason = userEdited ? "User reviewed and adjusted AI analysis" : "User accepted AI analysis";

      await onSubmit({
        ...aiAnalysis,
        category: editedCategory || aiAnalysis.category,
        priority: editedPriority || aiAnalysis.priority,
        userEdited,
        editReason
      });
    } catch (error) {
      console.error("Error submitting reviewed analysis:", error);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit toggle
  const handleEditToggle = () => {
    if (!isEditing) {
      // When entering edit mode, initialize from AI values
      setEditedCategory(aiAnalysis.category || "");
      setEditedPriority(aiAnalysis.priority || "");
    }
    setIsEditing(!isEditing);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "24px" }}>
      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "32px", marginBottom: "8px" }}>
          auto_awesome
        </span>
        <h3 className="ds-title">
          Gemini AI Analysis
        </h3>
        <p className="ds-body ds-secondary">
          Review the automated assessment of your submission.
        </p>
      </div>

      {/* Original Description */}
      <div className="ds-card-inset">
        <div className="ds-flex-center" style={{ gap: "8px", marginBottom: "8px" }}>
          <span className="material-symbols-outlined ds-secondary" style={{ fontSize: "18px" }}>description</span>
          <span className="ds-label ds-secondary">ORIGINAL DESCRIPTION</span>
        </div>
        <p className="ds-body">
          {description}
        </p>
      </div>

      {/* Image Ref (Optional visual context) */}
      {imageUrl && (
        <div style={{ width: "100%", height: "200px", borderRadius: "var(--radius-card)", overflow: "hidden", border: "1px solid var(--color-divider)" }}>
          <img
            className="object-cover w-full h-full"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt="Uploaded image for analysis"
            src={imageUrl}
          />
        </div>
      )}

      {/* Bento Grid of Findings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        
        {/* AI Confidence */}
        <div className="ds-card">
          <div className="ds-flex-center" style={{ gap: "8px", marginBottom: "8px" }}>
            <span className="material-symbols-outlined ds-secondary" style={{ fontSize: "18px" }}>psychology</span>
            <span className="ds-label ds-secondary">AI CONFIDENCE</span>
          </div>
          <div className="ds-flex-between" style={{ alignItems: "baseline" }}>
            <span style={{ fontSize: "24px", fontWeight: "var(--font-weight-bold)", color: "var(--color-text-primary)" }}>
              {aiAnalysis.confidence}%
            </span>
            <span className="ds-badge ds-badge-resolved">
              High Confidence
            </span>
          </div>
        </div>

        {/* Suggested Priority */}
        <div className="ds-card">
          <div className="ds-flex-center" style={{ gap: "8px", marginBottom: "8px" }}>
            <span className="material-symbols-outlined ds-secondary" style={{ fontSize: "18px" }}>priority_high</span>
            <span className="ds-label ds-secondary">SUGGESTED PRIORITY</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "20px", fontWeight: "var(--font-weight-bold)", color: (editedPriority || aiAnalysis.priority) === "High" ? "var(--color-error)" : "var(--color-text-primary)" }}>
              {editedPriority || aiAnalysis.priority}
            </span>
            <span className="ds-body ds-secondary" style={{ fontSize: "12px", marginTop: "4px" }}>
              {aiAnalysis.priorityExplanation}
            </span>
          </div>
        </div>

        {/* Hazard List */}
        <div className="ds-card" style={{ gridColumn: "1 / -1" }}>
          <div className="ds-flex-center" style={{ gap: "8px", marginBottom: "12px" }}>
            <span className="material-symbols-outlined ds-secondary" style={{ fontSize: "18px" }}>warning</span>
            <span className="ds-label ds-secondary">IDENTIFIED HAZARDS</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(aiAnalysis.visibleHazards || []).map((hazard, index) => (
              <span key={index} className="ds-chip ds-chip-active">
                {hazard.charAt(0).toUpperCase() + hazard.slice(1).replace(/_/g, " ")}
              </span>
            ))}
            {(!aiAnalysis.visibleHazards || aiAnalysis.visibleHazards.length === 0) && (
              <span className="ds-body ds-secondary">None identified</span>
            )}
          </div>
        </div>

        {/* Routing */}
        <div className="ds-card" style={{ gridColumn: "1 / -1" }}>
          <div className="ds-flex-between" style={{ marginBottom: "12px" }}>
            <div className="ds-flex-center" style={{ gap: "8px" }}>
              <span className="material-symbols-outlined ds-secondary" style={{ fontSize: "18px" }}>route</span>
              <span className="ds-label ds-secondary">ROUTING DESTINATION</span>
            </div>
            <span className="ds-label ds-secondary">AUTOMATIC</span>
          </div>
          <div className="ds-card-inset ds-flex-center" style={{ gap: "12px", padding: "12px 16px" }}>
            <span className="material-symbols-outlined" style={{ color: "var(--color-primary)" }}>account_balance</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span className="ds-body" style={{ fontWeight: "var(--font-weight-medium)" }}>
                {aiAnalysis.department || "Unknown Department"}
              </span>
              <span className="ds-body ds-secondary" style={{ fontSize: "12px" }}>
                {aiAnalysis.department ? "Suggested Assignment" : "Pending Assignment"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <hr className="ds-divider" />

      {/* Audit Section */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 className="ds-title" style={{ textAlign: "center" }}>
          Do you accept this analysis?
        </h3>
        <p className="ds-body ds-secondary" style={{ textAlign: "center", maxWidth: "400px", margin: "0 auto" }}>
          Confirming this data ensures it reaches the correct department quickly. You can adjust the details if the AI missed something.
        </p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleEditToggle}
              disabled={isSubmitting}
              className="ds-btn ds-btn-secondary"
            >
              <span className="material-symbols-outlined">edit</span>
              {isEditing ? "Save Changes" : "Adjust Details"}
            </button>
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="ds-btn ds-btn-secondary"
            >
              <span className="material-symbols-outlined">cancel</span>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="ds-btn ds-btn-primary"
            >
              <span className="material-symbols-outlined">check_circle</span>
              {isSubmitting ? "Submitting..." : "Accept & Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisReview;