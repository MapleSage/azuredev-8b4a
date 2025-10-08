/**
 * Azure Proxy API
 * Routes requests to the specialist router which uses comprehensive existing APIs
 */

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { agent } = req.query;
  const { conversationId, text, specialist, context } = req.body;

  if (!agent || !text || !conversationId) {
    return res.status(400).json({
      error: "Missing required parameters",
      required: ["agent", "text", "conversationId"],
    });
  }

  try {
    console.log(`🔄 Proxying ${agent} request to specialist router...`);

    // Route to the specialist router
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(
      `${baseUrl}/api/specialist-router?agent=${agent}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.authorization || "",
        },
        body: JSON.stringify({
          conversationId,
          text,
          context: context || [],
          specialist: agent,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${agent} response received from specialist router`);
      return res.status(200).json(data);
    } else {
      throw new Error(`Specialist router error: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`❌ Azure proxy error for ${agent}:`, error);

    // Generate fallback response
    const fallbackResponse = generateFallbackResponse(agent as string, text);

    res.status(200).json({
      response: fallbackResponse,
      specialist: agent as string,
      sources: [],
      confidence: 0.3,
      tokens_used: 0,
      timestamp: new Date().toISOString(),
      handled_by: agent,
      conversationId,
      fallback_used: true,
      fallback_reason: error.message,
      backend: "fallback",
    });
  }
}

function generateFallbackResponse(agent: string, text: string): string {
  const fallbackResponses: Record<string, string> = {
    CLAIMS_CHAT:
      "I'm currently experiencing technical difficulties with our claims system. For immediate claims assistance, please contact our claims department at 1-800-CLAIMS.",
    CYBER_INSURANCE:
      "Our cyber insurance systems are temporarily unavailable. For urgent cyber security matters, please contact our specialized cyber team.",
    FNOL_PROCESSOR:
      "I cannot access our FNOL system right now. For immediate incident reporting, please call our emergency line at 1-800-EMERGENCY.",
    POLICY_ASSISTANT:
      "I'm experiencing technical difficulties accessing policy information. Please contact customer service at 1-800-POLICY.",
    RESEARCH_ASSISTANT:
      "Our research databases are currently unavailable. Please try again later or contact our research team directly.",
    UNDERWRITING:
      "Our underwriting system is currently offline. Please contact your agent or our underwriting department.",
    CLAIMS_LIFECYCLE:
      "Our claims tracking system is temporarily offline. Please contact your claims adjuster directly.",
  };

  return (
    fallbackResponses[agent] ||
    "I'm experiencing technical difficulties. Please try again or contact customer service for assistance."
  );
}
