import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const agents = [
    "CLAIMS_MANAGER",
    "POLICY_ASSISTANT", 
    "MARINE_SPECIALIST",
    "CYBER_SPECIALIST",
    "FNOL_PROCESSOR",
    "UNDERWRITER",
    "RESEARCH_ASSISTANT",
    "CRM_AGENT",
    "HR_ASSISTANT",
    "MARKETING_AGENT",
    "INVESTMENT_RESEARCH",
  ];

  const testResults = [];

  for (const agent of agents) {
    try {
      const response = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/azure-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hello, can you help me?",
          conversationId: `test-${Date.now()}`,
          specialist: agent,
        }),
      });

      const data = await response.json();
      
      testResults.push({
        agent,
        status: response.ok ? "✅ Working" : "❌ Failed",
        response: data.response?.substring(0, 100) + "..." || "No response",
        confidence: data.confidence || 0,
      });
    } catch (error) {
      testResults.push({
        agent,
        status: "❌ Error",
        response: error instanceof Error ? error.message : "Unknown error",
        confidence: 0,
      });
    }
  }

  return res.status(200).json({
    message: "Agent connectivity test completed",
    timestamp: new Date().toISOString(),
    results: testResults,
    summary: {
      total: agents.length,
      working: testResults.filter(r => r.status.includes("✅")).length,
      failed: testResults.filter(r => r.status.includes("❌")).length,
    },
  });
}