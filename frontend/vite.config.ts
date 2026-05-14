import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const clientEnv = {
  NODE_ENV: process.env.NODE_ENV || "production",
  NEXT_PUBLIC_DEVELOPMENT_MODE: process.env.NEXT_PUBLIC_DEVELOPMENT_MODE || "false",
  NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH || "true",
  NEXT_PUBLIC_AGENTCORE_API_URL: process.env.NEXT_PUBLIC_AGENTCORE_API_URL || "/api/agentcore",
  NEXT_PUBLIC_FASTAPI_ENDPOINT: process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT || "/api",
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "/api",
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  define: {
    "process.env": JSON.stringify(clientEnv),
    "process.env.NODE_ENV": JSON.stringify(clientEnv.NODE_ENV),
    "process.env.NEXT_PUBLIC_DEVELOPMENT_MODE": JSON.stringify(clientEnv.NEXT_PUBLIC_DEVELOPMENT_MODE),
    "process.env.NEXT_PUBLIC_DISABLE_AUTH": JSON.stringify(clientEnv.NEXT_PUBLIC_DISABLE_AUTH),
    "process.env.NEXT_PUBLIC_AGENTCORE_API_URL": JSON.stringify(clientEnv.NEXT_PUBLIC_AGENTCORE_API_URL),
    "process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT": JSON.stringify(clientEnv.NEXT_PUBLIC_FASTAPI_ENDPOINT),
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(clientEnv.NEXT_PUBLIC_API_URL),
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
