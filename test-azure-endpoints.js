#!/usr/bin/env node

// Test script to verify Azure endpoints are working
const endpoints = {
  "Marine RAG API": {
    url: "https://sageinsure-rag-api.happyriver-cf203d90.eastus.azurecontainerapps.io/chat",
    body: { message: "What is marine insurance?", conversation_history: [] }
  },
  "Claims Manager": {
    url: "https://ins-func-oyb5r3axxkh2q.azurewebsites.net/api/agent_orchestrator", 
    body: { message: "I need to file a claim", session_id: "test-123" }
  },
  "AgentCore": {
    url: "https://sageinsure-agent.greenforest-00f97c58.eastus.azurecontainerapps.io/invocations",
    body: { prompt: "Hello, what can you help me with?", session_id: "test-123" }
  },
  "AgentCore Health": {
    url: "https://sageinsure-agent.greenforest-00f97c58.eastus.azurecontainerapps.io/",
    method: "GET"
  }
};

async function testEndpoint(name, config) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`📡 URL: ${config.url}`);
  
  try {
    const options = {
      method: config.method || "POST",
      headers: { "Content-Type": "application/json" },
    };
    
    if (config.body) {
      options.body = JSON.stringify(config.body);
      console.log(`📤 Request: ${JSON.stringify(config.body, null, 2)}`);
    }
    
    const response = await fetch(config.url, options);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2));
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed: ${errorText}`);
      return false;
    }
  } catch (error) {
    console.log(`💥 Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log("🚀 Testing Azure Insurance Platform Endpoints\n");
  console.log("=" .repeat(60));
  
  let passed = 0;
  let total = 0;
  
  for (const [name, config] of Object.entries(endpoints)) {
    total++;
    const success = await testEndpoint(name, config);
    if (success) passed++;
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Test Results: ${passed}/${total} endpoints working`);
  
  if (passed === total) {
    console.log("🎉 All endpoints are working! Your system is ready.");
  } else if (passed > 0) {
    console.log("⚠️  Some endpoints are working. System has partial functionality.");
  } else {
    console.log("❌ No endpoints are working. Check your Azure deployments.");
  }
  
  console.log("\n💡 Next steps:");
  console.log("1. If endpoints are working, restart your frontend");
  console.log("2. If not working, check Azure Container Apps status");
  console.log("3. Verify environment variables are set correctly");
}

runTests().catch(console.error);