import { GoogleGenAI } from "@google/genai";

const gemini = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export const executeGemini = async (options) => {
  if (!import.meta.env.VITE_GEMINI_API_KEY) {
    const err = new Error("Missing VITE_GEMINI_API_KEY");
    err.status = 401; // Fail fast
    throw err;
  }
  return await gemini.models.generateContent(options);
};
