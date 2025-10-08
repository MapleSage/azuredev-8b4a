// Updated API configuration for Azure Insurance Backend
export const API_CONFIG = {
  // Azure Insurance Backend endpoint
  BACKEND_ENDPOINT: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
  
  // Agent endpoints
  AGENTS: {
    CLAIMS: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    UNDERWRITING: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    RESEARCH: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    MARINE: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    CYBER: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    FNOL: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    LIFECYCLE: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io",
    POLICY: "https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io"
  },
  
  // Request configuration
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  
  // Session management
  SESSION_STORAGE_KEY: "sageinsure_session_id"
};

// Generate or retrieve session ID
export function getSessionId() {
  let sessionId = localStorage.getItem(API_CONFIG.SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(API_CONFIG.SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

// Azure Insurance Backend chat function
export async function sendChatMessage(message, conversationHistory = [], agentType = 'CLAIMS') {
  const sessionId = getSessionId();
  const endpoint = API_CONFIG.AGENTS[agentType] || API_CONFIG.BACKEND_ENDPOINT;
  
  try {
    const response = await fetch(`${endpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        conversation_history: conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        agent_type: agentType.toLowerCase()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      answer: data.answer || "I'm sorry, I couldn't process your request.",
      sources: data.sources || [],
      conversation_id: data.conversation_id || sessionId,
      agent_trace: [{
        agent: "azure-insurance-backend",
        action: "process_request",
        result: "Success"
      }]
    };
    
  } catch (error) {
    return {
      answer: `Technical difficulties. Please try again. (${error.message})`,
      sources: [],
      conversation_id: sessionId,
      error: true
    };
  }
}