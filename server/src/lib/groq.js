export const AI_ASSISTANT_ID = "000000000000000000000000";

export const getGroqAiResponse = async (history = [], userMessage = "") => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return "Hello! I am your AI Assistant. To enable full AI responses, please add the GROQ_API_KEY environment variable in your Vercel settings.";
  }

  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Groq API error:", res.status, errorText);
      return `AI Assistant temporarily unavailable (Groq status ${res.status}). Please check that your GROQ_API_KEY is valid.`;
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content;
    return reply || "I didn't receive a response from the AI. Please try again.";
  } catch (error) {
    console.error("Error communicating with Groq API:", error.message);
    return `Error connecting to AI service: ${error.message}`;
  }
};
