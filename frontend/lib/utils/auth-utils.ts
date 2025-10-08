import {
  AccountInfo,
  AuthenticationResult,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import {
  UserProfile,
  AuthError,
  AuthErrorType,
  TokenInfo,
} from "../types/auth";

/**
 * Convert MSAL AccountInfo to UserProfile
 */
export const mapAccountToUserProfile = (account: AccountInfo): UserProfile => {
  const claims = account.idTokenClaims as any;

  return {
    id: account.localAccountId,
    displayName: account.name || claims?.name || "Unknown User",
    email: account.username || claims?.preferred_username || "",
    firstName: claims?.given_name,
    lastName: claims?.family_name,
    jobTitle: claims?.jobTitle,
    department: claims?.department,
    tenantId: account.tenantId,
  };
};

/**
 * Extract token information from AuthenticationResult
 */
export const extractTokenInfo = (result: AuthenticationResult): TokenInfo => {
  return {
    accessToken: result.accessToken,
    expiresOn: result.expiresOn || new Date(),
    scopes: result.scopes || [],
    account: result.account!,
  };
};

/**
 * Check if token is expired or will expire soon
 */
export const isTokenExpired = (
  expiresOn: Date,
  bufferMinutes: number = 5
): boolean => {
  const now = new Date();
  const expiryWithBuffer = new Date(
    expiresOn.getTime() - bufferMinutes * 60 * 1000
  );
  return now >= expiryWithBuffer;
};

/**
 * Calculate time until token expiry in milliseconds
 */
export const getTimeUntilExpiry = (expiresOn: Date): number => {
  const now = new Date();
  return Math.max(0, expiresOn.getTime() - now.getTime());
};

/**
 * Format time until expiry as human readable string
 */
export const formatTimeUntilExpiry = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return "Less than a minute";
};

/**
 * Create AuthError from various error types
 */
export const createAuthError = (
  error: any,
  type: AuthErrorType = AuthErrorType.LOGIN_FAILED
): AuthError => {
  let message = "An authentication error occurred";
  let details = "";

  if (error instanceof InteractionRequiredAuthError) {
    type = AuthErrorType.INTERACTION_REQUIRED;
    message = "User interaction required to complete authentication";
    details = error.message;
  } else if (error?.message) {
    message = error.message;
    details = error.stack || error.toString();
  } else if (typeof error === "string") {
    message = error;
  }

  return {
    type,
    message,
    details,
    timestamp: new Date(),
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get user initials from name
 */
export const getUserInitials = (name: string): string => {
  if (!name) return "U";

  const parts = name.trim().split(" ");
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Generate a random session ID
 */
export const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Store authentication metrics in localStorage
 */
export const storeAuthMetrics = (metrics: any): void => {
  try {
    localStorage.setItem("auth_metrics", JSON.stringify(metrics));
  } catch (error) {
    console.warn("Failed to store auth metrics:", error);
  }
};

/**
 * Retrieve authentication metrics from localStorage
 */
export const getAuthMetrics = (): any => {
  try {
    const stored = localStorage.getItem("auth_metrics");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn("Failed to retrieve auth metrics:", error);
    return null;
  }
};

/**
 * Clear stored authentication data
 */
export const clearStoredAuthData = (): void => {
  try {
    localStorage.removeItem("auth_metrics");
    sessionStorage.clear(); // Clear MSAL cache
  } catch (error) {
    console.warn("Failed to clear auth data:", error);
  }
};

/**
 * Check if running in browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== "undefined";
};

/**
 * Get current URL for redirect purposes
 */
export const getCurrentUrl = (): string => {
  if (!isBrowser()) return "";
  return window.location.href;
};

/**
 * Get base URL for the application
 */
export const getBaseUrl = (): string => {
  if (!isBrowser()) return "";
  return `${window.location.protocol}//${window.location.host}`;
};

/**
 * Sanitize redirect URL to prevent open redirect attacks
 */
export const sanitizeRedirectUrl = (
  url: string,
  allowedDomains: string[]
): string => {
  try {
    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(
      (domain) =>
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (isAllowed) {
      return url;
    }
  } catch (error) {
    // Invalid URL
  }

  // Return safe default
  return "/";
};

/**
 * Log authentication events for debugging
 */
export const logAuthEvent = (event: string, data?: any): void => {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Auth Event] ${event}`, data);
  }
};

/**
 * Handle authentication errors with user-friendly messages
 */
export const getErrorMessage = (error: AuthError): string => {
  switch (error.type) {
    case AuthErrorType.LOGIN_FAILED:
      return "Login failed. Please try again.";
    case AuthErrorType.TOKEN_ACQUISITION_FAILED:
      return "Unable to get access token. Please sign in again.";
    case AuthErrorType.LOGOUT_FAILED:
      return "Logout failed. Please close your browser to complete sign out.";
    case AuthErrorType.NETWORK_ERROR:
      return "Network error. Please check your connection and try again.";
    case AuthErrorType.CONFIGURATION_ERROR:
      return "Authentication configuration error. Please contact support.";
    case AuthErrorType.USER_CANCELLED:
      return "Sign in was cancelled.";
    case AuthErrorType.INTERACTION_REQUIRED:
      return "Additional authentication required. Please sign in again.";
    case AuthErrorType.REDIRECT_LOOP_DETECTED:
      return "Authentication redirect loop detected. Please wait a few minutes and try again, or contact support if the problem persists.";
    default:
      return error.message || "An unexpected error occurred.";
  }
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
