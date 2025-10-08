import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authService, AuthSession, User } from "./auth-service";

interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (
    username: string,
    password: string,
    email: string,
    phone?: string
  ) => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  forgotPassword: (username: string) => Promise<void>;
  confirmForgotPassword: (
    username: string,
    code: string,
    newPassword: string
  ) => Promise<void>;
  signInWithSocial: (
    provider: "Google" | "Facebook" | "Amazon"
  ) => Promise<void>;
  signInWithBiometric: () => Promise<void>;
  signInWithFacial: () => Promise<void>;
  signOut: () => void;
  refreshSession: () => Promise<void>;
  reloadSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load existing session on mount
    const loadSession = async () => {
      try {
        const existingSession = authService.loadSession();
        if (existingSession) {
          // Check if session needs refresh
          const timeUntilExpiry = existingSession.expiresAt - Date.now();
          if (timeUntilExpiry < 5 * 60 * 1000) {
            // Less than 5 minutes
            try {
              const refreshedSession = await authService.refreshSession(
                existingSession.refreshToken
              );
              setSession(refreshedSession);
              authService.saveSession(refreshedSession);
            } catch (error) {
              console.error("Session refresh failed:", error);
              authService.clearSession();
            }
          } else {
            setSession(existingSession);
          }
        }
      } catch (error) {
        console.error("Failed to load session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();

    // Listen for storage changes (for OAuth callback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sageinsure_auth_session" && e.newValue) {
        try {
          const newSession = JSON.parse(e.newValue);
          setSession(newSession);
          setIsLoading(false);
          console.log("Session updated from storage event");
        } catch (error) {
          console.error("Failed to parse session from storage:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Auto-refresh session before expiry
  useEffect(() => {
    if (!session) return;

    const timeUntilExpiry = session.expiresAt - Date.now();
    const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 60 * 1000); // 5 minutes before expiry, minimum 1 minute

    const refreshTimer = setTimeout(async () => {
      try {
        const refreshedSession = await authService.refreshSession(
          session.refreshToken
        );
        setSession(refreshedSession);
        authService.saveSession(refreshedSession);
      } catch (error) {
        console.error("Auto-refresh failed:", error);
        signOut();
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [session]);

  const signIn = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const newSession = await authService.signIn(username, password);
      setSession(newSession);
      authService.saveSession(newSession);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    username: string,
    password: string,
    email: string,
    phone?: string
  ) => {
    setIsLoading(true);
    try {
      await authService.signUp(username, password, email, phone);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmSignUp = async (username: string, code: string) => {
    setIsLoading(true);
    try {
      await authService.confirmSignUp(username, code);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (username: string) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword(username);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmForgotPassword = async (
    username: string,
    code: string,
    newPassword: string
  ) => {
    setIsLoading(true);
    try {
      await authService.confirmForgotPassword(username, code, newPassword);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithSocial = async (
    provider: "Google" | "Facebook" | "Amazon"
  ) => {
    setIsLoading(true);
    try {
      await authService.signInWithSocial(provider);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const signInWithBiometric = async () => {
    setIsLoading(true);
    try {
      const newSession = await authService.signInWithBiometric();
      setSession(newSession);
      authService.saveSession(newSession);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithFacial = async () => {
    setIsLoading(true);
    try {
      const newSession = await authService.signInWithFacial();
      setSession(newSession);
      authService.saveSession(newSession);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    // Clear session state immediately
    setSession(null);

    // Clear all auth storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("sageinsure_auth_session");
      sessionStorage.clear();
    }

    // Redirect to Cognito logout
    authService.signOut();
  };

  const refreshSession = async () => {
    if (!session) return;

    try {
      const refreshedSession = await authService.refreshSession(
        session.refreshToken
      );
      setSession(refreshedSession);
      authService.saveSession(refreshedSession);
    } catch (error) {
      console.error("Manual refresh failed:", error);
      signOut();
      throw error;
    }
  };

  const reloadSession = () => {
    const existingSession = authService.loadSession();
    if (existingSession) {
      setSession(existingSession);
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user: session?.user || null,
    session,
    isAuthenticated: !!session,
    isLoading,
    signIn,
    signUp,
    confirmSignUp,
    forgotPassword,
    confirmForgotPassword,
    signInWithSocial,
    signInWithBiometric,
    signInWithFacial,
    signOut,
    refreshSession,
    reloadSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
