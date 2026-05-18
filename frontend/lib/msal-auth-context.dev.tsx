import React, { createContext, useContext, useMemo, useState } from "react";

const authNotConfiguredMessage =
  "Microsoft sign-in is not configured for this local environment yet. Configure HTTPS, a registered redirect URI, and Entra sign-in to continue.";

const defaultAuthContext = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  account: null,
  accounts: [],
  accessToken: null,
  error: null as string | null,
  status: "idle",
  attemptCount: 0,
  lastAttemptTime: 0,
  sessionId: null,
  signIn: async () => {},
  login: async () => {},
  logout: async () => {},
  signOut: async () => {},
  getAccessToken: async () => null,
  acquireToken: async () => null,
  clearError: () => {},
};

const AuthContext = createContext<any>(defaultAuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  const contextValue = useMemo(
    () => ({
      ...defaultAuthContext,
      error,
      status: error ? "not_configured" : "idle",
      signIn: async () => {
        setError(authNotConfiguredMessage);
        throw new Error(authNotConfiguredMessage);
      },
      login: async () => {
        setError(authNotConfiguredMessage);
        throw new Error(authNotConfiguredMessage);
      },
      clearError: () => setError(null),
    }),
    [error],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const useUserProfile = () => null;

export const useAccessToken = () => null;

export const useAuthError = () => useContext(AuthContext).error;
