import React from "react";
import { PublicClientApplication, devAccount } from "./msal-browser.dev";

const instance = new PublicClientApplication();

export function MsalProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useMsal() {
  return {
    instance,
    accounts: [devAccount],
    inProgress: "none",
  };
}

export function useAccount() {
  return devAccount;
}

export function useIsAuthenticated() {
  return true;
}
