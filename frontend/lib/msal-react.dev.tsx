import React from "react";
import { PublicClientApplication } from "./msal-browser.dev";

const instance = new PublicClientApplication();

export function MsalProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useMsal() {
  return {
    instance,
    accounts: [],
    inProgress: "none",
  };
}

export function useAccount() {
  return null;
}

export function useIsAuthenticated() {
  return false;
}
