import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check environment variables (sanitized)
  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL, // This will be "1" on Vercel
    VERCEL_URL: process.env.VERCEL_URL,

    // Cognito config (sanitized)
    hasCognitoDomain: !!process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
    hasUserPoolId: !!process.env.NEXT_PUBLIC_USER_POOL_ID,
    hasClientId: !!process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    hasClientSecret: !!process.env.COGNITO_CLIENT_SECRET,

    // Request info
    host: req.headers.host,
    protocol: req.headers["x-forwarded-proto"] || "http",
    userAgent: req.headers["user-agent"],

    // Computed redirect URI
    computedRedirectUri:
      process.env.NODE_ENV === "production"
        ? "https://insure.maplesage.com/auth/callback"
        : "http://localhost:3000/auth/callback",

    // All environment variables starting with NEXT_PUBLIC (safe to expose)
    publicEnvVars: Object.keys(process.env)
      .filter((key) => key.startsWith("NEXT_PUBLIC_"))
      .reduce(
        (acc, key) => {
          acc[key] = process.env[key];
          return acc;
        },
        {} as Record<string, string | undefined>
      ),
  };

  res.status(200).json(envCheck);
}
