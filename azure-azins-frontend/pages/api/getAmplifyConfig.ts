import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const baseUrl = req.headers.host?.includes("localhost")
      ? "http://localhost:3000"
      : "https://insure.maplesage.com";

    const config = {
      Auth: {
        Cognito: {
          userPoolId: "us-east-1_eFC9Xu9Mq",
          userPoolClientId: "4n3ufqhb1uevi6vjq6vddmtvb2",
          region: "us-east-1",
          loginWith: {
            oauth: {
              domain: "auth2.maplesage.com",
              scopes: ["openid", "email"],
              redirectSignIn: [`${baseUrl}/auth/callback`],
              redirectSignOut: [`${baseUrl}/sign-out`],
              responseType: "code" as const,
              providers: ["Google", "Facebook", "LoginWithAmazon"],
            },
          },
        },
      },
    };

    res.status(200).json(config);
  } catch (error) {
    console.error("Config error:", error);
    res.status(500).json({ error: "Failed to load config" });
  }
}
