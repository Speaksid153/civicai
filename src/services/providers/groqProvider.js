export const executeGroq = async (options) => {
  if (!import.meta.env.VITE_GROQ_API_KEY) {
    const err = new Error("Missing VITE_GROQ_API_KEY");
    err.status = 401; // Treat as auth error to fail fast
    throw err;
  }

  // Convert Gemini format to Groq (OpenAI) format
  const groqOptions = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "user", content: options.contents }
    ],
  };

  // If the caller requested JSON, enforce it via Groq's JSON mode
  if (options.config?.responseMimeType === "application/json" || options.config?.responseSchema) {
    groqOptions.response_format = { type: "json_object" };
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(groqOptions)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`Groq API Error: ${response.statusText} - ${errorBody}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  
  // Return an object that mirrors the Gemini response object so callers can just use `response.text`
  return {
    text: data.choices[0]?.message?.content || "{}"
  };
};
