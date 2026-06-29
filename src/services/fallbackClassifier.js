export function runLocalFallback(description) {
  const lowerDesc = (description || "").toLowerCase();

  // Default mappings (Unknown issues -> General Civic Issue)
  // Mapped to valid allowed categories/departments per normalizeAnalysis
  let category = "Other";
  let department = "BBMP Sanitation"; 
  let priority = "Medium";

  if (/(road|pothole|asphalt)/.test(lowerDesc)) {
    category = "Road";
    department = "BBMP Roads";
    priority = "High";
  } else if (/(garbage|waste|trash)/.test(lowerDesc)) {
    category = "Garbage";
    department = "BBMP Sanitation";
    priority = "Medium";
  } else if (/(water|leakage|pipe)/.test(lowerDesc)) {
    category = "Water";
    department = "BWSSB";
    priority = "High";
  } else if (/(streetlight|lighting|power)/.test(lowerDesc)) {
    category = "Electricity";
    department = "BESCOM";
    priority = "Medium";
  } else if (/(drain|sewage|sewer)/.test(lowerDesc)) {
    category = "Drainage";
    // Usually BWSSB handles drainage in Bangalore
    department = "BWSSB";
    priority = "High";
  } else if (/(tree|fallen tree|branch)/.test(lowerDesc)) {
    category = "Other";
    department = "BBMP Sanitation"; // Parks/Forestry usually falls under BBMP
    priority = "Medium";
  }

  // Return the exact same object structure that Gemini would return
  return {
    category,
    department,
    priority,
    summary: `Report regarding ${category.toLowerCase()} issue (Local Fallback Analysis)`,
    confidence: 100, // Deterministic keyword match
    imageDescriptionAlignment: "Unable to assess",
    authenticityAssessment: "Unable to assess",
    visibleHazards: [],
    severityEstimate: priority === "High" ? "High" : "Medium",
    priorityExplanation: "Priority assigned via local deterministic fallback mapping.",
    recommendedDepartment: department,
    urgencyIndicators: [],
  };
}
