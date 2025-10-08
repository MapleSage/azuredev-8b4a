import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { authCode, userId } = req.body;

    // Create session token for Fargate agent
    const sessionToken = jwt.sign(
      {
        userId,
        sub: userId,
        iss: "sageinsure-auth",
        aud: "fargate-agent",
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
        iat: Math.floor(Date.now() / 1000),
        scope: "insurance:claims insurance:policies",
      },
      process.env.JWT_SECRET || "sageinsure-secret-key"
    );

    // Initialize session via Step Functions
    const protocol = req.headers.host?.includes("localhost") ? "http" : "https";
    const sessionResponse = await fetch(
      `${protocol}://${req.headers.host}/api/session-manager`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_SESSION",
          userId,
          sessionData: {
            sessionToken,
            createdAt: new Date().toISOString(),
          },
        }),
      }
    );

    const sessionResult = await sessionResponse.json();

    res.status(200).json({
      success: true,
      tokens: {
        sessionToken,
      },
      sessionId: sessionResult.sessionId,
      expiresIn: 86400,
    });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({
      error: "Token exchange failed",
      message: error.message,
    });
  }
}
