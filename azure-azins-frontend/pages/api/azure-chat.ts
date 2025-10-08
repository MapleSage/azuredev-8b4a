import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, text, sessionId, conversationId, specialist, agentType } = req.body;
    const messageText = message || text;

    if (!messageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Route to your deployed agents
    const response = await fetch('/api/real-agents-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: messageText,
        specialist: agentType || 'CLAIMS_MANAGER'
      })
    });

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`);
    }

    const data = await response.json();

    return res.status(200).json({
      response: data.response || data.answer || 'No response from Azure OpenAI',
      text: data.response || data.answer || 'No response from Azure OpenAI',
      sessionId: sessionId || conversationId || `session-${Date.now()}`,
      conversationId: sessionId || conversationId || `session-${Date.now()}`,
      specialist: specialist || agentType || "AZURE_OPENAI",
      handled_by: "AZURE_OPENAI_GPT4O",
      domain: "INSURANCE_RAG",
      intent: "azure_openai_response",
      confidence: 0.95,
      agent: "SageInsure Azure OpenAI GPT-4o",
      data_source: "Azure OpenAI + Cognitive Search",
      sources: data.sources || []
    });

  } catch (error) {
    console.error("Azure OpenAI API error:", error);
    return res.status(500).json({
      error: "Azure OpenAI connection failed",
      details: error instanceof Error ? error.message : "Unknown error",
      fallback_message: "I'm having trouble connecting to Azure OpenAI. Please try again."
    });
  }
}