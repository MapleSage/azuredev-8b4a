import type { NextApiRequest, NextApiResponse } from "next";

const PRIVATE_AGENTCORE_ENDPOINT =
  process.env.AGENTCORE_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT ||
  "http://127.0.0.1:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, sessionId, specialist } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const payload = {
      text: message,
      conversationId: sessionId || `session-${Date.now()}`,
      specialist: specialist || "POLICY_ASSISTANT",
    };

    const backendResponse = await fetch(`${PRIVATE_AGENTCORE_ENDPOINT}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization || "",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(
        Number(process.env.AGENTCORE_CHAT_TIMEOUT_MS || 45000),
      ),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return res.status(backendResponse.status).json({
        error: `Private workflow error: ${errorText}`,
      });
    }

    const responseData = await backendResponse.json();

    return res.status(200).json({
      response:
        responseData.answer ||
        responseData.response ||
        responseData.message ||
        "Response received",
      sessionId:
        responseData.conversation_id || responseData.sessionId || sessionId,
      specialist: specialist || responseData.agent || "POLICY_ASSISTANT",
      source: "PRIVATE_AGENTCORE",
      confidence: responseData.confidence,
      status: responseData.status,
    });
  } catch (error) {
    console.error("Private backend direct API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
