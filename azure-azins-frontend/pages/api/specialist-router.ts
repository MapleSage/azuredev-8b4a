import { NextApiRequest, NextApiResponse } from "next";
import { availableTools } from './a2a-tools';

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === 'true';

// A2A Tool execution helper
async function executeA2ATool(tool: string, parameters: any, agent: string, sessionId: string) {
  try {
    const response = await fetch('/api/a2a-tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        parameters,
        requestingAgent: agent,
        sessionId
      })
    });
    
    if (!response.ok) {
      throw new Error(`A2A tool failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`A2A tool execution failed:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Mock specialist responses for local development
const specialistMockResponses = {
  CLAIMS_MANAGER: {
    domain: "CLAIMS",
    capabilities: ["claim_filing", "claim_status", "damage_assessment", "settlement_negotiation"],
    greeting: "I'm your Claims Manager. I can help you file claims, check claim status, assess damage, and handle settlements.",
    tools: ["time", "calculator", "file_operations", "memory"]
  },
  MARINE_SPECIALIST: {
    domain: "MARINE",
    capabilities: ["cargo_claims", "vessel_insurance", "maritime_law", "port_operations"],
    greeting: "I'm your Marine Insurance Specialist. I handle cargo claims, vessel insurance, and maritime operations.",
    tools: ["time", "calculator", "weather", "http_request"]
  },
  CYBER_SPECIALIST: {
    domain: "CYBER",
    capabilities: ["data_breach", "cyber_attacks", "security_assessment", "incident_response"],
    greeting: "I'm your Cyber Insurance Specialist. I handle data breaches, cyber attacks, and security incidents.",
    tools: ["time", "calculator", "http_request", "code_interpreter"]
  },
  UNDERWRITER: {
    domain: "UNDERWRITING",
    capabilities: ["risk_assessment", "policy_pricing", "coverage_analysis", "application_review"],
    greeting: "I'm your Underwriting Specialist. I assess risks, price policies, and review applications.",
    tools: ["time", "calculator", "file_operations", "memory"]
  },
  RESEARCH_ASSISTANT: {
    domain: "RESEARCH",
    capabilities: ["market_analysis", "trend_research", "competitive_intelligence", "data_analysis"],
    greeting: "I'm your Research Assistant. I provide market analysis, trend research, and competitive intelligence.",
    tools: ["time", "calculator", "http_request", "browser"]
  },
  FNOL_PROCESSOR: {
    domain: "FNOL",
    capabilities: ["first_notice", "incident_logging", "initial_assessment", "claim_routing"],
    greeting: "I'm your FNOL Processor. I handle first notice of loss, incident logging, and initial assessments.",
    tools: ["time", "calculator", "file_operations", "memory"]
  },
  POLICY_ASSISTANT: {
    domain: "POLICY",
    capabilities: ["policy_management", "coverage_explanation", "endorsements", "renewals"],
    greeting: "I'm your Policy Assistant. I help with policy management, coverage explanations, and renewals.",
    tools: ["time", "calculator", "file_operations", "memory"]
  },
  CRM_AGENT: {
    domain: "CRM",
    capabilities: ["customer_management", "relationship_tracking", "communication_history", "lead_management"],
    greeting: "I'm your CRM Agent. I manage customer relationships, track communications, and handle leads.",
    tools: ["time", "calculator", "memory", "http_request"]
  },
  HR_ASSISTANT: {
    domain: "HR",
    capabilities: ["employee_management", "benefits_administration", "compliance", "recruitment"],
    greeting: "I'm your HR Assistant. I handle employee management, benefits, compliance, and recruitment.",
    tools: ["time", "calculator", "file_operations", "memory"]
  },
  MARKETING_AGENT: {
    domain: "MARKETING",
    capabilities: ["campaign_management", "lead_generation", "analytics", "content_creation"],
    greeting: "I'm your Marketing Agent. I manage campaigns, generate leads, and create content.",
    tools: ["time", "calculator", "http_request", "browser"]
  },
  INVESTMENT_RESEARCH: {
    domain: "INVESTMENT",
    capabilities: ["market_analysis", "portfolio_management", "risk_assessment", "performance_tracking"],
    greeting: "I'm your Investment Research Agent. I analyze markets, manage portfolios, and track performance.",
    tools: ["time", "calculator", "http_request", "browser"]
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text, specialist, sessionId } = req.body;
  const routingMode = isDevelopment ? "LOCAL" : "PRODUCTION";

  console.log(`🔀 Specialist Router [${routingMode}]:`, {
    specialist,
    text: text?.substring(0, 50) + "...",
    sessionId
  });

  if (!text) {
    return res.status(400).json({ error: "Message text is required" });
  }

  if (!specialist) {
    return res.status(400).json({ error: "Specialist is required" });
  }

  // Development mode - use local mock responses
  if (isDevelopment) {
    const specialistConfig = specialistMockResponses[specialist as keyof typeof specialistMockResponses];
    
    if (!specialistConfig) {
      return res.status(400).json({ 
        error: `Unknown specialist: ${specialist}`,
        available_specialists: Object.keys(specialistMockResponses),
        routing_mode: "LOCAL_DEVELOPMENT"
      });
    }

    // Generate domain-appropriate response
    let response = "";
    const query = text.toLowerCase();

    // A2A Tool-based responses
    if (query.includes("time") || query.includes("date")) {
      const toolResult = await executeA2ATool('time', {}, specialist, sessionId);
      if (toolResult.success) {
        response = `[${specialist}] ${toolResult.result.formatted}. ${specialistConfig.greeting}`;
      } else {
        response = `[${specialist}] I couldn't get the current time. ${specialistConfig.greeting}`;
      }
    }
    else if (query.includes("calculate") || /[\d+\-*/]/.test(query)) {
      // Extract mathematical expression
      const mathMatch = query.match(/[\d+\-*/.() ]+/);
      if (mathMatch) {
        const toolResult = await executeA2ATool('calculator', { expression: mathMatch[0].trim() }, specialist, sessionId);
        if (toolResult.success) {
          response = `[${specialist}] ${toolResult.result.formatted}. How else can I help with ${specialistConfig.domain.toLowerCase()}?`;
        } else {
          response = `[${specialist}] I couldn't calculate that expression. ${specialistConfig.greeting}`;
        }
      } else {
        response = `[${specialist}] I can help with calculations related to ${specialistConfig.domain.toLowerCase()}. ${specialistConfig.greeting}`;
      }
    }
    else if (query.includes("weather")) {
      const toolResult = await executeA2ATool('weather', { city: 'Dubai' }, specialist, sessionId);
      if (toolResult.success) {
        response = `[${specialist}] Weather: ${toolResult.result.temperature}, ${toolResult.result.condition}. ${specialistConfig.greeting}`;
      } else {
        response = `[${specialist}] I couldn't get weather information. ${specialistConfig.greeting}`;
      }
    }
    else if (query.includes("remember") || query.includes("store")) {
      const toolResult = await executeA2ATool('memory', { 
        operation: 'store', 
        key: `user_query_${Date.now()}`, 
        value: text,
        category: 'user_interactions'
      }, specialist, sessionId);
      if (toolResult.success) {
        response = `[${specialist}] I've stored that information. ${specialistConfig.greeting}`;
      } else {
        response = `[${specialist}] I couldn't store that information. ${specialistConfig.greeting}`;
      }
    }
    else if (query.includes("hello") || query.includes("hi")) {
      response = `[${specialist}] Hello! ${specialistConfig.greeting}`;
    }
    else {
      // Domain-specific responses
      switch (specialist) {
        case "CLAIMS_MANAGER":
          response = query.includes("claim") 
            ? `[CLAIMS] I can help you file a claim. Please provide details about the incident, date, and estimated damages.`
            : `[CLAIMS] ${specialistConfig.greeting} How can I assist with your claim today?`;
          break;
        case "MARINE_SPECIALIST":
          response = query.includes("cargo") || query.includes("ship")
            ? `[MARINE] I'll help with your marine insurance matter. Please provide vessel details, cargo information, and incident location.`
            : `[MARINE] ${specialistConfig.greeting} What marine insurance matter can I help with?`;
          break;
        case "CYBER_SPECIALIST":
          response = query.includes("breach") || query.includes("hack")
            ? `[CYBER] I'll assist with your cyber security incident. Please describe the nature of the breach and affected systems.`
            : `[CYBER] ${specialistConfig.greeting} What cyber security matter needs attention?`;
          break;
        default:
          response = `[${specialist}] ${specialistConfig.greeting} How can I help you today?`;
      }
    }

    return res.status(200).json({
      response,
      text: response,
      sessionId: sessionId || `local-${Date.now()}`,
      conversationId: sessionId || `local-${Date.now()}`,
      specialist,
      handled_by: specialist,
      domain: specialistConfig.domain,
      intent: "local_development_response",
      confidence: 0.95,
      agent: `${specialist} (Local Development)`,
      data_source: "Local Mock Handler",
      routing_info: {
        mode: "LOCAL_DEVELOPMENT",
        capabilities: specialistConfig.capabilities,
        available_tools: specialistConfig.tools,
        a2a_tools: Object.keys(availableTools),
        timestamp: new Date().toISOString()
      },
      tools_available: specialistConfig.tools,
      a2a_tools_available: Object.keys(availableTools).filter(tool => 
        availableTools[tool as keyof typeof availableTools].agents.includes('*') || 
        availableTools[tool as keyof typeof availableTools].agents.includes(specialist)
      )
    });
  }

  // Production mode - return error since we want explicit configuration
  return res.status(503).json({
    error: "Production API routing not configured",
    message: "This is intentional - production APIs require explicit configuration",
    routing_mode: "PRODUCTION_DISABLED",
    specialist,
    suggestion: "Enable production mode in environment variables or use development mode for testing"
  });
}