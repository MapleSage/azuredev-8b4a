"use client";

import { useState, useEffect } from "react";
import { PublicClientApplication, Configuration } from "@azure/msal-browser";

export function useMsalInstance() {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const msalConfig: Configuration = {
        auth: {
          clientId: process.env.NEXT_PUBLIC_AAD_B2C_CLIENT_ID!,
          authority: `https://${process.env.NEXT_PUBLIC_AAD_B2C_TENANT}/${process.env.NEXT_PUBLIC_AAD_B2C_POLICY}`,
          redirectUri: process.env.NEXT_PUBLIC_AAD_B2C_REDIRECT_URI || "http://localhost:3002",
        },
        cache: {
          cacheLocation: "localStorage",
          storeAuthStateInCookie: false,
        },
      };

      setMsalInstance(new PublicClientApplication(msalConfig));
    }
  }, []);

  return msalInstance;
}