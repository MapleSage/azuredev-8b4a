import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Return sanitized configuration for debugging
  const config = {
    environment: process.env.NODE_ENV,
    cognitoDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    clientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    hasClientSecret: !!process.env.COGNITO_CLIENT_SECRET,
    host: req.headers.host,
    actualRedirectUriUsed:
      process.env.NODE_ENV === "production"
        ? "https://insure.maplesage.com/auth/callback"
        : "http://localhost:3000/auth/callback",
    awsExportsRedirectUris: [
      "https://insure.maplesage.com/auth/callback",
      "http://localhost:3001/auth/callback",
      "http://localhost:3000/auth/callback",
    ],
  };

  res.status(200).json(config);
}
