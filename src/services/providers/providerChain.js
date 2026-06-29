import { executeGemini } from "./geminiProvider";
import { executeGroq } from "./groqProvider";

const isFatalError = (err) => {
  const errMessage = (err.message || "").toLowerCase();
  const errStatus = err.status;
  
  const isAuthError = errStatus === 401 || errStatus === 403 || errMessage.includes("api key") || errMessage.includes("unauthenticated");
  const isQuotaError = errStatus === 429 || errMessage.includes("429") || errMessage.includes("quota");
  const isBadRequest = errStatus === 400 || errMessage.includes("400") || errMessage.includes("malformed");
  
  return isAuthError || isQuotaError || isBadRequest;
};

const executeWithRetry = async (providerFn, options, providerName) => {
  let attempt = 0;
  const maxAttempts = 2; // Initial + 1 retry

  while (attempt < maxAttempts) {
    try {
      return await providerFn(options);
    } catch (err) {
      attempt++;
      
      if (isFatalError(err) || attempt >= maxAttempts) {
        throw err;
      }
      
      console.warn(`[${providerName}] Transient failure (attempt ${attempt}). Retrying...`);
    }
  }
};

export const generateContentWithFallback = async (options) => {
  try {
    return await executeWithRetry(executeGemini, options, "Gemini");
  } catch (geminiErr) {
    console.warn(`[Gemini] Failed. Error: ${geminiErr.message}. Falling back to Groq...`);
    
    try {
      return await executeWithRetry(executeGroq, options, "Groq");
    } catch (groqErr) {
      console.warn(`[Groq] Failed. Error: ${groqErr.message}. Both providers failed.`);
      throw new Error("All AI providers failed.", { cause: groqErr }); // The caller (ai.js) will catch this and use local fallback
    }
  }
};
