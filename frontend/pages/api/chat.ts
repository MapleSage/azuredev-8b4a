import { NextApiRequest, NextApiResponse } from "next";

// Local development endpoint - Updated for new FastAPI architecture
const LOCAL_FASTAPI_ENDPOINT = "http://localhost:8002";

// Production FastAPI endpoint (ALB)
const PRODUCTION_FASTAPI_ENDPOINT =
  process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT ||
  "http://SageIn-SageI-FjF1fDChCoaJ-2065237113.us-east-1.elb.amazonaws.com";



// Legacy AgentCore API endpoint (fallback)
const AGENTCORE_API_URL =
  process.env.NEXT_PUBLIC_AGENTCORE_API_URL ||
  "https://kb3k29pee8.execute-api.us-east-1.amazonaws.com/prod";

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

    console.log("Chat API called with:", {
      messageText,
      sessionIdValue,
      specialistValue,
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

    // For Claims Chat, use our enhanced logic directly
    let apiResponse;
    if (mappedSpecialist === "CLAIMS_MANAGER") {
      console.log("Using enhanced Claims Chat logic...");
      
      // Handle non-insurance queries directly
      const nonInsuranceKeywords = ["weather", "hello", "hi", "crap", "stupid", "useless", "401k", "retirement"];
      const insuranceKeywords = ["insurance", "claim", "policy", "coverage", "marine", "auto", "cyber", "health", "life"];
      
      const messageTextLower = messageText.toLowerCase();
      const isNonInsurance = nonInsuranceKeywords.some(word => messageTextLower.includes(word)) && 
                             !insuranceKeywords.some(word => messageTextLower.includes(word));
      
      if (isNonInsurance) {
        // Handle directly without calling external services
        let directResponse = "";
        
        if (messageTextLower.includes("weather")) {
          directResponse = "I don't have access to weather information, but I can help you with weather-related insurance claims! If you've experienced storm damage, flooding, or other weather-related losses, I can guide you through filing a claim. What type of weather damage are you dealing with?";
        } else if (["crap", "stupid", "useless"].some(word => messageTextLower.includes(word))) {
          directResponse = "I understand your frustration! Let me help you directly instead of sending you elsewhere.\n\n🚀 **I can assist you right now with:**\n\n• **Filing any type of claim** - Just tell me what happened\n• **Checking your coverage** - I'll explain what's covered\n• **Getting claim status** - Track your existing claims\n• **Answering questions** - No need to switch tabs\n\nWhat insurance issue can I help resolve for you?";
        } else if (["hello", "hi"].some(word => messageTextLower.includes(word))) {
          directResponse = "Hello! I'm your SageInsure Claims Chat assistant. I can help you directly with:\n\n🚢 **Marine Claims** - Cargo damage, vessel incidents\n🚗 **Auto Claims** - Accidents, collision repairs\n🔒 **Cyber Claims** - Data breaches, security incidents\n🏥 **Health Claims** - Medical coverage, treatments\n💼 **Life Claims** - Beneficiary claims, policy questions\n\nWhat insurance matter can I help you with today?";
        } else {
          directResponse = "I'm your SageInsure Claims Chat assistant. I can help with insurance claims, coverage questions, and policy information. What do you need assistance with?";
        }
        
        return res.status(200).json({
          response: directResponse,
          text: directResponse,
          sessionId: sessionIdValue,
          conversationId: sessionIdValue,
          specialist: "CLAIMS_MANAGER",
          handled_by: "CLAIMS_MANAGER",
          domain: "GENERAL",
          intent: "direct_assistance",
          confidence: 0.9,
          agent: "SageInsure Claims Chat",
          data_source: "Direct Logic"
        });
      }
    }
    
    // Try Azure Agent Tools first, then fallback to other services
    try {
      console.log("Using Azure Agent Tools...");
      
      // Use internal Azure Chat API with tools
      const azureResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/azure-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: messageText,
          conversationId: sessionIdValue || `session-${Date.now()}`,
          specialist: mappedSpecialist,
        }),
      });

      if (azureResponse.ok) {
        const azureData = await azureResponse.json();
        console.log("✅ Azure Agent Tools responded successfully");
        return res.status(200).json(azureData);
      }
      
      throw new Error(`Azure Tools error: ${azureResponse.status}`);
    } catch (azureError) {
      console.log("Azure Tools failed, trying Production ALB FastAPI...", azureError);
      
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`;
        }

        apiResponse = await fetch(`${PRODUCTION_FASTAPI_ENDPOINT}/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            text: messageText,
            conversationId: sessionIdValue || `session-${Date.now()}`,
            specialist: mappedSpecialist,
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`ALB FastAPI error: ${apiResponse.status}`);
        }

        console.log("✅ Production ALB FastAPI responded successfully");
      } catch (albError) {
        console.log("ALB FastAPI failed, using specialist router...", albError);
        
        try {
          // Use specialist router as fallback
          apiResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/specialist-router`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: messageText,
              specialist: mappedSpecialist,
              sessionId: sessionIdValue || `session-${Date.now()}`,
            }),
          });
          
          if (!apiResponse.ok) {
            throw new Error(`Specialist router error: ${apiResponse.status}`);
          }
          
          console.log("✅ Specialist router responded successfully");
        } catch (routerError) {
          console.log("Specialist router also failed, generating direct response...", routerError);
          
          // Final fallback - generate response directly
          const directResponse = generateDirectResponse(messageText, mappedSpecialist);
          return res.status(200).json(directResponse);
        }
      }
    }

    if (apiResponse) {
      console.log("API response status:", apiResponse.status);

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error("API error:", errorText);
        
        // Generate fallback response instead of returning error
        const fallbackResponse = generateDirectResponse(messageText, mappedSpecialist);
        return res.status(200).json(fallbackResponse);
      }

      const responseData = await apiResponse.json();
      console.log("API response data:", responseData);

      // Enhanced response handling for new FastAPI architecture
      return res.status(200).json({
        response:
          responseData.response || responseData.message || "Response received",
        text:
          responseData.response || responseData.message || "Response received",
        sessionId: responseData.conversationId || sessionIdValue,
        conversationId: responseData.conversationId || sessionIdValue,
        specialist: responseData.handled_by || mappedSpecialist,
        handled_by: responseData.handled_by || mappedSpecialist,
        // Enhanced metadata from new architecture
        domain: responseData.domain,
        intent: responseData.intent,
        confidence: responseData.confidence,
        agent: responseData.agent || "SageInsure AI",
        data_source: responseData.data_source,
        routing_info: responseData.routing_info,
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    
    // Generate helpful response even on error
    const errorResponse = generateDirectResponse(
      req.body.message || req.body.text || "Hello", 
      req.body.specialist || "CLAIMS_MANAGER"
    );
    
    return res.status(200).json({
      ...errorResponse,
      error_handled: true,
      original_error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Direct response generator for ultimate fallback
function generateDirectResponse(text: string, specialist: string) {
  const specialistName = specialist.replace(/_/g, " ").toLowerCase();
  
  return {
    response: `Hello! I'm your ${specialistName} assistant. While I'm experiencing some connectivity issues with our main systems, I'm still here to help you.\n\n**I can assist you with:**\n• General guidance about ${specialistName}\n• Answer common questions\n• Direct you to the right resources\n• Provide immediate support\n\n**For urgent matters:**\n• Call our 24/7 hotline: 1-800-SAGE-INS\n• Visit: sageinsure.com\n• Email: help@sageinsure.com\n\nPlease tell me how I can help you with ${specialistName} today!`,
    text: `I'm your ${specialistName} assistant, ready to help despite some system connectivity issues.`,
    sessionId: `session-${Date.now()}`,
    conversationId: `session-${Date.now()}`,
    specialist: specialist,
    handled_by: specialist,
    domain: specialistName,
    intent: "general_assistance",
    confidence: 0.8,
    agent: `${specialistName} Assistant`,
    data_source: "Direct Response Generator",
    status: "fallback_success",
  };
}
