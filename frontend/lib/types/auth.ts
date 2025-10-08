import { AccountInfo, AuthenticationResult } from "@azure/msal-browser";

/**
 * Authentication status type
 */
export type AuthStatus =
  | "idle"
  | "authenticating"
  | "authenticated"
  | "error"
  | "loop_detected";

/**
 * Authentication state interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AccountInfo | null;
  accessToken: string | null;
  error: string | null;
  status?: AuthStatus;
  attemptCount?: number;
  lastAttemptTime?: number;
  sessionId?: string;
}

/**
 * Authentication context interface
 */
export interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: (forceRefresh?: boolean) => Promise<string | null>;
  clearError: () => void;
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  department?: string;
  tenantId: string;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  LOGIN_FAILED = "LOGIN_FAILED",
  TOKEN_ACQUISITION_FAILED = "TOKEN_ACQUISITION_FAILED",
  LOGOUT_FAILED = "LOGOUT_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  USER_CANCELLED = "USER_CANCELLED",
  INTERACTION_REQUIRED = "INTERACTION_REQUIRED",
  REDIRECT_LOOP_DETECTED = "REDIRECT_LOOP_DETECTED",
}

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: string;
  timestamp: Date;
}

/**
 * Token information
 */
export interface TokenInfo {
  accessToken: string;
  expiresOn: Date;
  scopes: string[];
  account: AccountInfo;
}

/**
 * Authentication event types
 */
export enum AuthEventType {
  LOGIN_START = "LOGIN_START",
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILURE = "LOGIN_FAILURE",
  LOGOUT_START = "LOGOUT_START",
  LOGOUT_SUCCESS = "LOGOUT_SUCCESS",
  TOKEN_ACQUIRED = "TOKEN_ACQUIRED",
  TOKEN_REFRESH = "TOKEN_REFRESH",
  ERROR_OCCURRED = "ERROR_OCCURRED",
}

/**
 * Authentication event interface
 */
export interface AuthEvent {
  type: AuthEventType;
  timestamp: Date;
  data?: any;
  error?: AuthError;
}

/**
 * MSAL configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Authentication provider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  onAuthStateChange?: (state: AuthState) => void;
  onError?: (error: AuthError) => void;
}

/**
 * Login options
 */
export interface LoginOptions {
  prompt?: "login" | "select_account" | "consent" | "none";
  loginHint?: string;
  domainHint?: string;
  extraScopesToConsent?: string[];
}

/**
 * Token request options
 */
export interface TokenRequestOptions {
  scopes?: string[];
  forceRefresh?: boolean;
  claims?: string;
  authority?: string;
}

/**
 * User session information
 */
export interface UserSession {
  user: UserProfile;
  loginTime: Date;
  lastActivity: Date;
  sessionId: string;
  isActive: boolean;
}

/**
 * Authentication metrics
 */
export interface AuthMetrics {
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  tokenRefreshCount: number;
  averageLoginTime: number;
  lastLoginTime?: Date;
}

/**
 * Route protection configuration
 */
export interface RouteProtection {
  path: string;
  requireAuth: boolean;
  requiredRoles?: string[];
  requiredScopes?: string[];
  redirectTo?: string;
}

/**
 * Authentication hook return type
 */
export interface UseAuthReturn extends AuthContextType {
  userProfile: UserProfile | null;
  session: UserSession | null;
  metrics: AuthMetrics;
  isTokenExpired: boolean;
  timeUntilExpiry: number | null;
}
