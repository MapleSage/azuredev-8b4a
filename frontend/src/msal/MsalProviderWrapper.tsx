"use client"; // important! this file must be a client component

import React from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./msalConfig";

// instantiate MSAL in the browser only
const msalInstance = new PublicClientApplication(msalConfig);

export default function MsalProviderWrapper({ children }: { children: React.ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}