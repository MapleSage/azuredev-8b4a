import React, { createContext, useContext } from "react";

const devUser = {
  id: "dev01-user",
  displayName: "SageSure Dev01",
  name: "SageSure Dev01",
  email: "dev01@sagesure.local",
  username: "dev01@sagesure.local",
  roles: ["agent", "admin", "claims", "underwriter", "manager"],
};

const authContext = {
  isAuthenticated: true,
  isLoading: false,
  user: devUser,
  account: devUser,
  accounts: [devUser],
  accessToken: "dev01-auth-disabled",
  error: null,
  status: "authenticated",
  attemptCount: 0,
  lastAttemptTime: 0,
  sessionId: "dev01-session",
  signIn: async () => {},
  login: async () => {},
  logout: async () => {},
  signOut: async () => {},
  getAccessToken: async () => "dev01-auth-disabled",
  acquireToken: async () => "dev01-auth-disabled",
  clearError: () => {},
};

const AuthContext = createContext<any>(authContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const useUserProfile = () => devUser;

export const useAccessToken = () => "dev01-auth-disabled";

export const useAuthError = () => null;
