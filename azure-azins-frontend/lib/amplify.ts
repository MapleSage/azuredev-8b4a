// lib/amplify.ts
import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
    oauth: {
      domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN,
      scope: ["openid", "email", "profile"],
      redirectSignIn: [
        "https://insure.maplesage.com/auth/callback",
        "http://localhost:3000/auth/callback",
      ],
      redirectSignOut: [
        "https://insure.maplesage.com/sign-out",
        "http://localhost:3000/sign-out",
      ],
      responseType: "code",
    },
  },
} as any); // <-- temporary `as any` bypass for build
