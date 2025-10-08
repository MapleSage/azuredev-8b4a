import { NextApiRequest, NextApiResponse } from "next";

// Live Azure Backend
const LOCAL_BACKEND_URL = "http://localhost:8000";
const AZURE_BACKEND_URL = "https://sageinsure-rag-api.happyriver-cf203d90.eastus.azurecontainerapps.io";

interface ChatRequest {
  text: string;
  conversationId: string;
  specialist: string;
  context?: any[];
}

interface AgentResponse {
  response: string;
  agent: string;
  specialist: string;
  confidence?: number;
  sources?: any[];
  tokens_used?: number;
  status: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, conversationId, specialist }: ChatRequest = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log(`🤖 Calling Real Azure Agents: ${specialist} - "${text}"`);

    // Call the real agents API that routes to working Azure endpoints
    const backendResponse = await fetch('/api/real-agents-chat', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        conversationId: conversationId,
        specialist: specialist
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    
    const response = {
      response: backendData.answer || backendData.response || "Response from SageInsure AI",
      agent: backendData.agent || `SageInsure AI ${specialist.replace('_', ' ')}`,
      specialist: specialist,
      confidence: backendData.confidence || 0.95,
      status: backendData.status || "success",
      sources: backendData.sources || [],
      conversationId,
      timestamp: backendData.timestamp || new Date().toISOString(),
      handled_by: "Azure OpenAI + Search",
      domain: getSpecialistDomain(specialist),
      intent: detectIntent(text),
    };

    console.log(`✅ Backend response for ${specialist}`);
    return res.status(200).json(response);

  } catch (error) {
    console.error("Azure Backend error:", error);
    
    return res.status(500).json({
      error: "Azure backend unavailable",
      message: error instanceof Error ? error.message : "Unknown error",
      specialist: req.body.specialist || "UNKNOWN",
    });
  }
}



function getSpecialistDomain(specialist: string): string {
  const domains = {
    CLAIMS_MANAGER: "Claims Processing",
    POLICY_ASSISTANT: "Policy Management", 
    MARINE_SPECIALIST: "Marine Insurance",
    CYBER_SPECIALIST: "Cyber Security",
    FNOL_PROCESSOR: "First Notice of Loss",
    UNDERWRITER: "Risk Assessment",
    RESEARCH_ASSISTANT: "Market Research",
  };
  
  return domains[specialist as keyof typeof domains] || "General Insurance";
}

function detectIntent(text: string): string {
  const textLower = text.toLowerCase();
  
  if (textLower.includes("file") || textLower.includes("submit") || textLower.includes("report")) {
    return "file_claim";
  }
  if (textLower.includes("status") || textLower.includes("track")) {
    return "check_status";
  }
  if (textLower.includes("coverage") || textLower.includes("covered")) {
    return "coverage_inquiry";
  }
  if (textLower.includes("premium") || textLower.includes("cost") || textLower.includes("price")) {
    return "pricing_inquiry";
  }
  if (textLower.includes("policy") || textLower.includes("renewal")) {
    return "policy_management";
  }
  
  return "general_inquiry";
}