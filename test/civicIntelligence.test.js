import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeReport,
  buildMatchSignals,
  buildOperationalInsights,
  buildWeeklyReport,
} from "../src/services/civicIntelligence.js";
import { getResolutionRate, isSyntheticReport } from "../src/utils/analytics.js";
import { buildLifecycleDemoReports } from "../src/services/demoLifecycleData.js";

test("routes common civic descriptions without a remote model", () => {
  const road = analyzeReport("A deep pothole is blocking traffic outside the school");
  assert.equal(road.category, "Road");
  assert.equal(road.department, "BBMP Roads");
  assert.equal(road.priority, "High");
  assert.equal(road.engine, "local-rules-v1");

  const electricity = analyzeReport("A live wire is hanging from the power line");
  assert.equal(electricity.category, "Electricity");
  assert.equal(electricity.department, "BESCOM");
  assert.equal(electricity.priority, "Critical");

  const cases = [
    ["Garbage is overflowing from the waste bin", "Garbage", "BBMP Sanitation"],
    ["A water leak from a burst pipeline is flooding the lane", "Water", "BWSSB"],
    ["An open manhole and sewage overflow are blocking the drain", "Drainage", "BWSSB"],
    ["A fallen tree branch has damaged the public park", "Other", "BBMP Sanitation"],
  ];
  for (const [description, category, department] of cases) {
    const result = analyzeReport(description);
    assert.equal(result.category, category);
    assert.equal(result.department, department);
  }
});

test("uses deterministic priority rules and privacy-safe match signals", () => {
  assert.equal(analyzeReport("A small faded speed breaker marking").priority, "Low");
  assert.equal(analyzeReport("A streetlight is not working").priority, "Medium");

  const signals = buildMatchSignals("Private landmark details beside a deep pothole");
  assert.ok(signals.length <= 24);
  assert.ok(signals.every((signal) => /^[a-f0-9]{8}$/.test(signal)));
  assert.equal(signals.some((signal) => signal.includes("landmark")), false);
});

test("detects a strong nearby duplicate from sanitized match terms", () => {
  const description = "Large garbage dump with rotting waste beside the market";
  const result = analyzeReport(description, [{
    id: "nearby-1",
    category: "Garbage",
    matchSignals: buildMatchSignals("Rotting garbage waste dump beside market"),
  }]);

  assert.equal(result.isLikelyDuplicate, true);
  assert.equal(result.duplicates[0].reportId, "nearby-1");
  assert.ok(result.duplicates[0].similarityScore >= 78);
});

test("builds reproducible operational and weekly summaries", () => {
  const createdAt = new Date("2026-08-10T10:00:00+05:30");
  const resolvedAt = new Date("2026-08-11T10:00:00+05:30");
  const reports = [
    { category: "Road", assignedDepartment: "BBMP Roads", status: "resolved", createdAt, resolvedAt },
    { category: "Road", assignedDepartment: "BBMP Roads", status: "pending", createdAt },
    { category: "Water", assignedDepartment: "BWSSB", status: "archived", createdAt, resolvedAt },
  ];

  const insights = buildOperationalInsights(reports);
  assert.match(insights.executiveSummary, /Road/);
  assert.equal(insights.hotspots[0].area, "Road");

  const weekly = buildWeeklyReport(reports, "10–16 Aug 2026");
  assert.equal(weekly.keyMetrics.totalReports, 3);
  assert.equal(weekly.keyMetrics.byCategory.Road, 2);
  assert.ok(weekly.recommendations.length >= 2);
});

test("compares the two latest calendar months rather than the largest counts", () => {
  const reports = [
    ...Array.from({ length: 10 }, () => ({ category: "Road", status: "pending", createdAt: new Date("2026-02-10T00:00:00Z") })),
    ...Array.from({ length: 2 }, () => ({ category: "Water", status: "resolved", createdAt: new Date("2026-03-10T00:00:00Z") })),
    { category: "Garbage", status: "pending", createdAt: new Date("2026-01-10T00:00:00Z") },
  ];

  const insights = buildOperationalInsights(reports);
  assert.equal(insights.trends[0].dataPoint, "2 reports in 2026-03 versus 10 in 2026-02");
  assert.match(insights.trends[0].insight, /80%/);
});

test("weekly peak intake uses submission day, not resolution day", () => {
  const reports = [{
    category: "Road",
    status: "resolved",
    createdAt: new Date("2026-08-10T10:00:00Z"),
    resolvedAt: new Date("2026-08-15T10:00:00Z"),
  }];

  const weekly = buildWeeklyReport(reports, "9–15 Aug 2026");
  assert.equal(weekly.trends[0].change, "1 report on 2026-08-10");
});

test("labels demo records and calculates the planned proof dataset honestly", () => {
  assert.equal(isSyntheticReport({ matchSignals: ["synthetic-demo"] }), true);
  assert.equal(isSyntheticReport({ description: "[SYNTHETIC DEMO — NOT A REAL COMPLAINT] Example" }), true);
  assert.equal(isSyntheticReport({ matchSignals: ["a1b2c3d4"] }), false);

  const reports = [
    ...Array.from({ length: 15 }, () => ({ status: "pending" })),
    ...Array.from({ length: 12 }, () => ({ status: "assigned" })),
    ...Array.from({ length: 20 }, () => ({ status: "resolved" })),
    ...Array.from({ length: 13 }, () => ({ status: "archived" })),
  ];

  assert.equal(getResolutionRate(reports), 55);

  const lifecycle = buildLifecycleDemoReports(new Date("2026-09-06T12:00:00Z"));
  assert.equal(lifecycle.length, 48);
  assert.equal(lifecycle.filter((item) => item.status === "resolved").length, 20);
  assert.equal(lifecycle.filter((item) => item.status === "archived").length, 13);
  assert.ok(lifecycle.every((item) => item.privateReport.description.startsWith("[SYNTHETIC DEMO")));
  const lifecycleSpanDays = (
    lifecycle[0].privateReport.createdAt.getTime()
    - lifecycle.at(-1).privateReport.createdAt.getTime()
  ) / 86_400_000;
  assert.ok(lifecycleSpanDays >= 60);

  const combined = [
    ...Array.from({ length: 12 }, () => ({ status: "pending" })),
    ...lifecycle,
  ];
  assert.equal(combined.length, 60);
  assert.equal(combined.filter((item) => item.status === "pending").length, 15);
  assert.equal(getResolutionRate(combined), 55);
});
