export const reportCategories = [
  "Road",
  "Garbage",
  "Water",
  "Electricity",
  "Drainage",
  "Other",
];

export const reportStatuses = [
  "pending",
  "assigned",
  "resolved",
  "archived",
];

export function getReportTimestamp(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value) {
  const date = getReportTimestamp(value);

  if (!date) return "Not available";

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatDateInput(value) {
  const date = getReportTimestamp(value);

  if (!date) return "";

  return date.toISOString().slice(0, 10);
}

export function formatDateTimeLocal(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offsetMs)
    .toISOString()
    .slice(0, 16);
}
