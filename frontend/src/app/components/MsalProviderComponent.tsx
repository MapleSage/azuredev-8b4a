"use client";

import { useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";

const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_B2C_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_B2C_AUTHORITY!,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/chat",
    postLogoutRedirectUri: "http://localhost:3000",
    knownAuthorities: [process.env.NEXT_PUBLIC_B2C_KNOWN_AUTHORITIES!],
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
};

export default function MsalProviderComponent({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] = useState<any>(null);

  useEffect(() => {
    // ✅ Hard guard against SSR
    if (typeof window === "undefined" || !window.crypto) {
      console.warn("MSAL init skipped: no window.crypto available");
      return;
    }

    const init = async () => {
      try {
        const { PublicClientApplication } = await import("@azure/msal-browser");

        // ✅ Double-check window.crypto before calling constructor
        if (!window.crypto || typeof window.crypto.subtle === "undefined") {
          throw new Error("Browser crypto not available");
        }

        const instance = new PublicClientApplication(msalConfig);

        await instance.initialize();
        await instance.handleRedirectPromise();

        setMsalInstance(instance);
      } catch (error) {
        console.error("MSAL initialization error:", error);
      }
    };

    init();
  }, []);

  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading authentication...</div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}