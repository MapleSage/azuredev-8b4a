import { NextApiRequest, NextApiResponse } from "next";

// Real Azure endpoints
const AZURE_RAG_API = "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io";

// Agent routing with real Azure tools
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, specialist, sessionId } = req.body;

  console.log(`🔀 Azure Agent Router:`, {
    specialist,
    text: text?.substring(0, 50) + "...",
    sessionId,
    azure_endpoint: AZURE_RAG_API
  });

  if (!text) {
    return res.status(400).json({ error: "Message text is required" });
  }

  if (!specialist) {
    return res.status(400).json({ error: "Specialist is required" });
  }

  try {
    // Call real Azure RAG API
    const response = await fetch(`${AZURE_RAG_API}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text,
        conversation_history: [],
        specialist,
        session_id: sessionId || `azure-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure RAG API error: ${response.status}`);
    }

    const responseData = await response.json();
    
    console.log(`✅ Azure Agent Router: ${specialist} responded successfully`);

    return res.status(200).json({
      response: responseData.answer || responseData.response || "Response received",
      text: responseData.answer || responseData.response || "Response received",
      sessionId: sessionId || `azure-${Date.now()}`,
      conversationId: sessionId || `azure-${Date.now()}`,
      specialist,
      handled_by: specialist,
      domain: specialist.split('_')[0],
      intent: "azure_agent_response",
      confidence: 0.95,
      agent: `SageInsure ${specialist}`,
      data_source: "Azure OpenAI + Cognitive Search + Agent Tools",
      routing_info: {
        mode: "AZURE_REAL_AGENTS",
        azure_endpoint: AZURE_RAG_API,
        timestamp: new Date().toISOString()
      },
      sources: responseData.sources || [],
      tools_used: responseData.tools_used || []
    });

  } catch (error) {
    console.error(`❌ Azure Agent Router error:`, error);
    
    return res.status(500).json({
      error: "Azure agent routing failed",
      details: error instanceof Error ? error.message : "Unknown error",
      specialist,
      azure_endpoint: AZURE_RAG_API,
      suggestion: "Check Azure RAG API deployment and agent configuration"
    });
  }
}