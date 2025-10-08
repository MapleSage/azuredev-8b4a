import type { NextApiRequest, NextApiResponse } from "next";

// Direct ALB endpoints for your ECS services
const ALB_ENDPOINTS = {
  // Replace these with your actual ALB DNS names
  SAGEINSURE_FASTAPI:
    "http://SageInsureFargateService-XXXXX.us-east-1.elb.amazonaws.com",
  STRANDS_AGENT:
    "http://StrandsAgentFargateService-XXXXX.us-east-1.elb.amazonaws.com",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, sessionId, specialist } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("Direct ALB call with:", { message, sessionId, specialist });

    // Route to appropriate ALB based on specialist
    let targetEndpoint = ALB_ENDPOINTS.STRANDS_AGENT; // Default to Strands Agent

    // You can add routing logic here if you have different ALBs for different specialists
    // For now, using Strands Agent for all requests

    const payload = {
      inputText: message,
      sessionId: sessionId || `session-${Date.now()}`,
      specialist: specialist || "GENERAL",
    };

    console.log(`Calling ALB directly: ${targetEndpoint}`);

    // Call the ALB directly
    const albResponse = await fetch(`${targetEndpoint}/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log("ALB response status:", albResponse.status);

    if (!albResponse.ok) {
      const errorText = await albResponse.text();
      console.error("ALB error:", errorText);
      return res.status(albResponse.status).json({
        error: `ALB error: ${errorText}`,
      });
    }

    const responseData = await albResponse.json();
    console.log("ALB response data:", responseData);

    return res.status(200).json({
      response:
        responseData.response || responseData.message || "Response received",
      sessionId: responseData.sessionId || sessionId,
      specialist: specialist || "GENERAL",
      source: "ALB_DIRECT",
    });
  } catch (error) {
    console.error("ALB Direct API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
