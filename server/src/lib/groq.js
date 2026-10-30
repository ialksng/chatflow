export const AI_ASSISTANT_ID = "000000000000000000000000";

const FALLBACK_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

export const getGroqAiResponse = async (history = [], userMessage = "") => {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    return "Hello! I am your AI Assistant. To enable full AI responses, please add the GROQ_API_KEY environment variable in your Vercel settings.";
  }

  const configuredModel = (process.env.GROQ_MODEL || "").trim();
  const modelsToTry = [
    ...(configuredModel ? [configuredModel] : []),
    ...FALLBACK_MODELS,
  ].filter((v, i, a) => a.indexOf(v) === i); // unique

  const messages = [
    {
      role: "system",
      content:
        "You are AI Assistant, a friendly, intelligent, and helpful conversational companion inside ChatFlow. You provide concise, insightful responses and format your answers with markdown where appropriate.",
    },
  ];

  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history) {
      if (!msg.text) continue;
      const isFromAi =
        msg.senderId === AI_ASSISTANT_ID ||
        msg.senderId?.toString() === AI_ASSISTANT_ID;
      messages.push({
        role: isFromAi ? "assistant" : "user",
        content: msg.text,
      });
    }
  }

  // Ensure latest user message is present
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== userMessage) {
    messages.push({
      role: "user",
      content: userMessage,
    });
  }

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) return reply;
      } else {
        const errText = await res.text();
        console.warn(`Groq model '${model}' returned status ${res.status}:`, errText);
        lastError = `Groq API status ${res.status}`;
        // If 404 (model not found), proceed to try next candidate model
        if (res.status === 404) continue;
      }
    } catch (err) {
      console.warn(`Groq request failed for '${model}':`, err.message);
      lastError = err.message;
    }
  }

  return `AI Assistant temporarily unavailable (${lastError || "Could not reach AI model"}). Please check your Groq API key and model permissions.`;
};

