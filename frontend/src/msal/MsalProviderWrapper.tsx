"use client"; // important! this file must be a client component

import React, { useState, useEffect } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./msalConfig";

export default function MsalProviderWrapper({ children }: { children: React.ReactNode }) {
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only create MSAL instance on client side when crypto is available
    if (typeof window !== "undefined" && typeof window.crypto !== "undefined") {
      const instance = new PublicClientApplication(msalConfig);
      setMsalInstance(instance);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading authentication...</div>
      </div>
    );
  }

  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Authentication not available. Please refresh the page.</div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}