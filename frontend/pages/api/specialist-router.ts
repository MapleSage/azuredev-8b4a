import { NextApiRequest, NextApiResponse } from "next";

// Working Azure Backend
const AZURE_BACKEND_URL = "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, specialist, sessionId } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    console.log(`🎯 REAL Azure Backend: ${specialist} - "${text}"`);

    // Call the actual Azure backend
    const backendResponse = await fetch(`${AZURE_BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `[${specialist}] ${text}`,
        conversation_history: [],
        session_id: sessionId
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!backendResponse.ok) {
      throw new Error(`Backend returned ${backendResponse.status}`);
    }

    const backendData = await backendResponse.json();
    
    const response = {
      response: backendData.answer || backendData.response || "Response from Azure AI",
      specialist: specialist,
      agent: `Azure ${specialist.replace('_', ' ')}`,
      confidence: 0.95,
      status: "success",
      domain: getSpecialistDomain(specialist),
      intent: detectIntent(text),
      conversationId: sessionId,
      timestamp: new Date().toISOString(),
      handled_by: "Azure OpenAI + Search",
      sources: backendData.sources || [],
    };

    console.log(`✅ Real Azure response for ${specialist}`);
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
    CRM_AGENT: "Customer Relations",
    HR_ASSISTANT: "Human Resources",
    MARKETING_AGENT: "Marketing",
    INVESTMENT_RESEARCH: "Investment Research",
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

