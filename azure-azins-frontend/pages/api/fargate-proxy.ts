import type { NextApiRequest, NextApiResponse } from "next";

// ECS Fargate endpoint for your FastAPI + Strands Agents backend
const FARGATE_ENDPOINT =
  process.env.FASTAPI_URL ||
  "http://SageIn-SageI-FjF1fDChCoaJ-2065237113.us-east-1.elb.amazonaws.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { agent } = req.query;
  const { text, conversationId } = req.body;

  // Handle agent parameter (can be string or string[])
  const agentType = Array.isArray(agent) ? agent[0] : agent;

  try {
    // Extract JWT token from Authorization header or cookies
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

    // Call your ECS Fargate FastAPI backend
    const fargateResponse = await fetch(`${FARGATE_ENDPOINT}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken ? `Bearer ${authToken}` : "",
        "X-Agent-Type": agentType || "POLICY_ASSISTANT",
      },
      body: JSON.stringify({
        text: text,
        specialist: agentType,
        conversationId: conversationId || "web-session",
      }),
    });

    if (fargateResponse.ok) {
      const data = await fargateResponse.json();

      // Return in the format expected by your frontend
      res.status(200).json({
        handled_by: data.handled_by || agentType || "POLICY_ASSISTANT",
        response:
          data.response || "I'm here to help with your insurance needs.",
        citations: data.citations || [],
        attachments: data.attachments || [],
        domain: data.domain,
        intent: data.intent,
        confidence: data.confidence,
        status: data.status,
      });
    } else {
      console.error(
        "Fargate error:",
        fargateResponse.status,
        fargateResponse.statusText
      );
      const errorText = await fargateResponse.text();
      console.error("Fargate error body:", errorText);

      res.status(502).json({
        error: "Fargate service error",
        detail: `${fargateResponse.status}: ${fargateResponse.statusText}`,
        handled_by: agentType || "POLICY_ASSISTANT",
        response:
          "I'm experiencing technical difficulties connecting to the backend. Please try again.",
        citations: [],
        attachments: [],
      });
    }
  } catch (e: any) {
    console.error("Fargate proxy error:", e);
    res.status(502).json({
      error: "Fargate unreachable",
      detail: e?.message,
      handled_by: agentType || "POLICY_ASSISTANT",
      response:
        "I'm unable to connect to the backend services. Please check your connection and try again.",
      citations: [],
      attachments: [],
    });
  }
}
