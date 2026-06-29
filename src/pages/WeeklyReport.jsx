/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, react-hooks/immutability */
import { useEffect, useState } from "react";
import { Type } from "@google/genai";
import { Link } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSkeleton from "../components/LoadingSkeleton";

import {
  getReports,
} from "../services/firebase";
import { ai } from "../services/ai";

import {
  getReportsByCategory,
  getReportsByDepartment,
  getReportsByStatus,
  getReportsByDay,
  getAverageResolutionTime,
  getResolutionRate,
  formatDuration,
} from "../utils/analytics";

import {
  reportCategories,
  getReportTimestamp
} from "../utils/reports";

import {
  departments,
} from "../utils/departments";

import {
  priorities,
} from "../utils/priorities";

import {
  observeAuth,
  getCurrentUser
} from "../services/auth";

import AuthorityNav from "../components/AuthorityNav";
import SearchBar from "../components/SearchBar";

export default function WeeklyReport() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState("");
  const [toast, setToast] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [user, setUser] = useState(null);

  // Get current week and last 4 weeks for selection
  const getWeekDates = () => {
    const today = new Date();
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7));
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

      weeks.push({
        id: `${weekStart.toISOString().slice(0, 10)}_${weekEnd.toISOString().slice(0, 10)}`,
        label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        start: weekStart,
        end: weekEnd
      });
    }
    return weeks;
  };

  useEffect(() => {
    const unsubscribe = observeAuth((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Load all reports for filtering
    (async () => {
      try {
        setLoading(true);
        const allReports = await getReports();
        setReports(allReports);
      } catch (err) {
        console.error("Error loading reports:", err);
        setToast({
          type: "error",
          message: "Failed to load reports.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const weeks = getWeekDates();
  const defaultWeek = weeks[0] ? weeks[0].id : "";

  useEffect(() => {
    if (selectedWeek && reports.length > 0) {
      generateWeeklyReport();
    }
  }, [selectedWeek]);

  const filterReportsByWeek = (reports, weekStart, weekEnd) => {
    return reports.filter(report => {
      const reportDate = getReportTimestamp(report.createdAt);
      if (!reportDate) return false;
      return reportDate >= weekStart && reportDate <= weekEnd;
    });
  };

  async function generateWeeklyReport() {
    setGenerating(true);
    try {
      const selectedWeekObj = weeks.find(w => w.id === selectedWeek);
      if (!selectedWeekObj) {
        setToast({
          type: "error",
          message: "Invalid week selected.",
        });
        return;
      }

      const weekReports = filterReportsByWeek(
        reports,
        selectedWeekObj.start,
        selectedWeekObj.end
      );

      if (weekReports.length === 0) {
        setWeeklyReport({
          executiveSummary: `No reports were submitted during the week of ${selectedWeekObj.label}.`,
          keyMetrics: {
            totalReports: 0,
            resolutionRate: 0,
            avgResolutionTime: "Not available",
            byCategory: {},
            byDepartment: {},
            byStatus: {}
          },
          trends: [],
          categoryAnalysis: [],
          departmentAnalysis: [],
          recommendations: ["Encourage citizens to report issues through the CivicAI app."],
          priorityAreas: []
        });
        setGenerating(false);
        return;
      }

      // Prepare data summary for Gemini
      const stats = {
        totalReports: weekReports.length,
        reportsByCategory: getReportsByCategory(weekReports),
        reportsByDepartment: getReportsByDepartment(weekReports),
        reportsByStatus: getReportsByStatus(weekReports),
        reportsByDay: getReportsByDay(weekReports),
        averageResolutionTime: formatDuration(getAverageResolutionTime(weekReports)),
        resolutionRate: getResolutionRate(weekReports),
        week: selectedWeekObj.label
      };

      // Format stats for AI prompt
      const statsSummary = JSON.stringify(stats, null, 2);

      // Sample reports for context (limit to avoid token limits)
      const sampleReports = weekReports
        .slice(0, 10)
        .map((r) => ({
          description: r.description.substring(0, 100) + (r.description.length > 100 ? "..." : ""),
          category: r.category || r.ai?.category,
          department: r.assignedDepartment || r.ai?.department,
          priority: r.priority || r.ai?.priority,
          status: r.status,
          createdAt: r.createdAt
        }));

      // Call Gemini for weekly report generation
      const aiResponse = await generateWeeklyAIReport(statsSummary, sampleReports, selectedWeekObj.label);
      setWeeklyReport(aiResponse);

    } catch (err) {
      console.error("Error generating weekly report:", err);
      setToast({
        type: "error",
        message: "Failed to generate weekly report.",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function generateWeeklyAIReport(statsSummary, sampleReports, weekLabel) {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("Missing VITE_GEMINI_API_KEY.");
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are an AI assistant generating an executive weekly civic report for city officials. Analyze the following civic issue statistics and sample reports for the week of ${weekLabel} to provide actionable insights.

        WEEKLY STATISTICAL SUMMARY:
        ${statsSummary}

        SAMPLE REPORTS (showing first ${Math.min(sampleReports.length, 10)}):
        ${JSON.stringify(sampleReports, null, 2)}

        Provide a JSON response with the following structure:
        {
          "executiveSummary": "A 3-4 sentence executive summary highlighting key civic situation, trends, and immediate concerns for the week",
          "keyMetrics": {
            "totalReports": number,
            "resolutionRate": number (percentage),
            "avgResolutionTime": "string (e.g., '2.5 days')",
            "byCategory": { "category": count },
            "byDepartment": { "department": count },
            "byStatus": { "status": count }
          },
          "trends": [
            {
              "trend": "Description of significant trend observed",
              "metric": "Which metric shows this trend",
              "change": "Percentage or descriptive change",
              "significance": "Why this trend matters for city officials"
            }
          ],
          "categoryAnalysis": [
            {
              "category": "Category name",
              "reportCount": number,
              "resolutionRate": number (percentage),
              "avgResolutionTime": "string",
              "insight": "Specific insight about this category's performance"
            }
          ],
          "departmentAnalysis": [
            {
              "department": "Department name",
              "workload": "Report count",
              "resolutionRate": number (percentage),
              "avgResolutionTime": "string",
              "performance": "Exceeds/Meets/Below expectations",
              "insight": "Specific insight about department performance"
            }
          ],
          "recommendations": [
            "Specific actionable recommendation 1",
            "Specific actionable recommendation 2",
            "Specific actionable recommendation 3",
            "Specific actionable recommendation 4"
          ],
          "priorityAreas": [
            {
              "area": "Geographic area, category, or department needing attention",
              "priorityLevel": "High/Medium/Low",
              "reason": "Data-driven reason for prioritization",
              "suggestedAction": "Concrete action to take"
            }
          ]
        }

        Rules:
        - Base all insights strictly on the provided data for ${weekLabel}
        - Focus on week-over-week patterns if historical context is available in data
        - Highlight both achievements and areas needing improvement
        - Make recommendations specific, actionable, and department-specific where possible
        - Keep tone professional and executive-appropriate
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              keyMetrics: {
                type: Type.OBJECT,
                properties: {
                  totalReports: { type: Type.INTEGER },
                  resolutionRate: { type: Type.INTEGER },
                  avgResolutionTime: { type: Type.STRING },
                  byCategory: {
                    type: Type.OBJECT,
                    additionalProperties: { type: Type.INTEGER }
                  },
                  byDepartment: {
                    type: Type.OBJECT,
                    additionalProperties: { type: Type.INTEGER }
                  },
                  byStatus: {
                    type: Type.OBJECT,
                    additionalProperties: { type: Type.INTEGER }
                  }
                }
              },
              trends: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trend: { type: Type.STRING },
                    metric: { type: Type.STRING },
                    change: { type: Type.STRING },
                    significance: { type: Type.STRING }
                  },
                  required: ["trend", "metric", "change", "significance"]
                }
              },
              categoryAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    reportCount: { type: Type.INTEGER },
                    resolutionRate: { type: Type.INTEGER },
                    avgResolutionTime: { type: Type.STRING },
                    insight: { type: Type.STRING }
                  },
                  required: ["category", "reportCount", "resolutionRate", "avgResolutionTime", "insight"]
                }
              },
              departmentAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    department: { type: Type.STRING },
                    workload: { type: Type.STRING },
                    resolutionRate: { type: Type.INTEGER },
                    avgResolutionTime: { type: Type.STRING },
                    performance: {
                      type: Type.STRING,
                      enum: ["Exceeds", "Meets", "Below"]
                    },
                    insight: { type: Type.STRING }
                  },
                  required: ["department", "workload", "resolutionRate", "avgResolutionTime", "performance", "insight"]
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              priorityAreas: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    priorityLevel: {
                      type: Type.STRING,
                      enum: ["High", "Medium", "Low"]
                    },
                    reason: { type: Type.STRING },
                    suggestedAction: { type: Type.STRING }
                  },
                  required: ["area", "priorityLevel", "reason", "suggestedAction"]
                }
              }
            },
            required: [
                "executiveSummary",
                "keyMetrics",
                "trends",
                "categoryAnalysis",
                "departmentAnalysis",
                "recommendations",
                "priorityAreas"
              ]
            }
          }
        });

      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      console.error("Gemini weekly report analysis failed:", error);
      // Return fallback report
      return {
        executiveSummary: `Weekly report generation temporarily unavailable for ${weekLabel}. Please try again later or manually review the statistics.`,
        keyMetrics: {
          totalReports: 0,
          resolutionRate: 0,
          avgResolutionTime: "Not available",
          byCategory: {},
          byDepartment: {},
          byStatus: {}
        },
        trends: [],
        categoryAnalysis: [],
        departmentAnalysis: [
          {
            department: "System",
            workload: "N/A",
            resolutionRate: 0,
            avgResolutionTime: "Not available",
            performance: "Below",
            insight: "Weekly report generation system temporarily unavailable"
          }
        ],
        recommendations: ["Try generating the report again in a few minutes"],
        priorityAreas: []
      };
    }
  }

  const selectedWeekObj = weeks.find(w => w.id === selectedWeek);
  const currentIndex = weeks.findIndex(w => w.id === selectedWeek);

  const handlePrevWeek = () => {
    if (currentIndex < weeks.length - 1) {
      setSelectedWeek(weeks[currentIndex + 1].id);
    }
  };

  const handleNextWeek = () => {
    if (currentIndex > 0) {
      setSelectedWeek(weeks[currentIndex - 1].id);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <h2 className="text-gray-500 text-xl">Checking login...</h2>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AuthorityNav user={user} setToast={setToast} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top Bar */}
        <header style={{ height: "72px", backgroundColor: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-divider)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          <div className="hidden md:flex" style={{ flexDirection: "column" }}>
            <h2 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>Weekly Report</h2>
            <p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Executive summary & insights.</p>
          </div>
          
          <div style={{ flex: 1, maxWidth: "480px", margin: "0 24px" }}>
            <SearchBar search={""} setSearch={() => {}} />
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button className="ds-btn-icon" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            {user && (
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "var(--color-primary-pastel)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                {user.email.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          {/* Controls Bar */}
          <div style={{ width: "100%", maxWidth: "860px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button onClick={handlePrevWeek} disabled={currentIndex >= weeks.length - 1} className="ds-btn-icon" style={{ opacity: currentIndex >= weeks.length - 1 ? 0.3 : 1 }}>
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div style={{ fontWeight: "var(--font-weight-medium)", fontSize: "14px" }}>
                {selectedWeekObj ? selectedWeekObj.label : "Select a week"}
              </div>
              <button onClick={handleNextWeek} disabled={currentIndex <= 0} className="ds-btn-icon" style={{ opacity: currentIndex <= 0 ? 0.3 : 1 }}>
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <button onClick={() => window.print()} className="ds-btn ds-btn-secondary">
              <span className="material-symbols-outlined">download</span>
              Export PDF
            </button>
          </div>

          {/* Document Container */}
          <div className="ds-card ds-shadow-card ds-page-enter" style={{ width: "100%", maxWidth: "860px", padding: "48px 64px", backgroundColor: "white", borderRadius: "12px", minHeight: "800px" }}>
            
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                <LoadingSkeleton />
              </div>
            ) : generating ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--color-primary)", animation: "pulse 2s infinite", marginBottom: "16px" }}>auto_awesome</span>
                <h3 className="ds-title" style={{ marginBottom: "8px" }}>Gemini is generating your weekly report...</h3>
                <p className="ds-body ds-secondary">Analyzing civic data and generating insights.</p>
                <div style={{ width: "200px", height: "4px", backgroundColor: "var(--color-divider)", borderRadius: "2px", overflow: "hidden", marginTop: "24px" }}>
                  <div style={{ width: "30%", height: "100%", backgroundColor: "var(--color-primary)", animation: "pulse 1.5s infinite" }} />
                </div>
              </div>
            ) : !weeklyReport || Object.keys(weeklyReport.keyMetrics.byCategory || {}).length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 0", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "64px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>event_busy</span>
                <h3 className="ds-title" style={{ marginBottom: "8px" }}>No reports for this week.</h3>
                <p className="ds-body ds-secondary">Try selecting a different week from the controls above.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
                {/* Document Header */}
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-primary)", margin: "0 0 4px 0" }}>CivicAI Weekly Report</h1>
                  <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 2px 0" }}>{selectedWeekObj?.label}</p>
                  <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0, opacity: 0.8 }}>Bengaluru Municipal Authority</p>
                  <div style={{ height: "1px", backgroundColor: "var(--color-divider)", marginTop: "24px" }} />
                </div>

                {/* Executive Summary */}
                <section className="ds-stagger-item" style={{ animationDelay: "80ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>EXECUTIVE SUMMARY</h2>
                  <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--color-text-primary)", margin: 0 }}>
                    {weeklyReport.executiveSummary}
                  </p>
                </section>

                {/* Key Metrics */}
                <section className="ds-stagger-item" style={{ animationDelay: "160ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>KEY METRICS</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="ds-card-inset" style={{ padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 4px 0" }}>Total Reports</p>
                        <p style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "var(--color-primary)" }}>{weeklyReport.keyMetrics.totalReports}</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--color-primary-pastel)" }}>analytics</span>
                    </div>
                    <div className="ds-card-inset" style={{ padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 4px 0" }}>Resolution Rate</p>
                        <p style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "var(--color-teal)" }}>{weeklyReport.keyMetrics.resolutionRate}%</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--color-teal-pastel)" }}>task_alt</span>
                    </div>
                    <div className="ds-card-inset" style={{ padding: "16px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 4px 0" }}>Avg Resolution Time</p>
                        <p style={{ fontSize: "24px", fontWeight: 600, margin: 0, color: "var(--color-primary)" }}>{weeklyReport.keyMetrics.avgResolutionTime}</p>
                      </div>
                      <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--color-primary-pastel)" }}>schedule</span>
                    </div>
                  </div>
                </section>

                {/* Category Breakdown */}
                <section className="ds-stagger-item" style={{ animationDelay: "240ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>CATEGORY BREAKDOWN</h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(() => {
                      const categories = Object.entries(weeklyReport.keyMetrics.byCategory || {});
                      const maxCount = Math.max(...categories.map(([, count]) => count), 1);
                      return categories.map(([category, count]) => (
                        <div key={category} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span>{category}</span>
                            <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }}>{count}</span>
                          </div>
                          <div style={{ height: "6px", backgroundColor: "var(--color-bg-hover)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, backgroundColor: "var(--color-primary)", borderRadius: "3px" }} />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </section>

                {/* Department Performance */}
                <section className="ds-stagger-item" style={{ animationDelay: "320ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>DEPARTMENT PERFORMANCE</h2>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--color-divider)", textAlign: "left", color: "var(--color-text-secondary)" }}>
                          <th style={{ padding: "12px 8px", fontWeight: "var(--font-weight-medium)" }}>Department</th>
                          <th style={{ padding: "12px 8px", fontWeight: "var(--font-weight-medium)" }}>Workload</th>
                          <th style={{ padding: "12px 8px", fontWeight: "var(--font-weight-medium)" }}>Avg Time</th>
                          <th style={{ padding: "12px 8px", fontWeight: "var(--font-weight-medium)", textAlign: "right" }}>Resolution Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyReport.departmentAnalysis.map((dept, index) => {
                          const rate = dept.resolutionRate;
                          const color = rate >= 75 ? "var(--color-teal)" : rate >= 50 ? "var(--color-amber)" : "var(--color-error)";
                          const bgColor = rate >= 75 ? "var(--color-teal-pastel)" : rate >= 50 ? "var(--color-amber-pastel)" : "var(--color-error-pastel)";
                          return (
                            <tr key={index} style={{ borderBottom: "1px solid var(--color-divider)", transition: "background-color 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                              <td style={{ padding: "12px 8px", fontWeight: 500 }}>{dept.department}</td>
                              <td style={{ padding: "12px 8px", color: "var(--color-text-secondary)" }}>{dept.workload}</td>
                              <td style={{ padding: "12px 8px", color: "var(--color-text-secondary)" }}>{dept.avgResolutionTime}</td>
                              <td style={{ padding: "12px 8px", textAlign: "right" }}>
                                <span className="ds-badge" style={{ backgroundColor: bgColor, color: color, fontSize: "12px" }}>
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* AI Analysis */}
                <section className="ds-stagger-item" style={{ animationDelay: "400ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>AI ANALYSIS</h2>
                  
                  {/* Trends */}
                  {weeklyReport.trends && weeklyReport.trends.length > 0 && (
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Significant Trends</h3>
                      {weeklyReport.trends.map((trend, i) => (
                        <p key={i} style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 12px 0", color: "var(--color-text-primary)" }}>
                          <strong>{trend.trend}</strong>: {trend.significance} (<em>{trend.change}</em>)
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Priority Areas */}
                  {weeklyReport.priorityAreas && weeklyReport.priorityAreas.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>Priority Areas</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {weeklyReport.priorityAreas.map((area, i) => (
                          <div key={i} className="ds-card-inset" style={{ padding: "16px", borderLeft: area.priorityLevel === "High" ? "4px solid var(--color-error)" : area.priorityLevel === "Medium" ? "4px solid var(--color-amber)" : "4px solid var(--color-teal)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                              <strong style={{ fontSize: "14px" }}>{area.area}</strong>
                            </div>
                            <p style={{ margin: "0 0 4px 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>{area.reason}</p>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-primary)" }}><strong>Action:</strong> {area.suggestedAction}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Recommendations */}
                <section className="ds-stagger-item" style={{ animationDelay: "480ms" }}>
                  <h2 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "16px" }}>RECOMMENDATIONS</h2>
                  {weeklyReport.recommendations && weeklyReport.recommendations.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {weeklyReport.recommendations.map((rec, index) => (
                        <div key={index} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "var(--color-primary)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", flexShrink: 0, marginTop: "2px" }}>
                            {index + 1}
                          </div>
                          <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.5, color: "var(--color-text-primary)" }}>
                            {rec}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>No specific recommendations for this week.</p>
                  )}
                </section>
                
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}