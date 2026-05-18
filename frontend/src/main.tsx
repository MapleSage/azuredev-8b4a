import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
import TabsInterface from "../components/TabsInterface";
import EnterpriseLoginPage from "../components/auth/EnterpriseLoginPage";
import { AuthProvider, useAuth, useUserProfile } from "../lib/msal-auth-context";
import "../styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

const globalScope = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  process?: typeof process;
  global?: typeof globalThis;
};

globalScope.Buffer = globalScope.Buffer || Buffer;
globalScope.process = globalScope.process || process;
globalScope.global = globalScope.global || globalThis;
globalScope.process.env = {
  ...(globalScope.process.env || {}),
  NODE_ENV: process.env.NODE_ENV || import.meta.env.MODE,
  NEXT_PUBLIC_DEVELOPMENT_MODE: process.env.NEXT_PUBLIC_DEVELOPMENT_MODE || "false",
  NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH || "false",
  NEXT_PUBLIC_AUTH_CONFIGURED: process.env.NEXT_PUBLIC_AUTH_CONFIGURED || "false",
  NEXT_PUBLIC_AGENTCORE_API_URL: process.env.NEXT_PUBLIC_AGENTCORE_API_URL || "/api/agentcore",
  NEXT_PUBLIC_FASTAPI_ENDPOINT: process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT || "/api",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  NEXT_PUBLIC_AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  NEXT_PUBLIC_AZURE_TENANT_ID: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI || window.location.origin + "/auth/callback",
};

const root = ReactDOM.createRoot(rootElement);

function LoadingShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-700">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        Loading SageSure…
      </div>
    </div>
  );
}

function FatalShell({ error }: { error: unknown }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-6 text-red-900">
      <div className="max-w-2xl rounded-xl border border-red-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold">SageSure failed to load</h1>
        <p className="text-sm">
          {error instanceof Error ? error.message : "Unknown frontend error"}
        </p>
      </div>
    </div>
  );
}

function SageSureApp() {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const userProfile = useUserProfile();

  if (isLoading) {
    return <LoadingShell />;
  }

  if (!isAuthenticated) {
    return <EnterpriseLoginPage />;
  }

  return <TabsInterface signOut={signOut} user={userProfile} />;
}

root.render(<LoadingShell />);

try {
  root.render(
    <React.StrictMode>
      <AuthProvider>
        <SageSureApp />
      </AuthProvider>
    </React.StrictMode>,
  );
} catch (error) {
  console.error("Failed to load SageSure shell", error);
  root.render(<FatalShell error={error} />);
}
