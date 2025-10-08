const toList = (v?: string) =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

const awsExports = {
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID,
    oauth: {
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      scope: ["openid", "email", "profile"], // include profile for full identity info
      redirectSignIn: [
        "https://insure.maplesage.com/auth/callback",
        "http://localhost:3000/auth/callback",
      ],
      redirectSignOut: [
        "https://insure.maplesage.com/sign-out",
        "http://localhost:3000/sign-out",
      ],
      responseType: "code" as const,
    },
  },
};

export default awsExports;
