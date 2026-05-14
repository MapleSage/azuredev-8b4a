import type { NextApiRequest, NextApiResponse } from "next";

const PRIVATE_AGENTCORE_ENDPOINT =
  process.env.AGENTCORE_BASE_URL ||
  process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT ||
  "http://127.0.0.1:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const payload = {
      text: req.body.text,
      conversationId: req.body.conversationId || "web-session",
      specialist: req.query.agent || "POLICY_ASSISTANT",
    };

    const response = await fetch(`${PRIVATE_AGENTCORE_ENDPOINT}/chat`, {
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

    if (!response.ok) {
      throw new Error(`Private workflow returned ${response.status}`);
    }

    const body = await response.json();
    return res.status(200).json(body);
  } catch (error: any) {
    return res.status(502).json({
      error: "Private workflow error",
      detail: error.message,
    });
  }
}
