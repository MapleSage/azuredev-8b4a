import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  PublicClientApplication,
  AccountInfo,
  AuthenticationResult,
  InteractionRequiredAuthError,
  BrowserAuthError,
  AuthError as MsalAuthError,
} from "@azure/msal-browser";
import {
  MsalProvider,
  useMsal,
  useAccount,
  useIsAuthenticated,
} from "@azure/msal-react";
import {
  msalConfig,
  loginRequest,
  apiRequest,
  silentRequest,
} from "./msal-config";
import {
  AuthContextType,
  AuthState,
  type AuthStatus,
  UserProfile,
  AuthError,
  AuthErrorType,
  TokenInfo,
  AuthEvent,
  AuthEventType,
} from "./types/auth";
import {
  mapAccountToUserProfile,
  extractTokenInfo,
  isTokenExpired,
  createAuthError,
  logAuthEvent,
  generateSessionId,
  storeAuthMetrics,
  getAuthMetrics,
} from "./utils/auth-utils";
import {
  getRedirectLoopDetector,
  trackAuthAttempt,
  isRedirectLoopDetected,
  clearRedirectLoopData,
} from "./utils/redirect-loop-detector";

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL instance
msalInstance.initialize().catch((error) => {
  console.error("MSAL initialization failed:", error);
});

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  error: null,
  status: "idle",
  attemptCount: 0,
  lastAttemptTime: 0,
  sessionId: "",
  signIn: async () => {},
  signOut: async () => {},
  getAccessToken: async () => null,
  clearError: () => {},
});

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || {});
  const isAuthenticated = useIsAuthenticated();

  const [sessionId] = useState(() => generateSessionId());
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const [authState, setAuthState] = useState<AuthState>(() => ({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    accessToken: null,
    error: null,
    status: "idle",
    attemptCount: 0,
    lastAttemptTime: 0,
    sessionId: sessionId,
  }));

  // Update auth state when MSAL state changes
  useEffect(() => {
    const updateAuthState = () => {
      // Skip detector access during SSR
      if (typeof window === "undefined") {
        setAuthState((prev) => ({
          ...prev,
          isAuthenticated,
          user: account,
          isLoading: inProgress !== "none",
        }));
        return;
      }

      const detector = getRedirectLoopDetector();

      setAuthState((prev) => {
        let newStatus = prev.status;

        // Update status based on MSAL state
        if (inProgress !== "none") {
          newStatus = "authenticating";
        } else if (isAuthenticated) {
          newStatus = "authenticated";
          // Clear redirect loop data on successful authentication
          if (prev.status === "loop_detected") {
            detector.clearTrackingData();
          }
        } else if (prev.status === "authenticating") {
          // If we were authenticating but are no longer authenticated and not in progress,
          // we might have failed or been redirected
          newStatus = "idle";
        }

        return {
          ...prev,
          isAuthenticated,
          user: account,
          isLoading: inProgress !== "none",
          status: newStatus,
          attemptCount: detector.getAttemptCount(),
        };
      });
    };

    updateAuthState();
  }, [isAuthenticated, account, inProgress]);

  const getAccessToken = useCallback(
    async (forceRefresh: boolean = false): Promise<string | null> => {
      if (!account) {
        return null;
      }

      try {
        // Check if we have a valid cached token
        if (
          !forceRefresh &&
          tokenInfo &&
          !isTokenExpired(tokenInfo.expiresOn)
        ) {
          return tokenInfo.accessToken;
        }

        logAuthEvent("TOKEN_ACQUISITION_START");

        const response = await instance.acquireTokenSilent({
          ...apiRequest,
          account: account,
          forceRefresh,
        });

        const newTokenInfo = extractTokenInfo(response);
        setTokenInfo(newTokenInfo);

        setAuthState((prev) => ({
          ...prev,
          accessToken: newTokenInfo.accessToken,
        }));

        logAuthEvent("TOKEN_ACQUIRED", { scopes: response.scopes });
        return newTokenInfo.accessToken;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          try {
            // Try interactive token acquisition
            const response = await instance.acquireTokenRedirect({
              ...apiRequest,
              account: account,
            });
            return null; // Redirect will handle the token acquisition

            const newTokenInfo = extractTokenInfo(response);
            setTokenInfo(newTokenInfo);

            setAuthState((prev) => ({
              ...prev,
              accessToken: newTokenInfo.accessToken,
            }));

            logAuthEvent("TOKEN_ACQUIRED_INTERACTIVE", {
              scopes: response.scopes,
            });
            return newTokenInfo.accessToken;
          } catch (popupError) {
            const authError = createAuthError(
              popupError,
              AuthErrorType.TOKEN_ACQUISITION_FAILED
            );
            setAuthState((prev) => ({ ...prev, error: authError.message }));
            logAuthEvent("TOKEN_ACQUISITION_FAILED", { error: authError });
            return null;
          }
        } else {
          const authError = createAuthError(
            error,
            AuthErrorType.TOKEN_ACQUISITION_FAILED
          );
          setAuthState((prev) => ({ ...prev, error: authError.message }));
          logAuthEvent("TOKEN_ACQUISITION_FAILED", { error: authError });
          return null;
        }
      }
    },
    [account, instance, tokenInfo]
  );

  // Initialize authentication on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        logAuthEvent("AUTH_INIT_START");

        // Skip loop detection during SSR
        if (typeof window === "undefined") {
          const accounts = instance.getAllAccounts();
          if (accounts.length > 0) {
            instance.setActiveAccount(accounts[0]);
            setAuthState((prev) => ({
              ...prev,
              status: "authenticated",
            }));
          } else {
            setAuthState((prev) => ({
              ...prev,
              status: "idle",
            }));
          }
          logAuthEvent("AUTH_INIT_SUCCESS");
          return;
        }

        // Clean up old redirect loop attempts during initialization
        // This helps reset the state if user returns after the time window
        const detector = getRedirectLoopDetector();
        detector.cleanupOldAttempts();

        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          await getAccessToken(false); // Try to get token silently

          setAuthState((prev) => ({
            ...prev,
            status: "authenticated",
          }));
        } else {
          setAuthState((prev) => ({
            ...prev,
            status: "idle",
          }));
        }

        logAuthEvent("AUTH_INIT_SUCCESS");
      } catch (error) {
        const authError = createAuthError(
          error,
          AuthErrorType.CONFIGURATION_ERROR
        );
        setAuthState((prev) => ({
          ...prev,
          error: authError.message,
          status: "error",
        }));
        logAuthEvent("AUTH_INIT_ERROR", { error: authError });
      } finally {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, [instance, getAccessToken]);

  const clearError = useCallback(() => {
    // Skip detector access during SSR
    if (typeof window !== "undefined") {
      const detector = getRedirectLoopDetector();

      // If we're clearing a redirect loop error, reset the detector
      if (authState.status === "loop_detected") {
        detector.resetLoopDetection();
      }
    }

    setAuthState((prev) => ({
      ...prev,
      error: null,
      status: "idle",
    }));
  }, [authState.status]);

  const signIn = useCallback(async () => {
    try {
      // Skip loop detection during SSR
      if (typeof window === "undefined") {
        setAuthState((prev) => ({
          ...prev,
          isLoading: true,
          error: null,
          status: "authenticating",
          lastAttemptTime: Date.now(),
        }));

        await instance.loginRedirect(loginRequest);
        return;
      }

      // Check for redirect loop before attempting authentication
      const detector = getRedirectLoopDetector();

      if (detector.isLoopDetected() && !detector.shouldBypass()) {
        const authError = createAuthError(
          "Redirect loop detected. Please wait a few minutes before trying again.",
          AuthErrorType.REDIRECT_LOOP_DETECTED
        );

        setAuthState((prev) => ({
          ...prev,
          error: authError.message,
          status: "loop_detected",
          isLoading: false,
          attemptCount: detector.getAttemptCount(),
          lastAttemptTime: Date.now(),
        }));

        logAuthEvent("LOGIN_FAILURE", {
          error: authError,
          reason: "redirect_loop",
        });
        throw authError;
      }

      // Track this authentication attempt with specific URL
      trackAuthAttempt(window.location.href + "?auth_attempt=true");

      setAuthState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        status: "authenticating",
        attemptCount: detector.getAttemptCount(),
        lastAttemptTime: Date.now(),
      }));

      logAuthEvent("LOGIN_START");

      // Use redirect instead of popup to avoid popup blocking issues
      await instance.loginRedirect(loginRequest);
      // Note: loginRedirect doesn't return a response, the page will redirect

      // Redirect will handle the rest, no need for additional logic here
    } catch (error) {
      const authError = createAuthError(error, AuthErrorType.LOGIN_FAILED);
      const detector = getRedirectLoopDetector();

      setAuthState((prev) => ({
        ...prev,
        error: authError.message,
        status: "error",
        isLoading: false,
        attemptCount: detector.getAttemptCount(),
        lastAttemptTime: Date.now(),
      }));

      // Update metrics
      const metrics = getAuthMetrics() || { loginAttempts: 0, failedLogins: 0 };
      metrics.failedLogins += 1;
      storeAuthMetrics(metrics);

      logAuthEvent("LOGIN_FAILURE", { error: authError });
      throw error;
    }
  }, [instance, sessionId]);

  const signOut = useCallback(async () => {
    try {
      setAuthState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        status: "authenticating",
      }));
      logAuthEvent("LOGOUT_START");

      // Clear redirect loop data on logout
      clearRedirectLoopData();

      await instance.logoutRedirect({
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      });

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        error: null,
        status: "idle",
        attemptCount: 0,
        lastAttemptTime: 0,
        sessionId: sessionId,
      });

      setTokenInfo(null);
      logAuthEvent("LOGOUT_SUCCESS");
    } catch (error) {
      const authError = createAuthError(error, AuthErrorType.LOGOUT_FAILED);
      setAuthState((prev) => ({
        ...prev,
        error: authError.message,
        status: "error",
        isLoading: false,
      }));
      logAuthEvent("LOGOUT_FAILURE", { error: authError });
      throw error;
    }
  }, [instance, sessionId]);

  const contextValue: AuthContextType = {
    ...authState,
    signIn,
    signOut,
    getAccessToken,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </MsalProvider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Additional hooks for convenience
export const useUserProfile = (): UserProfile | null => {
  const { user } = useAuth();
  return user ? mapAccountToUserProfile(user) : null;
};

export const useAccessToken = (): string | null => {
  const { accessToken } = useAuth();
  return accessToken;
};

export const useAuthError = (): string | null => {
  const { error } = useAuth();
  return error;
};
