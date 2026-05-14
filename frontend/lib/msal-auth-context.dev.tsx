import React, { createContext, useContext } from "react";

const authError =
  "Authentication is not configured for this environment. Configure HTTPS, a registered redirect URI, and Entra sign-in before enabling the console.";

const authContext = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  account: null,
  accounts: [],
  accessToken: null,
  error: authError,
  status: "not_configured",
  attemptCount: 0,
  lastAttemptTime: 0,
  sessionId: null,
  signIn: async () => {
    throw new Error(authError);
  },
  login: async () => {
    throw new Error(authError);
  },
  logout: async () => {},
  signOut: async () => {},
  getAccessToken: async () => null,
  acquireToken: async () => null,
  clearError: () => {},
};

const AuthContext = createContext<any>(authContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const useUserProfile = () => null;

export const useAccessToken = () => null;

export const useAuthError = () => authError;
