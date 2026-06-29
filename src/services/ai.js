import { Type } from "@google/genai";
import { runLocalFallback } from "./fallbackClassifier";
import { generateContentWithFallback } from "./providers/providerChain";

export const ai = {
  models: {
    generateContent: async (options) => {
      return await generateContentWithFallback(options);
    }
  }
};

const sessionCache = new Map();

const fallbackAnalysis = {
  category: "Other",
  department: "BBMP Sanitation",
  priority: "Medium",
  summary: "AI analysis unavailable. Please review manually.",
  confidence: 0,
  // Enhanced fields
  imageDescriptionAlignment: "Unable to assess",
  authenticityAssessment: "Unable to assess",
  visibleHazards: [],
  severityEstimate: "Unable to assess",
  priorityExplanation: "Insufficient data for explanation",
  recommendedDepartment: "BBMP Sanitation",
  urgencyIndicators: [],
};

const allowedCategories = [
  "Road",
  "Garbage",
  "Water",
  "Electricity",
  "Drainage",
  "Other",
];

const allowedDepartments = [
  "BBMP Roads",
  "BBMP Sanitation",
  "BWSSB",
  "BESCOM",
  "Traffic Police",
];

const allowedPriorities = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

function parseJsonResponse(text) {
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  const cleanedText = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleanedText);
}

function normalizeAnalysis(result) {
  const category = allowedCategories.includes(result.category)
    ? result.category
    : fallbackAnalysis.category;

  const department = allowedDepartments.includes(result.department)
    ? result.department
    : fallbackAnalysis.department;

  const priority = allowedPriorities.includes(result.priority)
    ? result.priority
    : fallbackAnalysis.priority;

  const confidence = Number(result.confidence);

  return {
    category,
    department,
    priority,
    summary:
      typeof result.summary === "string" && result.summary.trim()
        ? result.summary.trim()
        : fallbackAnalysis.summary,
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(100, Math.round(confidence)))
      : fallbackAnalysis.confidence,
    // Enhanced fields with fallback handling
    imageDescriptionAlignment:
      typeof result.imageDescriptionAlignment === "string"
        ? result.imageDescriptionAlignment
        : fallbackAnalysis.imageDescriptionAlignment,
    authenticityAssessment:
      typeof result.authenticityAssessment === "string"
        ? result.authenticityAssessment
        : fallbackAnalysis.authenticityAssessment,
    visibleHazards:
      Array.isArray(result.visibleHazards)
        ? result.visibleHazards
        : fallbackAnalysis.visibleHazards,
    severityEstimate:
      typeof result.severityEstimate === "string"
        ? result.severityEstimate
        : fallbackAnalysis.severityEstimate,
    priorityExplanation:
      typeof result.priorityExplanation === "string"
        ? result.priorityExplanation
        : fallbackAnalysis.priorityExplanation,
    recommendedDepartment:
      allowedDepartments.includes(result.recommendedDepartment)
        ? result.recommendedDepartment
        : fallbackAnalysis.recommendedDepartment,
    urgencyIndicators:
      Array.isArray(result.urgencyIndicators)
        ? result.urgencyIndicators
        : fallbackAnalysis.urgencyIndicators,
  };
}

/**
 * Analyze a report and check for duplicates in a single API call
 */
export async function analyzeAndCheckDuplicates(description, nearbyReports = []) {
  const cacheKey = (description || "").trim().toLowerCase();
  
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey);
  }

  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Missing VITE_GEMINI_API_KEY.");
    }

    const nearbyDescriptions = nearbyReports.length > 0 
      ? nearbyReports.map((report) => `
        Report ID: ${report.id}
        Description: "${report.description}"
        Category: ${report.category || "Unknown"}
      `).join("\n")
      : "No nearby reports.";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
You are an AI assistant for CivicAI.
Evaluate this NEW report for both classification and duplicate detection against EXISTING nearby reports.

NEW REPORT:
"${description}"

NEARBY REPORTS:
${nearbyDescriptions}

RETURN ONLY VALID JSON MATCHING THE SCHEMA.

Rules:
- duplicates: array of similar reports (similarityScore >= 60). Focus on semantic meaning.
- isLikelyDuplicate: true if any similarityScore >= 80.
- recommendation: 'submit_new' or 'update_existing:<reportId>'. Be conservative.
- category must be one of: Road, Garbage, Water, Electricity, Drainage, Other
- department must be one of: BBMP Roads, BBMP Sanitation, BWSSB, BESCOM, Traffic Police
- priority must be one of: Low, Medium, High, Critical
- summary must be one concise sentence for an authority dashboard
- visibleHazards: List specific hazards visible or implied
- severityEstimate: Assess severity (Low/Medium/High/Critical)
- priorityExplanation: Brief explanation for priority
- urgencyIndicators: List of urgency indicators from description
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
            category: { type: Type.STRING, enum: allowedCategories },
            department: { type: Type.STRING, enum: allowedDepartments },
            priority: { type: Type.STRING, enum: allowedPriorities },
            summary: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            visibleHazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            severityEstimate: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical", "Unable to assess"] },
            priorityExplanation: { type: Type.STRING },
            recommendedDepartment: { type: Type.STRING, enum: allowedDepartments },
            urgencyIndicators: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            "duplicates", "isLikelyDuplicate", "recommendation",
            "category", "department", "priority", "summary", "confidence",
            "visibleHazards", "severityEstimate", "priorityExplanation",
            "recommendedDepartment", "urgencyIndicators"
          ],
        },
      },
    });

    const parsed = parseJsonResponse(response.text);
    const analysisPart = normalizeAnalysis(parsed);
    
    const finalResult = {
      duplicates: parsed.duplicates || [],
      isLikelyDuplicate: !!parsed.isLikelyDuplicate,
      recommendation: parsed.recommendation || "submit_new",
      ...analysisPart
    };

    sessionCache.set(cacheKey, finalResult);
    return finalResult;

  } catch (_error) {
    console.warn("AI providers unavailable — using local fallback.");
    const fallback = normalizeAnalysis(runLocalFallback(description));
    return {
      duplicates: [],
      isLikelyDuplicate: false,
      recommendation: "submit_new",
      ...fallback
    };
  }
}