// Frontend integration for Azure AgentCore
// Update the frontend to use the working Azure AgentCore endpoint

const AZURE_AGENTCORE_ENDPOINT = "https://sageinsure-agent.greenforest-00f97c58.eastus.azurecontainerapps.io";

// Updated chat function for Azure AgentCore
async function sendChatMessage(message, sessionId = null) {
  try {
    const response = await fetch(`${AZURE_AGENTCORE_ENDPOINT}/invocations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: message,
        session_id: sessionId || `session-${Date.now()}`
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      answer: data.result,
      sources: [], // Azure AgentCore doesn't return sources in this format
      conversation_id: sessionId || `session-${Date.now()}`,
      agent_trace: [
        {
          agent: "azure-agentcore",
          action: "process_request",
          result: "Request processed successfully"
        }
      ],
      memory_context: {}
    };
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

// Test the integration
async function testAzureAgentCore() {
  try {
    console.log('Testing Azure AgentCore integration...');
    
    const result = await sendChatMessage("What is auto insurance?");
    console.log('Success:', result);
    
    return result;
  } catch (error) {
    console.error('Test failed:', error);
    return null;
  }
}

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sendChatMessage, testAzureAgentCore, AZURE_AGENTCORE_ENDPOINT };
}

console.log('Azure AgentCore integration loaded');
console.log('Endpoint:', AZURE_AGENTCORE_ENDPOINT);
console.log('Run testAzureAgentCore() to test the integration');