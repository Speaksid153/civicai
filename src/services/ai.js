import { GoogleGenAI, Type } from "@google/genai";

export const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

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
 * Analyze a report using only text description (existing functionality)
 */
export async function analyzeReport(description) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Missing VITE_GEMINI_API_KEY.");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",

      contents: `
You are an AI assistant for an Indian civic issue reporting system.

Analyze this complaint:

"${description}"

Return only valid JSON matching the schema.

Rules:
- category must be one of: Road, Garbage, Water, Electricity, Drainage, Other
- department must be one of: BBMP Roads, BBMP Sanitation, BWSSB, BESCOM, Traffic Police
- priority must be one of: Low, Medium, High, Critical
- summary must be one concise sentence for an authority dashboard
- confidence must be a number from 0 to 100
- imageDescriptionAlignment: Assess if description matches what would be visible in an image (if provided)
- authenticityAssessment: Evaluate if the report appears genuine based on description
- visibleHazards: List specific hazards visible or implied (e.g., ["pothole", "exposed wiring", "standing water"])
- severityEstimate: Assess severity based on description (Low/Medium/High/Critical)
- priorityExplanation: Brief explanation for the priority assignment
- recommendedDepartment: Suggested department based on issue type
- urgencyIndicators: List of urgency indicators from description (e.g., ["emergency", "hazard", "blocking traffic"])
`,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            category: {
              type: Type.STRING,
              enum: allowedCategories,
            },

            department: {
              type: Type.STRING,
              enum: allowedDepartments,
            },

            priority: {
              type: Type.STRING,
              enum: allowedPriorities,
            },

            summary: {
              type: Type.STRING,
            },

            confidence: {
              type: Type.NUMBER,
            },
            // Enhanced fields
            imageDescriptionAlignment: {
              type: Type.STRING,
            },
            authenticityAssessment: {
              type: Type.STRING,
            },
            visibleHazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            severityEstimate: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High", "Critical", "Unable to assess"]
            },
            priorityExplanation: {
              type: Type.STRING,
            },
            recommendedDepartment: {
              type: Type.STRING,
              enum: allowedDepartments,
            },
            urgencyIndicators: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },

          required: [
            "category",
            "department",
            "priority",
            "summary",
            "confidence",
            "imageDescriptionAlignment",
            "authenticityAssessment",
            "visibleHazards",
            "severityEstimate",
            "priorityExplanation",
            "recommendedDepartment",
            "urgencyIndicators",
          ],
        },
      },
    });

    return normalizeAnalysis(parseJsonResponse(response.text));

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return fallbackAnalysis;
  }
}

/**
 * Analyze a report using both text description and image
 * @param {string} description - Text description of the issue
 * @param {string} imageUrl - URL of the uploaded image (Firebase Storage download URL)
 * @returns {Promise<Object>} Analysis results with enhanced fields
 */
export async function analyzeReportWithImage(description, imageUrl) {
  try {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error("Missing VITE_GEMINI_API_KEY.");
    }

    // Prepare the multimodal content
    const contents = [
      {
        text: `
You are an AI assistant for an Indian civic issue reporting system.
Analyze this civic issue using BOTH the description and the image provided.

Description: "${description || 'No description provided'}"

[IMAGE PROVIDED FOR ANALYSIS]

Return only valid JSON matching the schema.

Rules:
- category must be one of: Road, Garbage, Water, Electricity, Drainage, Other
- department must be one of: BBMP Roads, BBMP Sanitation, BWSSB, BESCOM, Traffic Police
- priority must be one of: Low, Medium, High, Critical
- summary must be one concise sentence for an authority dashboard
- confidence must be a number from 0 to 100
- imageDescriptionAlignment: Assess how well the image matches the description (e.g., "Image shows pothole matching description", "Description mentions trash but image shows standing water")
- authenticityAssessment: Evaluate if the report appears genuine based on image and description (e.g., "Appears genuine - shows clear infrastructure issue", "Possibly staged - unusual angle", "Image unclear")
- visibleHazards: List specific hazards VISIBLE in the image (e.g., ["deep pothole", "broken glass", "exposed rebar", "flooding"])
- severityEstimate: Assess severity based on VISUAL evidence (Low/Medium/High/Critical)
- priorityExplanation: Brief explanation for the priority assignment based on visual evidence
- recommendedDepartment: Suggested department based on what's visible in image
- urgencyIndicators: List of urgency VISUALLY observable (e.g., ["blocking emergency access", "electrical hazard", "immediate flood risk"])
`
      },
    ];

    // Add image if URL is provided
    if (imageUrl) {
      contents.push({
        fileData: {
          fileUri: imageUrl,
          mimeType: "image/jpeg" // Assuming JPEG, could detect from URL or file type
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,

      config: {
        responseMimeType: "application/json",

        responseSchema: {
          type: Type.OBJECT,

          properties: {
            category: {
              type: Type.STRING,
              enum: allowedCategories,
            },

            department: {
              type: Type.STRING,
              enum: allowedDepartments,
            },

            priority: {
              type: Type.STRING,
              enum: allowedPriorities,
            },

            summary: {
              type: Type.STRING,
            },

            confidence: {
              type: Type.NUMBER,
            },
            // Enhanced fields
            imageDescriptionAlignment: {
              type: Type.STRING,
            },
            authenticityAssessment: {
              type: Type.STRING,
            },
            visibleHazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            severityEstimate: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High", "Critical", "Unable to assess"]
            },
            priorityExplanation: {
              type: Type.STRING,
            },
            recommendedDepartment: {
              type: Type.STRING,
              enum: allowedDepartments,
            },
            urgencyIndicators: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },

          required: [
            "category",
            "department",
            "priority",
            "summary",
            "confidence",
            "imageDescriptionAlignment",
            "authenticityAssessment",
            "visibleHazards",
            "severityEstimate",
            "priorityExplanation",
            "recommendedDepartment",
            "urgencyIndicators",
          ],
        },
      },
    });

    return normalizeAnalysis(parseJsonResponse(response.text));

  } catch (error) {
    console.error("Gemini vision analysis failed:", error);
    return fallbackAnalysis;
  }
}