import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const clientEnv = {
  NODE_ENV: process.env.NODE_ENV || "production",
  NEXT_PUBLIC_DEVELOPMENT_MODE: process.env.NEXT_PUBLIC_DEVELOPMENT_MODE || "false",
  NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH || "false",
  NEXT_PUBLIC_AUTH_CONFIGURED: process.env.NEXT_PUBLIC_AUTH_CONFIGURED || "false",
  NEXT_PUBLIC_AGENTCORE_API_URL: process.env.NEXT_PUBLIC_AGENTCORE_API_URL || "/api/agentcore",
  NEXT_PUBLIC_FASTAPI_ENDPOINT: process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT || "/api",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
  NEXT_PUBLIC_AZURE_CLIENT_ID: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  NEXT_PUBLIC_AZURE_TENANT_ID: process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  NEXT_PUBLIC_REDIRECT_URI: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/auth/callback",
};

const useAuthShim = clientEnv.NEXT_PUBLIC_AUTH_CONFIGURED !== "true";
const authAliases = useAuthShim
  ? [
      { find: "@azure/msal-browser", replacement: path.resolve(__dirname, "lib/msal-browser.dev.ts") },
      { find: "@azure/msal-react", replacement: path.resolve(__dirname, "lib/msal-react.dev.tsx") },
      { find: /.*\/lib\/msal-auth-context(\.tsx)?$/, replacement: path.resolve(__dirname, "lib/msal-auth-context.dev.tsx") },
    ]
  : [];

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      ...authAliases,
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
  define: {
    "process.env": JSON.stringify(clientEnv),
    "process.env.NODE_ENV": JSON.stringify(clientEnv.NODE_ENV),
    "process.env.NEXT_PUBLIC_DEVELOPMENT_MODE": JSON.stringify(clientEnv.NEXT_PUBLIC_DEVELOPMENT_MODE),
    "process.env.NEXT_PUBLIC_DISABLE_AUTH": JSON.stringify(clientEnv.NEXT_PUBLIC_DISABLE_AUTH),
    "process.env.NEXT_PUBLIC_AUTH_CONFIGURED": JSON.stringify(clientEnv.NEXT_PUBLIC_AUTH_CONFIGURED),
    "process.env.NEXT_PUBLIC_AGENTCORE_API_URL": JSON.stringify(clientEnv.NEXT_PUBLIC_AGENTCORE_API_URL),
    "process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT": JSON.stringify(clientEnv.NEXT_PUBLIC_FASTAPI_ENDPOINT),
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(clientEnv.NEXT_PUBLIC_API_URL),
    "process.env.NEXT_PUBLIC_AZURE_CLIENT_ID": JSON.stringify(clientEnv.NEXT_PUBLIC_AZURE_CLIENT_ID),
    "process.env.NEXT_PUBLIC_AZURE_TENANT_ID": JSON.stringify(clientEnv.NEXT_PUBLIC_AZURE_TENANT_ID),
    "process.env.NEXT_PUBLIC_REDIRECT_URI": JSON.stringify(clientEnv.NEXT_PUBLIC_REDIRECT_URI),
    global: "globalThis",
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
});
