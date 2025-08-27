"use client";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "../msal/msalConfig";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Show loading during hydration
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If MSAL instance failed to initialize, show error
  if (!msalInstance) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>
          Authentication initialization failed. Please refresh the page.
        </div>
      </div>
    );
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
