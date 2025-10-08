import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
    const clientId = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID;
    const clientSecret = process.env.COGNITO_CLIENT_SECRET;

    if (!cognitoDomain || !clientId || !clientSecret) {
      console.error("Missing Cognito configuration:", {
        cognitoDomain: !!cognitoDomain,
        clientId: !!clientId,
        clientSecret: !!clientSecret,
      });
      return res
        .status(500)
        .json({ error: "Cognito configuration incomplete" });
    }

    // Determine redirect URI - this MUST match exactly what was used in the auth request
    const protocol =
      req.headers["x-forwarded-proto"] || (req.connection as any)?.encrypted
        ? "https"
        : "http";
    const host = req.headers.host;
    let redirectUri = "";

    if (host?.includes("localhost") || host?.includes("127.0.0.1")) {
      redirectUri = "http://localhost:3000/auth/callback";
    } else {
      redirectUri = `${protocol}://${host}/auth/callback`;
    }

    const tokenUrl = `https://${cognitoDomain}/oauth2/token`;

    // Always include client secret for this Cognito client
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
    });

    console.log("Token exchange request:", {
      tokenUrl,
      client_id: clientId,
      redirect_uri: redirectUri,
      has_client_secret: !!clientSecret,
      code_length: code.length,
      environment: process.env.NODE_ENV,
      isVercel: !!process.env.VERCEL,
      host: host,
      protocol: protocol,
    });

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Token exchange failed:", {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        redirect_uri: redirectUri,
        client_id: clientId,
      });

      let errorDetails: any;
      try {
        errorDetails = JSON.parse(responseText);
      } catch {
        errorDetails = {
          error: "parse_error",
          error_description: responseText,
        };
      }

      return res.status(response.status).json({
        error: "Token exchange failed",
        details: errorDetails,
        debug: {
          redirect_uri: redirectUri,
          client_id: clientId,
          token_url: tokenUrl,
        },
      });
    }

    let tokens: any;
    try {
      tokens = JSON.parse(responseText);
      console.log("Token exchange successful");
      res.status(200).json(tokens);
    } catch (parseError) {
      console.error("Failed to parse token response:", responseText);
      return res.status(500).json({ error: "Invalid token response format" });
    }
  } catch (error: any) {
    console.error("Token exchange error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}
