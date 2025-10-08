import { NextApiRequest, NextApiResponse } from "next";

// Azure AI Foundry Container Apps
const AZURE_AI_FOUNDRY_URL = "https://ca-sageretailjssso.happyriver-cf203d90.eastus2.azurecontainerapps.io";
const LOCAL_BACKEND_URL = "http://localhost:8000";

// Specialist mapping
const SPECIALIST_MAPPING = {
  CLAIMS_CHAT: "CLAIMS_MANAGER",
  MARINE_INSURANCE: "MARINE_SPECIALIST", 
  CYBER_INSURANCE: "CYBER_SPECIALIST",
  UNDERWRITING: "UNDERWRITER"
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, conversationId, specialist } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Map frontend specialist to backend specialist
    const mappedSpecialist = SPECIALIST_MAPPING[specialist as keyof typeof SPECIALIST_MAPPING] || specialist;
    
    console.log(`🤖 Routing ${specialist} → ${mappedSpecialist}`);

    // Try Azure AI Foundry first, then local fallback
    let response;
    try {
      response = await fetch(`${AZURE_AI_FOUNDRY_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          conversationId: conversationId,
          specialist: mappedSpecialist
        }),
        signal: AbortSignal.timeout(10000)
      });
    } catch (azureError) {
      console.log(`⚠️ Azure AI Foundry failed, trying local backend...`);
      response = await fetch(`${LOCAL_BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          conversationId: conversationId,
          specialist: mappedSpecialist
        }),
        signal: AbortSignal.timeout(5000)
      });
    }

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    
    // Return normalized response
    const normalizedResponse = {
      response: data.response || "Response from SageInsure AI",
      agent: data.agent || `SageInsure ${specialist.replace('_', ' ')}`,
      specialist: specialist,
      confidence: data.confidence || 0.95,
      status: data.status || "success",
      sources: data.sources || [],
      conversationId,
      timestamp: data.timestamp || new Date().toISOString(),
      handled_by: "SageInsure AI Backend"
    };

    console.log(`✅ Response from backend for ${specialist}`);
    return res.status(200).json(normalizedResponse);

  } catch (error) {
    console.error("Backend error:", error);
    
    // Fallback response
    return res.status(200).json({
      response: `I'm your ${req.body.specialist?.replace('_', ' ') || 'insurance'} assistant. I'm currently experiencing a connection issue, but I'm here to help. Please try your question again.`,
      agent: `SageInsure ${req.body.specialist?.replace('_', ' ') || 'AI'}`,
      specialist: req.body.specialist || "GENERAL",
      confidence: 0.7,
      status: "fallback",
      sources: [],
      conversationId: req.body.conversationId || "session",
      timestamp: new Date().toISOString(),
      handled_by: "Fallback Handler"
    });
  }
}