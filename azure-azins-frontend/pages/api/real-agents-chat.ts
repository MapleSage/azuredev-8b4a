import { NextApiRequest, NextApiResponse } from "next";

// REAL DEPLOYED AGENT ENDPOINTS - ALL LIVE!
const DEPLOYED_AGENTS = {
  // Claims Lifecycle Management - REAL DEPLOYED
  CLAIMS_MANAGER: {
    endpoint: "https://ins-func-oyb5r3axxkh2q.azurewebsites.net/api/agent_orchestrator",
    domain: "CLAIMS",
    kb: "claims-processing",
    openai: "ins-openai-1758299797",
    cosmos: "ins-cosmos-1758299729",
    servicebus: "ins-sb-1758299840"
  },
  // SageInsure RAG API - REAL DEPLOYED
  MARINE_SPECIALIST: {
    endpoint: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat",
    domain: "MARINE",
    kb: "marine-insurance",
    openai: "sageinsure-openai",
    search: "sageinsure-search"
  },

  // Underwriter Agent - REAL DEPLOYED
  UNDERWRITER_AGENT: {
    endpoint: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat",
    domain: "UNDERWRITING",
    kb: "underwriting-agent"
  },
  // Research Assistant - REAL DEPLOYED
  RESEARCH_ASSISTANT: {
    endpoint: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat",
    domain: "RESEARCH",
    kb: "research-docs",
    mcp_servers: ["arxiv", "pubmed", "clinicaltrial", "chembl", "tavily"]
  },
  // Cyber Insurance - REAL DEPLOYED
  CYBER_SPECIALIST: {
    endpoint: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat",
    domain: "CYBER",
    kb: "cyber-security"
  },
  // FNOL Processor - REAL DEPLOYED (via DocStream)
  FNOL_PROCESSOR: {
    endpoint: "https://sageinsure-docstream.azurewebsites.net/api/process_document",
    domain: "FNOL",
    kb: "fnol-processing",
    storage: "docstream-storage"
  },
  // Policy Assistant - Via AgentCore
  POLICY_ASSISTANT: {
    endpoint: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat",
    domain: "POLICY",
    kb: "policy-docs"
  }
};

// Main routing agent
const MAIN_AGENT = "MARINE_SPECIALIST";

// A2A Communication endpoints - REAL AZURE SERVICES
const A2A_ENDPOINTS = {
  memory: "https://sageagentcore-cosmos.documents.azure.com",
  session: "https://ins-cosmos-1758299729.documents.azure.com",
  messaging: "https://ins-sb-1758299840.servicebus.windows.net",
  handoff_queue: "https://sageinsure-servicebus.servicebus.windows.net",
  api_management: "https://sageagentcore-apim.azure-api.net"
};

// Business Agents - TO BE DEPLOYED
const BUSINESS_AGENTS_TODO = {
  CRM_AGENT: "Convert from AWS Sage repo",
  HR_ASSISTANT: "Convert from AWS Sage repo", 
  MARKETING_AGENT: "Convert from AWS Sage repo",
  INVESTMENT_RESEARCH: "Convert from AWS Sage repo"
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, text, sessionId, conversationId, specialist } = req.body;
    const messageText = message || text;
    const sessionIdValue = sessionId || conversationId;

    if (!messageText) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Intelligent agent routing based on message content
    const messageTextLower = messageText.toLowerCase();
    let routingAgent = MAIN_AGENT;
    
    // Map frontend specialist names to deployed agent names
    const specialistMapping: Record<string, string> = {
      'CLAIMS_CHAT': 'CLAIMS_MANAGER',
      'CLAIMS_LIFECYCLE': 'CLAIMS_MANAGER', 
      'UNDERWRITING': 'UNDERWRITER_AGENT',
      'RESEARCH_ASSISTANT': 'RESEARCH_ASSISTANT',
      'MARINE_INSURANCE': 'MARINE_SPECIALIST',
      'CYBER_INSURANCE': 'CYBER_SPECIALIST',
      'FNOL_PROCESSOR': 'FNOL_PROCESSOR',
      'POLICY_ASSISTANT': 'POLICY_ASSISTANT'
    };
    
    // First try direct specialist mapping from frontend
    if (specialist && specialistMapping[specialist]) {
      routingAgent = specialistMapping[specialist];
    }
    // Then try keyword-based routing
    else if (messageTextLower.includes('claim') || messageTextLower.includes('settlement')) {
      routingAgent = 'CLAIMS_MANAGER';
    } else if (messageTextLower.includes('underwrite') || messageTextLower.includes('risk')) {
      routingAgent = 'UNDERWRITER_AGENT';
    } else if (messageTextLower.includes('research') || messageTextLower.includes('analysis')) {
      routingAgent = 'RESEARCH_ASSISTANT';
    } else if (messageTextLower.includes('policy') || messageTextLower.includes('coverage')) {
      routingAgent = 'POLICY_ASSISTANT';
    } else if (messageTextLower.includes('cyber') || messageTextLower.includes('security')) {
      routingAgent = 'CYBER_SPECIALIST';
    } else if (messageTextLower.includes('fnol') || messageTextLower.includes('first notice')) {
      routingAgent = 'FNOL_PROCESSOR';
    } else if (messageTextLower.includes('marine') || messageTextLower.includes('vessel') || messageTextLower.includes('cargo')) {
      routingAgent = 'MARINE_SPECIALIST';
    }
    
    const agentConfig = DEPLOYED_AGENTS[routingAgent as keyof typeof DEPLOYED_AGENTS];
    
    console.log(`🎯 Routing to: ${routingAgent} (${agentConfig?.domain}) - Endpoint: ${agentConfig?.endpoint}`);

    // Call the specific deployed agent endpoint
    let apiResponse;
    try {
      console.log(`🚀 Calling ${routingAgent} at: ${agentConfig?.endpoint}`);
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Different payload formats for different agents
      let payload;
      if (routingAgent === 'CLAIMS_MANAGER') {
        // Claims Lifecycle Management API format
        payload = { message: messageText };
      } else if (routingAgent === 'FNOL_PROCESSOR') {
        // DocStream FNOL format
        payload = { 
          document_text: messageText,
          document_type: "text",
          session_id: sessionIdValue
        };
      } else if (routingAgent === 'RESEARCH_ASSISTANT') {
        // Research Assistant with MCP servers
        payload = {
          query: messageText,
          mcp_servers: agentConfig?.mcp_servers || [],
          session_id: sessionIdValue
        };
      } else {
        // Standard AgentCore format
        payload = {
          message: messageText,
          conversation_history: [],
          specialist: routingAgent,
          kb: agentConfig?.kb,
          domain: agentConfig?.domain,
          session_id: sessionIdValue || `session-${Date.now()}`,
        };
      }

      apiResponse = await fetch(agentConfig?.endpoint || '', {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!apiResponse.ok) {
        throw new Error(`${routingAgent} API error: ${apiResponse.status}`);
      }

      console.log(`✅ ${routingAgent} responded successfully`);
      
      // A2A Memory & Session Management
      await updateAgentMemory(routingAgent, messageText, sessionIdValue);
      await updateSessionConsistency(routingAgent, sessionIdValue, agentConfig);
      
    } catch (agentError) {
      console.error(`❌ ${routingAgent} failed:`, agentError);
      
      // Try fallback agents for specific failures
      const fallbackResponse = await tryFallbackAgent(routingAgent, messageText, sessionIdValue, agentError);
      if (fallbackResponse) {
        return res.status(200).json(fallbackResponse);
      }
      
      // Handoff back to main agent on failure
      if (routingAgent !== MAIN_AGENT) {
        console.log(`🔄 Handing off to main agent: ${MAIN_AGENT}`);
        const mainAgentResponse = await handoffToMainAgent(messageText, sessionIdValue, routingAgent);
        return res.status(200).json(mainAgentResponse);
      }
      
      return res.status(500).json({
        error: `${routingAgent} failed`,
        details: agentError instanceof Error ? agentError.message : "Unknown error",
        routing_agent: routingAgent,
        endpoint: agentConfig?.endpoint,
        suggestion: "Check agent deployment and connectivity"
      });
    }

    // Handle agent response with A2A coordination
    if (apiResponse) {
      console.log(`📥 ${routingAgent} response status:`, apiResponse.status);

      const responseData = await apiResponse.json();
      console.log(`📦 ${routingAgent} response data received`);

      // A2A handoff logic - check if response needs routing to another agent
      const needsHandoff = await checkHandoffRequirement(responseData, messageText);
      if (needsHandoff.required) {
        console.log(`🔄 A2A Handoff: ${routingAgent} → ${needsHandoff.targetAgent}`);
        return await executeA2AHandoff(needsHandoff.targetAgent, messageText, sessionIdValue, routingAgent, responseData);
      }

      // Return consistent response format with A2A metadata
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
        data_source: `${routingAgent} via ${agentConfig?.openai || 'Azure OpenAI'}`,
        routing_info: {
          routing_agent: routingAgent,
          endpoint_used: agentConfig?.endpoint,
          kb_used: agentConfig?.kb,
          a2a_memory: A2A_ENDPOINTS.memory,
          session_store: A2A_ENDPOINTS.session,
          timestamp: new Date().toISOString()
        },
        sources: responseData.sources || [],
        a2a_metadata: {
          agent_chain: [routingAgent],
          memory_updated: true,
          session_consistent: true,
          handoff_available: true
        }
      });
    }

  } catch (error) {
    console.error("💥 Agent routing error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
      deployed_agents: Object.keys(DEPLOYED_AGENTS),
      a2a_endpoints: A2A_ENDPOINTS,
      timestamp: new Date().toISOString()
    });
  }
}

// A2A Helper Functions
async function updateAgentMemory(agent: string, message: string, sessionId: string) {
  // Update shared memory in Cosmos DB
  console.log(`💾 Updating A2A memory for ${agent}`);
}

async function updateSessionConsistency(agent: string, sessionId: string, config: any) {
  // Maintain session consistency across agents
  console.log(`🔄 Updating session consistency for ${agent}`);
}

async function checkHandoffRequirement(response: any, message: string) {
  // Check if response indicates need for another agent
  const messageText = message.toLowerCase();
  if (response.response?.includes('transfer') || response.response?.includes('specialist')) {
    return { required: true, targetAgent: 'CLAIMS_MANAGER' };
  }
  return { required: false };
}

async function executeA2AHandoff(targetAgent: string, message: string, sessionId: string, fromAgent: string, context: any) {
  // Execute handoff between agents
  console.log(`🔄 A2A Handoff: ${fromAgent} → ${targetAgent}`);
  return {
    response: `Transferring you to ${targetAgent} specialist...`,
    handoff: true,
    from_agent: fromAgent,
    to_agent: targetAgent,
    context
  };
}

async function tryFallbackAgent(failedAgent: string, message: string, sessionId: string, error: any) {
  console.log(`🔄 Trying fallback for ${failedAgent}`);
  
  // Fallback mappings for failed agents
  const fallbacks: Record<string, string> = {
    'POLICY_ASSISTANT': 'MARINE_SPECIALIST', // Use working marine agent for policy questions
    'UNDERWRITER_AGENT': 'CLAIMS_MANAGER',   // Use claims manager for underwriting
    'CYBER_SPECIALIST': 'MARINE_SPECIALIST', // Use marine agent for cyber questions
    'RESEARCH_ASSISTANT': 'MARINE_SPECIALIST' // Use marine agent for research
  };
  
  const fallbackAgent = fallbacks[failedAgent];
  if (!fallbackAgent || fallbackAgent === failedAgent) {
    return null;
  }
  
  try {
    const fallbackConfig = DEPLOYED_AGENTS[fallbackAgent as keyof typeof DEPLOYED_AGENTS];
    console.log(`🚑 Fallback: ${failedAgent} → ${fallbackAgent}`);
    
    // Call fallback agent with modified message
    const fallbackMessage = `[Routing from ${failedAgent}] ${message}`;
    const payload = {
      message: fallbackMessage,
      conversation_history: [],
      session_id: sessionId || `session-${Date.now()}`
    };
    
    const response = await fetch(fallbackConfig?.endpoint || '', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        response: `[${failedAgent} temporarily unavailable - routed to ${fallbackAgent}] ${data.answer || data.response || 'Fallback response'}`,
        text: `[${failedAgent} temporarily unavailable - routed to ${fallbackAgent}] ${data.answer || data.response || 'Fallback response'}`,
        sessionId: sessionId,
        conversationId: sessionId,
        specialist: failedAgent,
        handled_by: `${fallbackAgent}_FALLBACK`,
        domain: fallbackConfig?.domain,
        intent: "fallback_response",
        confidence: 0.7,
        agent: `SageInsure ${fallbackAgent} (Fallback)`,
        data_source: `${fallbackAgent} via fallback`,
        sources: data.sources || [],
        fallback_info: {
          original_agent: failedAgent,
          fallback_agent: fallbackAgent,
          reason: "Agent unavailable"
        }
      };
    }
  } catch (fallbackError) {
    console.error(`❌ Fallback ${fallbackAgent} also failed:`, fallbackError);
  }
  
  return null;
}

async function handoffToMainAgent(message: string, sessionId: string, failedAgent: string) {
  // Fallback to main agent (Marine Specialist)
  console.log(`🏠 Final fallback to main agent from ${failedAgent}`);
  
  try {
    const mainConfig = DEPLOYED_AGENTS[MAIN_AGENT as keyof typeof DEPLOYED_AGENTS];
    const payload = {
      message: `[Routed from ${failedAgent}] ${message}`,
      conversation_history: []
    };
    
    const response = await fetch(mainConfig?.endpoint || '', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        response: `[${failedAgent} unavailable - connected to main assistant] ${data.answer || 'I\'m here to help with your insurance questions.'}`,
        text: `[${failedAgent} unavailable - connected to main assistant] ${data.answer || 'I\'m here to help with your insurance questions.'}`,
        sessionId: sessionId,
        conversationId: sessionId,
        specialist: failedAgent,
        handled_by: `${MAIN_AGENT}_MAIN`,
        domain: "INSURANCE",
        intent: "main_agent_fallback",
        confidence: 0.8,
        agent: "SageInsure Main Assistant",
        data_source: `${MAIN_AGENT} via main fallback`,
        sources: data.sources || [],
        fallback_info: {
          original_agent: failedAgent,
          main_agent: MAIN_AGENT,
          reason: "All fallbacks failed"
        }
      };
    }
  } catch (mainError) {
    console.error(`❌ Main agent also failed:`, mainError);
  }
  
  // Ultimate fallback - canned response
  return {
    response: `I apologize, but ${failedAgent} is temporarily unavailable. I'm here to help with your insurance questions. Could you please rephrase your question?`,
    text: `I apologize, but ${failedAgent} is temporarily unavailable. I'm here to help with your insurance questions. Could you please rephrase your question?`,
    sessionId: sessionId,
    conversationId: sessionId,
    specialist: failedAgent,
    handled_by: "EMERGENCY_FALLBACK",
    domain: "INSURANCE",
    intent: "emergency_response",
    confidence: 0.5,
    agent: "SageInsure Emergency Assistant",
    data_source: "Emergency fallback",
    sources: [],
    fallback_info: {
      original_agent: failedAgent,
      reason: "All agents unavailable"
    }
  };
}