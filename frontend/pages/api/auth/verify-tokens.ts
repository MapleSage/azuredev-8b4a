import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const sessionHeader = req.headers["x-session-token"];

    const result: any = {
      cognitoToken: null,
      sessionToken: null,
      status: "checking",
    };

    // Check Cognito access token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const cognitoToken = authHeader.substring(7);
      try {
        // For demo, just decode without verification
        const decoded = jwt.decode(cognitoToken);
        result.cognitoToken = {
          valid: true,
          decoded: decoded,
          type: "cognito_access_token",
        };
      } catch (error) {
        result.cognitoToken = {
          valid: false,
          error: "Invalid Cognito token",
        };
      }
    }

    // Check Fargate session token
    if (sessionHeader) {
      try {
        const decoded = jwt.verify(
          sessionHeader as string,
          process.env.JWT_SECRET || "sageinsure-secret-key"
        );
        result.sessionToken = {
          valid: true,
          decoded: decoded,
          type: "fargate_session_token",
        };
      } catch (error) {
        result.sessionToken = {
          valid: false,
          error: "Invalid session token",
        };
      }
    }

    result.status = "complete";
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Token verification error:", error);
    res.status(500).json({
      error: "Token verification failed",
      message: error.message,
    });
  }
}
