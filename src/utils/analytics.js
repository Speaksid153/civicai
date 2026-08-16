import {
  formatDateInput,
  getReportTimestamp,
} from "./reports.js";

function countBy(reports, getKey) {
  return reports.reduce((totals, report) => {
    const key = getKey(report) || "Unspecified";

    return {
      ...totals,
      [key]: (totals[key] || 0) + 1,
    };
  }, {});
}

export function getReportsByCategory(reports) {
  return countBy(
    reports,
    (report) => report.category || report.analysis?.category || report.ai?.category
  );
}

export function getReportsByDepartment(reports) {
  return countBy(
    reports,
    (report) =>
      report.assignedDepartment || report.analysis?.department || report.ai?.department
  );
}

export function getReportsByStatus(reports) {
  return countBy(reports, (report) => report.status);
}

export function getReportsByDay(reports) {
  return countBy(reports, (report) => formatDateInput(report.createdAt));
}

export function getReportsByMonth(reports) {
  return countBy(reports, (report) => {
    const date = getReportTimestamp(
      report.resolvedAt ||
        report.archivedAt ||
        report.createdAt
    );

    if (!date) return "";

    return date.toISOString().slice(0, 7);
  });
}

export function getAverageResolutionTime(reports) {
  const completedReports = reports
    .map((report) => {
      const createdAt = getReportTimestamp(report.createdAt);
      const resolvedAt = getReportTimestamp(report.resolvedAt);

      if (!createdAt || !resolvedAt) return null;

      const durationMs =
        resolvedAt.getTime() - createdAt.getTime();

      return durationMs > 0 ? durationMs : null;
    })
    .filter(Boolean);

  if (completedReports.length === 0) return null;

  const totalMs = completedReports.reduce(
    (total, duration) => total + duration,
    0
  );

  return totalMs / completedReports.length;
}

export function formatDuration(ms) {
  if (!ms) return "Not available";

  const totalHours = Math.round(ms / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0 && hours > 0) {
    return `${days}d ${hours}h`;
  }

  if (days > 0) {
    return `${days}d`;
  }

  return `${Math.max(1, totalHours)}h`;
}

export function getResolutionRate(reports) {
  if (reports.length === 0) return 0;

  const finished = reports.filter((report) =>
    ["resolved", "archived"].includes(report.status)
  ).length;

  return Math.round((finished / reports.length) * 100);
}
