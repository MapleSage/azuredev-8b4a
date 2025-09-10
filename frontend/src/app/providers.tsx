"use client";

import { useEffect, useState } from "react";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "../msal/msalConfig";
import dynamic from "next/dynamic";

function ProvidersComponent({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      if (!msalInstance) {
        setIsInitialized(true);
        return;
      }

      try {
        // Handle redirect response if present
        await msalInstance.handleRedirectPromise();
        setIsInitialized(true);
      } catch (error) {
        console.error("MSAL initialization error:", error);
        setIsInitialized(true);
      }
    };

    initializeMsal();
  }, []);

  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>
          Authentication initialization failed. Please refresh the page.
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Processing authentication...</div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

export const Providers = dynamic(() => Promise.resolve(ProvidersComponent), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <div>Loading...</div>
    </div>
  ),
});
