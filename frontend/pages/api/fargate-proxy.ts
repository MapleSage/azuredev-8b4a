import type { NextApiRequest, NextApiResponse } from "next";

const PRIVATE_AGENTCORE_ENDPOINT =
  process.env.AGENTCORE_BASE_URL ||
  process.env.FASTAPI_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT ||
  "http://127.0.0.1:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  const { agent } = req.query;
  const { text, conversationId } = req.body;
  const agentType = Array.isArray(agent) ? agent[0] : agent;

  try {
    let authToken = req.headers.authorization?.replace("Bearer ", "");

    if (!authToken && req.headers.cookie) {
      const cookies = req.headers.cookie
        .split(";")
        .reduce((acc: any, cookie) => {
          const [key, value] = cookie.trim().split("=");
          acc[key] = value;
          return acc;
        }, {});
      authToken = cookies.auth_token;
    }

    const backendResponse = await fetch(`${PRIVATE_AGENTCORE_ENDPOINT}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken ? `Bearer ${authToken}` : "",
        "X-Agent-Type": agentType || "POLICY_ASSISTANT",
      },
      body: JSON.stringify({
        text,
        specialist: agentType,
        conversationId: conversationId || "web-session",
      }),
      signal: AbortSignal.timeout(
        Number(process.env.AGENTCORE_CHAT_TIMEOUT_MS || 45000),
      ),
    });

    if (backendResponse.ok) {
      const data = await backendResponse.json();

      return res.status(200).json({
        handled_by:
          data.handled_by || data.agent || agentType || "POLICY_ASSISTANT",
        response:
          data.answer ||
          data.response ||
          "I'm here to help with your insurance needs.",
        citations: data.citations || [],
        attachments: data.attachments || [],
        domain: data.domain,
        intent: data.intent,
        confidence: data.confidence,
        status: data.status,
      });
    }

    const errorText = await backendResponse.text();
    console.error("Private workflow error:", backendResponse.status, errorText);

    return res.status(502).json({
      error: "Private workflow service error",
      detail: `${backendResponse.status}: ${backendResponse.statusText}`,
      handled_by: agentType || "POLICY_ASSISTANT",
      response:
        "I'm experiencing technical difficulties connecting to the private workflow. Please try again.",
      citations: [],
      attachments: [],
    });
  } catch (e: any) {
    console.error("Private workflow proxy error:", e);
    return res.status(502).json({
      error: "Private workflow unreachable",
      detail: e?.message,
      handled_by: agentType || "POLICY_ASSISTANT",
      response:
        "I'm unable to connect to the private workflow services. Please check your connection and try again.",
      citations: [],
      attachments: [],
    });
  }
}
