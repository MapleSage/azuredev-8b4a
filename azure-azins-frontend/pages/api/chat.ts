import { NextApiRequest, NextApiResponse } from "next";

// Real Azure endpoints - NO MOCKS!
const AZURE_RAG_API = "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io";
const AZURE_OPENAI_ENDPOINT = "https://sageinsure-openai.openai.azure.com/";
const AZURE_SEARCH_ENDPOINT = "https://sageinsure-search.search.windows.net";

// Marine Agent is the main routing agent
const MAIN_AGENT = "MARINE_SPECIALIST";

// Agent domain mapping for proper KB routing
const AGENT_DOMAINS = {
  MARINE_SPECIALIST: { kb: "marine-insurance", domain: "MARINE" },
  CLAIMS_MANAGER: { kb: "claims-processing", domain: "CLAIMS" },
  CYBER_SPECIALIST: { kb: "cyber-security", domain: "CYBER" },
  UNDERWRITER: { kb: "underwriting-docs", domain: "UNDERWRITING" },
  RESEARCH_ASSISTANT: { kb: "research-docs", domain: "RESEARCH" },
  FNOL_PROCESSOR: { kb: "fnol-processing", domain: "FNOL" },
  POLICY_ASSISTANT: { kb: "policy-docs", domain: "POLICY" },
  CRM_AGENT: { kb: "customer-data", domain: "CRM" },
  HR_ASSISTANT: { kb: "hr-policies", domain: "HR" },
  MARKETING_AGENT: { kb: "marketing-data", domain: "MARKETING" },
  INVESTMENT_RESEARCH: { kb: "investment-data", domain: "INVESTMENT" }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Handle both old and new API formats
    const { message, text, sessionId, conversationId, specialist } = req.body;
    const { agent } = req.query;

    const messageText = message || text;
    const sessionIdValue = sessionId || conversationId;
    const specialistValue = specialist || agent;

    if (!messageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log(`🔀 Azure Agent Routing:`, {
      messageText: messageText?.substring(0, 50) + "...",
      sessionIdValue,
      requestedSpecialist: specialistValue,
      mappedSpecialist,
      mainAgent: MAIN_AGENT
    });

    // Map frontend specialists to FastAPI specialists
    const specialistMapping: { [key: string]: string } = {
      // Tab-based mapping to specific Strands agents
      claims: "CLAIMS_MANAGER",
      marine: "MARINE_SPECIALIST", 
      auto: "AUTO_SPECIALIST",
      cyber: "CYBER_SPECIALIST",
      health: "HEALTH_SPECIALIST",
      life: "LIFE_SPECIALIST",
      policy: "POLICY_ASSISTANT",
      underwriting: "UNDERWRITER",
      research: "RESEARCH_ASSISTANT",
      fnol: "FNOL_PROCESSOR",
      lifecycle: "CLAIMS_MANAGER",
      crm: "CRM_AGENT",
      hr: "HR_ASSISTANT",
      marketing: "MARKETING_AGENT",
      investment: "INVESTMENT_RESEARCH",
      // Component-based mapping - Claims Chat should use CLAIMS_MANAGER
      CLAIMS_CHAT: "CLAIMS_MANAGER",
      claims_chat: "CLAIMS_MANAGER",
      UNDERWRITING: "UNDERWRITER",
      RESEARCH_ASSISTANT: "RESEARCH_ASSISTANT",
      MARINE_INSURANCE: "MARINE_SPECIALIST",
      CYBER_INSURANCE: "CYBER_SPECIALIST",
      FNOL_PROCESSOR: "FNOL_PROCESSOR",
      CLAIMS_LIFECYCLE: "CLAIMS_MANAGER",
      POLICY_ASSISTANT: "POLICY_ASSISTANT",
      CRM_AGENT: "CRM_AGENT",
      HR_ASSISTANT: "HR_ASSISTANT",
      MARKETING_AGENT: "MARKETING_AGENT",
      INVESTMENT_RESEARCH: "INVESTMENT_RESEARCH",
    };

    const mappedSpecialist =
      specialistMapping[specialistValue] || "CLAIMS_MANAGER";

    console.log("Calling FastAPI with payload:", {
      text: messageText,
      conversationId: sessionIdValue || `session-${Date.now()}`,
      specialist: mappedSpecialist,
    });

    // Extract JWT token for backend authentication
    let authToken = req.headers.authorization?.replace("Bearer ", "");

    if (!authToken && req.headers.cookie) {
      // Try to extract from cookies if not in header
      const cookies = req.headers.cookie
        .split(";")
        .reduce((acc: any, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});
      authToken = cookies.auth_token;
    }

    // Route general questions through Marine Agent (main agent)
    const messageTextLower = messageText.toLowerCase();
    const isGeneralQuery = !Object.keys(AGENT_DOMAINS).some(agent => 
      agent !== MAIN_AGENT && 
      AGENT_DOMAINS[agent as keyof typeof AGENT_DOMAINS].domain.toLowerCase().split('').some(char => 
        messageTextLower.includes(char)
      )
    );
    
    const routingAgent = isGeneralQuery ? MAIN_AGENT : mappedSpecialist;
    const agentConfig = AGENT_DOMAINS[routingAgent as keyof typeof AGENT_DOMAINS];
    
    console.log(`🎯 Routing to: ${routingAgent} (${agentConfig?.domain}) with KB: ${agentConfig?.kb}`);
    
    // Call Azure RAG API with proper agent routing
    let apiResponse;
    try {
      console.log(`🚀 Calling Azure RAG API: ${AZURE_RAG_API}`);
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      apiResponse = await fetch(`${AZURE_RAG_API}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: messageText,
          conversation_history: [],
          specialist: routingAgent,
          kb: agentConfig?.kb,
          domain: agentConfig?.domain,
          session_id: sessionIdValue || `azure-session-${Date.now()}`,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`Azure RAG API error: ${apiResponse.status}`);
      }

      console.log(`✅ Azure RAG API responded successfully`);
    } catch (azureError) {
      console.error(`❌ Azure RAG API failed:`, azureError);
      return res.status(500).json({
        error: "Azure RAG API failed",
        details: azureError instanceof Error ? azureError.message : "Unknown error",
        routing_agent: routingAgent,
        azure_endpoint: AZURE_RAG_API,
        suggestion: "Check Azure RAG API deployment and connectivity"
      });
    }

    // Handle Azure RAG API response
    if (apiResponse) {
      console.log("📥 Azure RAG API response status:", apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("❌ Azure RAG API error:", errorText);
        return res.status(apiResponse.status).json({
          error: `Azure RAG API error: ${errorText}`,
          routing_agent: routingAgent
        });
      }

      const responseData = await apiResponse.json();
      console.log("📦 Azure RAG API response data received");

      // Return consistent response format
      return res.status(200).json({
        response: responseData.answer || responseData.response || responseData.message || "Response received",
        text: responseData.answer || responseData.response || responseData.message || "Response received",
        sessionId: sessionIdValue,
        conversationId: sessionIdValue,
        specialist: routingAgent,
        handled_by: routingAgent,
        domain: agentConfig?.domain,
        intent: "agent_response",
        confidence: 0.9,
        agent: `SageInsure ${agentConfig?.domain} Agent`,
        data_source: "Azure OpenAI + Cognitive Search",
        routing_info: {
          routing_agent: routingAgent,
          kb_used: agentConfig?.kb,
          azure_endpoints: {
            rag_api: AZURE_RAG_API,
            openai: AZURE_OPENAI_ENDPOINT,
            search: AZURE_SEARCH_ENDPOINT
          },
          timestamp: new Date().toISOString()
        },
        sources: responseData.sources || []
      });
    }
  } catch (error) {
    console.error("💥 Azure Chat API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      routing_agent: mappedSpecialist,
      azure_endpoints: {
        rag_api: AZURE_RAG_API,
        openai: AZURE_OPENAI_ENDPOINT,
        search: AZURE_SEARCH_ENDPOINT
      },
      timestamp: new Date().toISOString()
    });
  }
}
