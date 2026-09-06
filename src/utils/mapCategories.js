export const categoryMarkerStyles = {
  Road: { color: "#b91c1c", background: "#fee2e2", label: "R" },
  Garbage: { color: "#166534", background: "#dcfce7", label: "G" },
  Water: { color: "#0369a1", background: "#e0f2fe", label: "W" },
  Electricity: { color: "#92400e", background: "#fef3c7", label: "E" },
  Drainage: { color: "#7e22ce", background: "#f3e8ff", label: "D" },
  Other: { color: "#475569", background: "#e2e8f0", label: "O" },
};

export function getCategoryMarkerStyle(category) {
  return categoryMarkerStyles[category] || categoryMarkerStyles.Other;
}

const departmentCategories = {
  "BBMP Roads": "Road",
  "BBMP Sanitation": "Garbage",
  BWSSB: "Water",
  BESCOM: "Electricity",
  "BBMP Drainage": "Drainage",
  "BBMP Citizen Services": "Other",
  "Traffic Police": "Road",
};

export function getDepartmentMarkerStyle(department) {
  return getCategoryMarkerStyle(departmentCategories[department] || "Other");
}
