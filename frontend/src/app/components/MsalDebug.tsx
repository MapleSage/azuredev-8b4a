"use client";

import { useEffect, useState } from "react";
import { useMsal, useAccount } from "@azure/msal-react";

export function MsalDebug() {
  const { instance, accounts, inProgress } = useMsal();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const account = useAccount(accounts[0]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has('code');
    const hasError = urlParams.has('error');
    
    setDebugInfo({
      accountsCount: accounts.length,
      inProgress,
      hasCode,
      hasError,
      currentUrl: window.location.href,
      account: account ? {
        username: account.username,
        name: account.name,
        localAccountId: account.localAccountId
      } : null,
      config: {
        clientId: process.env.NEXT_PUBLIC_B2C_CLIENT_ID,
        authority: process.env.NEXT_PUBLIC_B2C_AUTHORITY,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
        knownAuthorities: process.env.NEXT_PUBLIC_B2C_KNOWN_AUTHORITIES
      }
    });
  }, [accounts, inProgress, account]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '400px',
      zIndex: 9999,
      fontFamily: 'monospace'
    }}>
      <h4>MSAL Debug Info</h4>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
}