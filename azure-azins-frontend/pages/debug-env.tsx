import { GetServerSideProps } from "next";

interface DebugEnvProps {
  env: Record<string, string>;
  isProduction: boolean;
}

export default function DebugEnv({ env, isProduction }: DebugEnvProps) {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
      <p className="mb-4">
        Environment: {isProduction ? "Production" : "Development"}
      </p>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Cognito Configuration:</h2>
        <pre className="text-sm">
          {JSON.stringify(
            {
              NEXT_PUBLIC_USER_POOL_ID: env.NEXT_PUBLIC_USER_POOL_ID,
              NEXT_PUBLIC_USER_POOL_CLIENT_ID:
                env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
              NEXT_PUBLIC_COGNITO_DOMAIN: env.NEXT_PUBLIC_COGNITO_DOMAIN,
              NEXT_PUBLIC_REDIRECT_SIGN_IN: env.NEXT_PUBLIC_REDIRECT_SIGN_IN,
              NEXT_PUBLIC_REDIRECT_SIGN_OUT: env.NEXT_PUBLIC_REDIRECT_SIGN_OUT,
              COGNITO_CLIENT_ID: env.COGNITO_CLIENT_ID ? "SET" : "NOT SET",
              COGNITO_CLIENT_SECRET: env.COGNITO_CLIENT_SECRET
                ? "SET"
                : "NOT SET",
              COGNITO_DOMAIN: env.COGNITO_DOMAIN ? "SET" : "NOT SET",
              COGNITO_REDIRECT_URI: env.COGNITO_REDIRECT_URI,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="mt-6 bg-blue-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Expected OAuth URL:</h2>
        <p className="text-sm break-all">
          https://{env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/authorize?client_id=
          {env.NEXT_PUBLIC_USER_POOL_CLIENT_ID}
          &response_type=code&scope=openid+email+profile&redirect_uri=
          {encodeURIComponent(
            isProduction
              ? "https://insure.maplesage.com/auth/callback"
              : "http://localhost:3000/auth/callback"
          )}
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  const isProduction = process.env.NODE_ENV === "production";

  const env = {
    NEXT_PUBLIC_USER_POOL_ID: process.env.NEXT_PUBLIC_USER_POOL_ID || "",
    NEXT_PUBLIC_USER_POOL_CLIENT_ID:
      process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || "",
    NEXT_PUBLIC_COGNITO_DOMAIN: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "",
    NEXT_PUBLIC_REDIRECT_SIGN_IN:
      process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN || "",
    NEXT_PUBLIC_REDIRECT_SIGN_OUT:
      process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT || "",
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || "",
    COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET || "",
    COGNITO_DOMAIN: process.env.COGNITO_DOMAIN || "",
    COGNITO_REDIRECT_URI: process.env.COGNITO_REDIRECT_URI || "",
  };

  return {
    props: {
      env,
      isProduction,
    },
  };
};
