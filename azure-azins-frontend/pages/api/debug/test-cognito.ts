import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cognitoDomain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;

    if (!cognitoDomain) {
      return res.status(500).json({ error: "Cognito domain not configured" });
    }

    // Test if the Cognito domain is accessible
    const wellKnownUrl = `https://${cognitoDomain}/.well-known/openid_configuration`;

    console.log("Testing Cognito well-known endpoint:", wellKnownUrl);

    const response = await fetch(wellKnownUrl);

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Cognito domain not accessible",
        status: response.status,
        statusText: response.statusText,
        url: wellKnownUrl,
      });
    }

    const wellKnownConfig = await response.json();

    res.status(200).json({
      success: true,
      cognitoDomain,
      wellKnownUrl,
      issuer: wellKnownConfig.issuer,
      authorizationEndpoint: wellKnownConfig.authorization_endpoint,
      tokenEndpoint: wellKnownConfig.token_endpoint,
      supportedResponseTypes: wellKnownConfig.response_types_supported,
      supportedGrantTypes: wellKnownConfig.grant_types_supported,
    });
  } catch (error) {
    console.error("Cognito test error:", error);
    res.status(500).json({
      error: "Failed to test Cognito configuration",
      message: error.message,
    });
  }
}
