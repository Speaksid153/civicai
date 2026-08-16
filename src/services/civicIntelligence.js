import {
  formatDuration,
  getAverageResolutionTime,
  getReportsByCategory,
  getReportsByDay,
  getReportsByDepartment,
  getReportsByMonth,
  getReportsByStatus,
  getResolutionRate,
} from "../utils/analytics.js";

const STOP_WORDS = new Set([
  "about", "after", "again", "been", "being", "from", "have", "into",
  "near", "that", "their", "there", "these", "this", "very", "with",
  "road", "issue", "problem", "please", "reported",
]);

const CATEGORY_RULES = [
  {
    category: "Road",
    department: "BBMP Roads",
    terms: ["pothole", "crater", "asphalt", "footpath", "pavement", "road damage", "broken road", "speed breaker"],
  },
  {
    category: "Garbage",
    department: "BBMP Sanitation",
    terms: ["garbage", "trash", "rubbish", "waste", "dump", "litter", "collection", "stinking", "debris"],
  },
  {
    category: "Water",
    department: "BWSSB",
    terms: ["water leak", "water supply", "pipeline", "pipe burst", "no water", "contaminated water", "tap water", "leakage"],
  },
  {
    category: "Electricity",
    department: "BESCOM",
    terms: ["streetlight", "street light", "power cut", "electric", "electricity", "transformer", "live wire", "power line", "dark street"],
  },
  {
    category: "Drainage",
    department: "BWSSB",
    terms: ["drain", "drainage", "sewage", "sewer", "manhole", "flooding", "waterlogging", "overflow", "stagnant water"],
  },
  {
    category: "Other",
    department: "BBMP Sanitation",
    terms: ["fallen tree", "tree branch", "stray animal", "public toilet", "encroachment", "park damage"],
  },
];

const URGENCY_RULES = [
  { level: "Critical", pattern: /\b(live wire|electrocut|fire|collapsed|collapse|fatal|life threatening|gas leak)\b/i },
  { level: "Critical", pattern: /\b(sewage|flood(?:ing|ed)?)\b.*\b(home|house|hospital|school)\b/i },
  { level: "High", pattern: /\b(accident|injur(?:y|ed)|dangerous|deep pothole|burst pipe|blocked road|overflowing|major|urgent|hospital|school zone)\b/i },
  { level: "Low", pattern: /\b(minor|small|cosmetic|faded|slightly)\b/i },
];

const HAZARD_RULES = [
  ["electrical hazard", /\b(live wire|electric|transformer|power line|electrocut)\b/i],
  ["traffic obstruction", /\b(blocked road|blocking traffic|traffic obstruction|cannot pass)\b/i],
  ["injury risk", /\b(dangerous|injur(?:y|ed)|accident|deep pothole|open manhole)\b/i],
  ["flooding risk", /\b(flood(?:ing|ed)?|waterlogging|overflowing drain)\b/i],
  ["public health risk", /\b(sewage|contaminated|stagnant water|rotting garbage|stinking)\b/i],
];

export function extractMatchTerms(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ");

  return [...new Set(normalized.split(/\s+/).filter((term) => term.length >= 3 && !STOP_WORDS.has(term)))].slice(0, 24);
}

function hashTerm(term) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < term.length; index += 1) {
    hash ^= term.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function buildMatchSignals(value) {
  return extractMatchTerms(value).map(hashTerm);
}

function countRuleMatches(text, terms) {
  return terms.reduce((score, term) => {
    if (!text.includes(term)) return score;
    return score + (term.includes(" ") ? 3 : 2);
  }, 0);
}

function classifyDescription(description) {
  const text = String(description || "").trim().toLowerCase();
  const ranked = CATEGORY_RULES
    .map((rule) => ({ ...rule, score: countRuleMatches(text, rule.terms) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const runnerUp = ranked[1];

  if (!best || best.score === 0) {
    return { category: "Other", department: "BBMP Sanitation", confidence: 30 };
  }

  const margin = best.score - (runnerUp?.score || 0);
  const confidence = Math.min(96, 58 + best.score * 5 + margin * 4);
  return { category: best.category, department: best.department, confidence };
}

function assessPriority(description) {
  const match = URGENCY_RULES.find((rule) => rule.pattern.test(description));
  const priority = match?.level || "Medium";
  const explanation = match
    ? `${priority} priority because the description contains a recognized ${priority.toLowerCase()}-risk indicator.`
    : "Medium priority pending authority review; no explicit emergency indicator was detected.";

  return { priority, explanation };
}

function summarize(description, category) {
  const clean = String(description || "").replace(/\s+/g, " ").trim();
  if (!clean) return `${category} issue submitted for authority review.`;
  const clipped = clean.length > 150 ? `${clean.slice(0, 147).trim()}...` : clean;
  return `${category} issue: ${clipped}`;
}

function similarityScore(descriptionSignals, report, category) {
  const candidateSignals = new Set(
    Array.isArray(report.matchSignals)
      ? report.matchSignals.map(String)
      : buildMatchSignals(report.description),
  );
  const sourceSignals = new Set(descriptionSignals);
  if (sourceSignals.size === 0 || candidateSignals.size === 0) return 0;

  const intersection = [...sourceSignals].filter((signal) => candidateSignals.has(signal)).length;
  const union = new Set([...sourceSignals, ...candidateSignals]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(sourceSignals.size, candidateSignals.size);
  const reportCategory = report.category || report.analysis?.category || report.ai?.category;
  const categoryBoost = reportCategory === category ? 12 : 0;
  return Math.min(100, Math.round(jaccard * 52 + containment * 36 + categoryBoost));
}

export function analyzeReport(description, nearbyReports = []) {
  const classification = classifyDescription(description);
  const priority = assessPriority(description);
  const visibleHazards = HAZARD_RULES
    .filter(([, pattern]) => pattern.test(description))
    .map(([label]) => label);
  const urgencyIndicators = URGENCY_RULES
    .filter((rule) => rule.pattern.test(description))
    .map((rule) => rule.level.toLowerCase());
  const matchSignals = buildMatchSignals(description);

  const duplicates = nearbyReports
    .map((report) => {
      const score = similarityScore(matchSignals, report, classification.category);
      return {
        reportId: report.id,
        similarityScore: score,
        suggestion: `Nearby ${report.category || classification.category} report has ${score}% text overlap`,
      };
    })
    .filter((item) => item.similarityScore >= 55)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  return {
    duplicates,
    isLikelyDuplicate: duplicates.some((item) => item.similarityScore >= 78),
    recommendation: duplicates.some((item) => item.similarityScore >= 78)
      ? `update_existing:${duplicates[0].reportId}`
      : "submit_new",
    ...classification,
    priority: priority.priority,
    summary: summarize(description, classification.category),
    imageDescriptionAlignment: "Not assessed",
    authenticityAssessment: "Not assessed",
    visibleHazards,
    severityEstimate: priority.priority,
    priorityExplanation: priority.explanation,
    recommendedDepartment: classification.department,
    urgencyIndicators,
    matchSignals,
    engine: "local-rules-v1",
  };
}

function sortedEntries(counts) {
  return Object.entries(counts).sort(([, a], [, b]) => b - a);
}

function groupBy(reports, getKey) {
  return reports.reduce((groups, report) => {
    const key = getKey(report) || "Unspecified";
    (groups[key] ||= []).push(report);
    return groups;
  }, {});
}

function workloadLabel(count, total) {
  const share = total ? count / total : 0;
  if (share >= 0.4) return "High";
  if (share >= 0.2) return "Medium";
  return "Low";
}

export function buildOperationalInsights(reports) {
  const byCategory = getReportsByCategory(reports);
  const byDepartment = getReportsByDepartment(reports);
  const byMonth = Object.entries(getReportsByMonth(reports))
    .sort(([monthA], [monthB]) => monthA.localeCompare(monthB));
  const topCategories = sortedEntries(byCategory).slice(0, 3);
  const departmentGroups = groupBy(reports, (report) => report.assignedDepartment || report.analysis?.department || report.ai?.department);
  const resolutionRate = getResolutionRate(reports);
  const averageTime = formatDuration(getAverageResolutionTime(reports));

  const executiveSummary = reports.length
    ? `${reports.length} civic reports were analyzed locally. ${topCategories[0]?.[0] || "Unspecified"} is the largest category, and the recorded resolution rate is ${resolutionRate}% with an average completion time of ${averageTime}.`
    : "No civic reports are available for operational analysis.";

  const trends = [];
  if (byMonth.length >= 2) {
    const [previous, latest] = byMonth.slice(-2);
    const change = previous[1] ? Math.round(((latest[1] - previous[1]) / previous[1]) * 100) : 0;
    trends.push({
      trend: change >= 0 ? "Report volume increased" : "Report volume decreased",
      dataPoint: `${latest[1]} reports in ${latest[0]} versus ${previous[1]} in ${previous[0]}`,
      insight: `${Math.abs(change)}% month-over-month change; verify staffing against the current intake.`,
    });
  }

  return {
    executiveSummary,
    hotspots: topCategories.map(([category, count], index) => ({
      area: category,
      issueType: category,
      severity: index === 0 && count >= Math.max(3, reports.length * 0.35) ? "High" : index < 2 ? "Medium" : "Low",
      description: `${count} report${count === 1 ? "" : "s"} in this category.`,
    })),
    trends,
    departmentInsights: sortedEntries(byDepartment).map(([department, count]) => {
      const departmentReports = departmentGroups[department] || [];
      return {
        department,
        workload: workloadLabel(count, reports.length),
        avgResolutionTime: formatDuration(getAverageResolutionTime(departmentReports)),
        suggestion: `${count} report${count === 1 ? "" : "s"} handled; review unresolved ageing and staffing before the next cycle.`,
      };
    }),
    recommendations: [
      topCategories[0] ? `Prioritize preventive work for ${topCategories[0][0]}, which accounts for ${topCategories[0][1]} reports.` : null,
      resolutionRate < 80 ? `Reduce the unresolved backlog; the current recorded resolution rate is ${resolutionRate}%.` : "Maintain the current closure rate and audit a sample of resolved reports for quality.",
      "Review rule-engine overrides monthly and update keywords when citizens use new local terminology.",
    ].filter(Boolean),
    priorityAreas: topCategories.slice(0, 2).map(([category, count], index) => ({
      area: category,
      priorityLevel: index === 0 ? "High" : "Medium",
      reason: `${count} report${count === 1 ? "" : "s"}, ranked #${index + 1} by volume.`,
    })),
  };
}

export function buildWeeklyReport(reports, weekLabel) {
  const byCategory = getReportsByCategory(reports);
  const byDepartment = getReportsByDepartment(reports);
  const byStatus = getReportsByStatus(reports);
  const byDay = getReportsByDay(reports);
  const resolutionRate = getResolutionRate(reports);
  const averageTime = formatDuration(getAverageResolutionTime(reports));
  const topCategory = sortedEntries(byCategory)[0];
  const busiestDay = sortedEntries(byDay)[0];
  const departmentGroups = groupBy(reports, (report) => report.assignedDepartment || report.analysis?.department || report.ai?.department);
  const categoryGroups = groupBy(reports, (report) => report.category || report.analysis?.category || report.ai?.category);

  return {
    executiveSummary: reports.length
      ? `${reports.length} civic report${reports.length === 1 ? " was" : "s were"} recorded for ${weekLabel}. ${topCategory?.[0] || "Unspecified"} led volume, while ${resolutionRate}% of reports are recorded as resolved or archived. Average recorded resolution time was ${averageTime}.`
      : `No reports were submitted during ${weekLabel}.`,
    keyMetrics: {
      totalReports: reports.length,
      resolutionRate,
      avgResolutionTime: averageTime,
      byCategory,
      byDepartment,
      byStatus,
    },
    trends: busiestDay ? [{
      trend: "Peak intake day",
      metric: "Reports by day",
      change: `${busiestDay[1]} report${busiestDay[1] === 1 ? "" : "s"} on ${busiestDay[0]}`,
      significance: "Schedule triage coverage around observed intake peaks.",
    }] : [],
    categoryAnalysis: sortedEntries(byCategory).map(([category, count]) => {
      const categoryReports = categoryGroups[category] || [];
      return {
        category,
        reportCount: count,
        resolutionRate: getResolutionRate(categoryReports),
        avgResolutionTime: formatDuration(getAverageResolutionTime(categoryReports)),
        insight: `${Math.round((count / Math.max(1, reports.length)) * 100)}% of weekly intake.`,
      };
    }),
    departmentAnalysis: sortedEntries(byDepartment).map(([department, count]) => {
      const departmentReports = departmentGroups[department] || [];
      const rate = getResolutionRate(departmentReports);
      return {
        department,
        workload: `${count} report${count === 1 ? "" : "s"}`,
        resolutionRate: rate,
        avgResolutionTime: formatDuration(getAverageResolutionTime(departmentReports)),
        performance: rate >= 80 ? "Exceeds" : rate >= 60 ? "Meets" : "Below",
        insight: `${rate}% of assigned weekly reports are recorded as resolved or archived.`,
      };
    }),
    recommendations: [
      topCategory ? `Assign targeted capacity to ${topCategory[0]} cases (${topCategory[1]} this week).` : "Continue public reporting outreach.",
      resolutionRate < 80 ? `Review open cases before the next weekly cycle; recorded completion is ${resolutionRate}%.` : "Audit closure quality while maintaining the current completion rate.",
      "Validate automated routing overrides and update the local rules when a repeated mismatch appears.",
    ],
    priorityAreas: sortedEntries(byCategory).slice(0, 2).map(([category, count], index) => ({
      area: category,
      priorityLevel: index === 0 ? "High" : "Medium",
      reason: `${count} report${count === 1 ? "" : "s"} this week.`,
      suggestedAction: `Review and batch ${category.toLowerCase()} work by location and urgency.`,
    })),
  };
}
