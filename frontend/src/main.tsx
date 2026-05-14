import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import process from "process";
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
  NODE_ENV: import.meta.env.MODE,
  NEXT_PUBLIC_DEVELOPMENT_MODE: "false",
  NEXT_PUBLIC_DISABLE_AUTH: "false",
  NEXT_PUBLIC_AUTH_CONFIGURED: "false",
  NEXT_PUBLIC_AGENTCORE_API_URL: "/api/agentcore",
  NEXT_PUBLIC_FASTAPI_ENDPOINT: "/api",
  NEXT_PUBLIC_API_URL: "/api",
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

function AuthNotConfiguredShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <div className="max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 px-8 py-7 shadow-xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
          SageSure Operations Runtime
        </p>
        <h1 className="mb-3 text-2xl font-semibold">Authentication required</h1>
        <p className="mb-4 text-sm leading-6 text-slate-300">
          This environment is no longer allowed to start with a synthetic user or demo token.
          Configure the approved HTTPS hostname, registered redirect URI, and Entra sign-in
          before enabling the operations console.
        </p>
        <p className="text-sm text-slate-400">
          No broker, claim, underwriting, or chat action is available until authentication is configured.
        </p>
      </div>
    </div>
  );
}

root.render(<LoadingShell />);

const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const authConfigured = process.env.NEXT_PUBLIC_AUTH_CONFIGURED === "true";

if (authDisabled || !authConfigured) {
  root.render(<AuthNotConfiguredShell />);
} else {
  import("../components/TabsInterface")
    .then(({ default: TabsInterface }) => {
      root.render(
        <React.StrictMode>
          <TabsInterface signOut={() => undefined} user={null} />
        </React.StrictMode>,
      );
    })
    .catch((error) => {
      console.error("Failed to load SageSure shell", error);
      root.render(<FatalShell error={error} />);
    });
}
