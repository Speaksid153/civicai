/* eslint-disable no-unused-vars, react-hooks/immutability */
import { useEffect, useState } from "react";
import { Type } from "@google/genai";
import { Link } from "react-router-dom";
import Toast from "../components/Toast";
import LoadingSkeleton from "../components/LoadingSkeleton";

import {
  getArchivedReports,
} from "../services/firebase";
import { ai } from "../services/ai";

import {
  getReportsByCategory,
  getReportsByDepartment,
  getReportsByStatus,
  getReportsByMonth,
  getAverageResolutionTime,
  getResolutionRate,
  formatDuration,
} from "../utils/analytics";

import {
  reportCategories,
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
import DashboardMap from "../components/DashboardMap";
import SearchBar from "../components/SearchBar";

// Helper functions for AI-specific metrics
const calculateAITrustMetrics = (reports) => {
  if (reports.length === 0) {
    return {
      totalReports: 0,
      aiHumanAgreementRate: 0,
      avgConfidenceWhenCorrect: 0,
      mostCommonOverrideReason: "No overrides yet",
      biasAlerts: [],
    };
  }

  // Calculate AI/human agreement rate
  const overriddenReports = reports.filter(r =>
    r.ai && r.ai.userOverride === true
  );
  const agreementRate = ((reports.length - overriddenReports.length) / reports.length) * 100;

  // Calculate average confidence when AI was correct (not overridden)
  const correctReports = reports.filter(r =>
    r.ai && r.ai.userOverride !== true
  );
  const avgConfidence = correctReports.length > 0
    ? correctReports.reduce((sum, r) => sum + (r.ai?.confidence || 0), 0) / correctReports.length
    : 0;

  // Collect override reasons for most common reason
  const overrideReasons = overriddenReports
    .map(r => r.ai?.userJustification || "No reason provided")
    .filter(reason => reason.trim() !== "");

  let mostCommonReason = "No overrides yet";
  if (overrideReasons.length > 0) {
    // Simple frequency count
    const freqMap = {};
    overrideReasons.forEach(reason => {
      freqMap[reason] = (freqMap[reason] || 0) + 1;
    });
    mostCommonReason = Object.entries(freqMap)
      .sort(([,a], [,b]) => b - a)[0][0] || "No overrides yet";
  }

  // Basic bias alert: check if any area has significantly different treatment
  const biasAlerts = [];
  // Could expand this with more sophisticated bias detection

  return {
    totalReports: reports.length,
    aiHumanAgreementRate: Math.round(agreementRate),
    avgConfidenceWhenCorrect: Math.round(avgConfidence),
    mostCommonOverrideReason: mostCommonReason,
    biasAlerts: biasAlerts,
  };
};

export default function AIInsightsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAIInsights] = useState(null);
  const [aiTrustMetrics, setAITrustMetrics] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = observeAuth((currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Use async IIFE
    (async () => {
      try {
        setLoading(true);

        // Fetch archived reports
        const archivedReports = await getArchivedReports();
        setReports(archivedReports);

        // Calculate AI trust metrics
        const trustMetrics = calculateAITrustMetrics(archivedReports);
        setAITrustMetrics(trustMetrics);

        if (archivedReports.length === 0) {
          setToast({
            type: "info",
            message: "No archived reports available for analysis.",
          });
          setLoading(false);
          return;
        }

        // Prepare data summary for Gemini
        const stats = {
          totalReports: archivedReports.length,
          reportsByCategory: getReportsByCategory(archivedReports),
          reportsByDepartment: getReportsByDepartment(archivedReports),
          reportsByStatus: getReportsByStatus(archivedReports),
          reportsByMonth: getReportsByMonth(archivedReports),
          averageResolutionTime: formatDuration(getAverageResolutionTime(archivedReports)),
          resolutionRate: getResolutionRate(archivedReports),
        };

        // Format stats for AI prompt
        const statsSummary = JSON.stringify(stats, null, 2);

        // Call Gemini for insights
        const aiResponse = await generateAIInsights(statsSummary, archivedReports);
        setAIInsights(aiResponse);

      } catch (err) {
        console.error("Error generating AI insights:", err);
        setToast({
          type: "error",
          message: "Failed to generate AI insights.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []); // Run only once on mount

  async function generateAIInsights(statsSummary, reports) {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        throw new Error("Missing VITE_GEMINI_API_KEY.");
      }

      const sampleReports = reports
        .slice(0, 5)
        .map((r) => ({
          description: r.description,
          category: r.category || r.ai?.category,
          department: r.assignedDepartment || r.ai?.department,
          priority: r.priority || r.ai?.priority,
          status: r.status,
        }));

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `
        You are an AI assistant for municipal civic administration. Analyze the following civic issue statistics and sample reports to provide actionable insights for city officials.

        STATISTICAL SUMMARY:
        ${statsSummary}

        SAMPLE REPORTS (showing first 5 of ${reports.length}):
        ${JSON.stringify(sampleReports, null, 2)}

        Provide a JSON response with the following structure:
        {
          "executiveSummary": "A 2-3 sentence executive summary of the civic situation",
          "hotspots": [
            {
              "area": "Area or category name",
              "issueType": "Type of issue",
              "severity": "High/Medium/Low",
              "description": "Brief description of the problem"
            }
          ],
          "trends": [
            {
              "trend": "Description of trend",
              "dataPoint": "Supporting data point",
              "insight": "What this suggests for action"
            }
          ],
          "departmentInsights": [
            {
              "department": "Department name",
              "workload": "High/Medium/Low",
              "avgResolutionTime": "X days",
              "suggestion": "Specific improvement suggestion"
            }
          ],
          "recommendations": [
            "Specific actionable recommendation 1",
            "Specific actionable recommendation 2",
            "Specific actionable recommendation 3"
          ],
          "priorityAreas": [
            {
              "area": "Geographic or categorical area",
              "priorityLevel": "High/Medium/Low",
              "reason": "Why this area needs attention"
            }
          ]
        }

        Rules:
        - Base all insights strictly on the provided data
        - Be specific and actionable
        - Focus on patterns visible in the data
        - Keep recommendations practical for municipal implementation
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              hotspots: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    area: { type: Type.STRING },
                    issueType: { type: Type.STRING },
                    severity: {
                      type: Type.STRING,
                      enum: ["High", "Medium", "Low"]
                    },
                    description: { type: Type.STRING }
                  },
                  required: ["area", "issueType", "severity", "description"]
                }
              },
              trends: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    trend: { type: Type.STRING },
                    dataPoint: { type: Type.STRING },
                    insight: { type: Type.STRING }
                  },
                  required: ["trend", "dataPoint", "insight"]
                }
              },
              departmentInsights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    department: { type: Type.STRING },
                    workload: {
                      type: Type.STRING,
                      enum: ["High", "Medium", "Low"]
                    },
                    avgResolutionTime: { type: Type.STRING },
                    suggestion: { type: Type.STRING }
                  },
                  required: ["department", "workload", "avgResolutionTime", "suggestion"]
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
                    reason: { type: Type.STRING }
                  },
                  required: ["area", "priorityLevel", "reason"]
                }
              }
            },
            required: [
              "executiveSummary",
              "hotspots",
              "trends",
              "departmentInsights",
              "recommendations",
              "priorityAreas"
            ]
          }
        }
      });

      const result = JSON.parse(response.text);
      return result;
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      // Return fallback insights
      return {
        executiveSummary: "Unable to generate AI insights at this time. Please check system logs.",
        hotspots: [],
        trends: [],
        departmentInsights: [],
        recommendations: ["System temporarily unavailable for AI analysis"],
        priorityAreas: []
      };
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--color-bg-app)" }}>
        <h2 className="ds-body ds-secondary" style={{ fontSize: "16px" }}>
          Checking login...
        </h2>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg-app)" }}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      
      {/* Persistent Left Sidebar */}
      <AuthorityNav user={user} setToast={setToast} />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        
        {/* Top Bar (Identical to AuthorityDashboard) */}
        <header style={{ height: "72px", backgroundColor: "var(--color-bg-surface)", borderBottom: "1px solid var(--color-divider)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
          {/* Left: Title & Subtitle */}
          <div className="hidden md:flex" style={{ flexDirection: "column" }}>
            <h2 className="ds-title" style={{ margin: 0, fontSize: "20px" }}>AI Insights</h2>
            <p className="ds-body ds-secondary" style={{ margin: 0, fontSize: "13px" }}>Actionable intelligence powered by Gemini.</p>
          </div>
          
          {/* Center: Search */}
          <div style={{ flex: 1, maxWidth: "480px", margin: "0 24px" }}>
            <SearchBar search={""} setSearch={() => {}} />
          </div>
          
          {/* Right: Notifications & Profile */}
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

        {/* Dashboard Content */}
        <main style={{ flex: 1, padding: "32px", maxWidth: "1400px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Header Banner */}
          <div className="ds-card ds-shadow-card ds-page-enter" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", animationDelay: "50ms" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "var(--font-weight-medium)", color: "var(--color-text-primary)", margin: "0 0 4px 0" }}>
                AI-Powered Analysis
              </h2>
              <p className="ds-body ds-secondary" style={{ margin: 0 }}>
                Gemini AI analysis of archived civic reports.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="ds-btn ds-btn-secondary"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              Refresh Analysis
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton />
          ) : aiInsights ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Analytics Bento Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                
                {/* KPI: Total Reports */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ animationDelay: "100ms", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Total Issues Analyzed</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--color-primary-pastel)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <span style={{ fontSize: "28px", fontWeight: "var(--font-weight-bold)", lineHeight: 1 }}>{aiTrustMetrics?.totalReports}</span>
                  </div>
                </div>

                {/* KPI: AI/Human Agreement */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ animationDelay: "150ms", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>AI/Human Agreement</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--color-teal-pastel)", color: "var(--color-teal)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined">handshake</span>
                    </div>
                    <span style={{ fontSize: "28px", fontWeight: "var(--font-weight-bold)", lineHeight: 1 }}>{aiTrustMetrics?.aiHumanAgreementRate}%</span>
                  </div>
                </div>

                {/* KPI: Avg Confidence */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ animationDelay: "200ms", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Avg Confidence</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--color-primary-pastel)", color: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined">verified</span>
                    </div>
                    <span style={{ fontSize: "28px", fontWeight: "var(--font-weight-bold)", lineHeight: 1 }}>{aiTrustMetrics?.avgConfidenceWhenCorrect}%</span>
                  </div>
                </div>

                {/* KPI: Bias Alerts */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ animationDelay: "250ms", padding: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Bias Alerts</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "var(--color-amber-pastel)", color: "var(--color-amber)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined">warning</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "28px", fontWeight: "var(--font-weight-bold)", lineHeight: 1 }}>{aiTrustMetrics?.biasAlerts.length}</span>
                    </div>
                  </div>
                </div>

                {/* Large Card: Issue Hotspots */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", height: "auto", minHeight: "400px", padding: 0, animationDelay: "300ms", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--color-divider)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                      <h3 style={{ fontSize: "16px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Issue Hotspots</h3>
                    </div>
                    <span className="ds-badge" style={{ backgroundColor: "var(--color-teal-pastel)", color: "var(--color-teal)" }}>Live</span>
                  </div>
                  <div style={{ flex: 1, position: "relative" }}>
                    <DashboardMap reports={reports} />
                  </div>
                </div>

                {/* Medium Card: Category Breakdown */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ gridColumn: "1 / span 2", animationDelay: "350ms" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Category Breakdown</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {(() => {
                      const categories = Object.entries(getReportsByCategory(reports));
                      const maxCount = Math.max(...categories.map(([, count]) => count), 1);
                      return categories.map(([category, count]) => (
                        <div key={category} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span>{category}</span>
                            <span style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-primary)" }}>{count}</span>
                          </div>
                          <div style={{ height: "6px", backgroundColor: "var(--color-bg-hover)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(count / maxCount) * 100}%`, backgroundColor: "var(--color-primary)", borderRadius: "3px", transition: "width 0.5s ease-out" }} />
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Medium Card: Department Performance */}
                <div className="ds-card ds-shadow-card ds-stagger-item" style={{ gridColumn: "span 2", animationDelay: "400ms" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
                    <div style={{ width: "4px", height: "16px", backgroundColor: "var(--color-primary)", borderRadius: "2px" }} />
                    <h3 style={{ fontSize: "14px", fontWeight: "var(--font-weight-medium)", margin: 0 }}>Department Performance</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {aiInsights.departmentInsights.length > 0 ? (
                      aiInsights.departmentInsights.map((dept, index) => {
                        const colorMap = {
                          Low: "var(--color-teal)",
                          Medium: "var(--color-amber)",
                          High: "var(--color-error)"
                        };
                        const color = colorMap[dept.workload] || "var(--color-primary)";
                        return (
                          <div key={index} className="ds-card-inset" style={{ padding: "16px", borderLeft: `4px solid ${color}`, borderRadius: "0 var(--radius-card) var(--radius-card) 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "var(--font-weight-bold)" }}>{dept.department}</h4>
                              <span className="ds-badge" style={{ backgroundColor: "var(--color-bg-surface)", border: `1px solid ${color}`, color: color }}>Workload: {dept.workload}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", fontSize: "13px" }}>
                              <div>
                                <strong style={{ color: "var(--color-text-secondary)" }}>Avg Resolution:</strong> {dept.avgResolutionTime}
                              </div>
                              <div>
                                <strong style={{ color: "var(--color-text-secondary)" }}>Suggestion:</strong> {dept.suggestion}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="ds-body ds-secondary text-center py-8">No department data available.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gemini Analysis Summary */}
              <div className="ds-card ds-shadow-card ds-stagger-item" style={{ animationDelay: "450ms" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid var(--color-divider)" }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--color-primary)", fontSize: "28px" }}>auto_awesome</span>
                  <h2 className="ds-title" style={{ margin: 0 }}>Gemini Analysis Summary</h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "32px", fontSize: "14px", lineHeight: "1.6" }}>
                  {/* Executive Summary */}
                  <div>
                    <h3 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>EXECUTIVE SUMMARY</h3>
                    <p style={{ margin: 0 }}>{aiInsights.executiveSummary}</p>
                  </div>

                  {/* Trends */}
                  <div>
                    <h3 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>KEY TRENDS</h3>
                    {aiInsights.trends.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                        {aiInsights.trends.map((trend, i) => (
                          <div key={i} className="ds-card-inset" style={{ padding: "16px", border: "none" }}>
                            <strong style={{ display: "block", marginBottom: "4px" }}>{trend.trend}</strong>
                            <p style={{ margin: "0 0 8px 0", color: "var(--color-text-secondary)" }}>{trend.dataPoint}</p>
                            <p style={{ margin: 0, fontSize: "13px" }}><em>Insight:</em> {trend.insight}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>No significant trends detected.</p>
                    )}
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>RECOMMENDATIONS</h3>
                    {aiInsights.recommendations.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--color-text-secondary)" }}>
                        {aiInsights.recommendations.map((rec, i) => (
                          <li key={i} style={{ marginBottom: "8px" }}>{rec}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>No recommendations available.</p>
                    )}
                  </div>

                  {/* Priority Areas */}
                  <div>
                    <h3 className="ds-label" style={{ color: "var(--color-primary)", marginBottom: "8px" }}>PRIORITY AREAS FOR ACTION</h3>
                    {aiInsights.priorityAreas.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                        {aiInsights.priorityAreas.map((area, i) => (
                          <div key={i} className="ds-card-inset" style={{ padding: "16px", borderLeft: area.priorityLevel === "High" ? "4px solid var(--color-error)" : area.priorityLevel === "Medium" ? "4px solid var(--color-amber)" : "4px solid var(--color-teal)", borderRadius: "0 var(--radius-card) var(--radius-card) 0" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <strong style={{ margin: 0 }}>{area.area}</strong>
                              <span className="ds-badge ds-badge-pending" style={{ fontSize: "11px" }}>{area.priorityLevel}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>{area.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>No priority areas identified.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="ds-card ds-shadow-card ds-page-enter" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", textAlign: "center" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "64px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>analytics</span>
              <h3 className="ds-card-title" style={{ margin: "0 0 8px 0" }}>No Data Available</h3>
              <p className="ds-body ds-secondary" style={{ maxWidth: "400px", margin: "0 0 24px 0" }}>
                Reports will appear here once they go through the complete workflow and are archived.
              </p>
              <ul style={{ textAlign: "left", color: "var(--color-text-secondary)", fontSize: "14px", margin: 0, padding: 0, listStyle: "none" }}>
                <li style={{ marginBottom: "8px" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Submitted by citizen</li>
                <li style={{ marginBottom: "8px" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Analyzed by AI</li>
                <li style={{ marginBottom: "8px" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Reviewed by municipal official</li>
                <li style={{ marginBottom: "8px" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Assigned to officer</li>
                <li style={{ marginBottom: "8px" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Marked as resolved</li>
                <li style={{ marginBottom: "0" }}><span style={{ color: "var(--color-teal)", marginRight: "8px" }}>✓</span>Archived by authority</li>
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}