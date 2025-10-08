import {
  Configuration,
  LogLevel,
  BrowserCacheLocation,
} from "@azure/msal-browser";

// Environment detection
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = !isProduction;

// Check if we're running on the production domain
const isProductionDomain =
  typeof window !== "undefined" &&
  window.location.hostname.includes("azurestaticapps.net");

// Production configuration
const PRODUCTION_CONFIG = {
  clientId: "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  tenantId: "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  redirectUri:
    "https://calm-pond-0b4024e0f-preview.eastus2.1.azurestaticapps.net/auth/callback",
  apiUrl: "https://sageinsure-backend-api.eastus2.cloudapp.azure.com",
};

// Determine if we should use production config
const useProductionConfig = isProduction || isProductionDomain;

// Validate required environment variables
const requiredEnvVars = {
  clientId: useProductionConfig
    ? PRODUCTION_CONFIG.clientId
    : process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || PRODUCTION_CONFIG.clientId,
  tenantId: useProductionConfig
    ? PRODUCTION_CONFIG.tenantId
    : process.env.NEXT_PUBLIC_AZURE_TENANT_ID || PRODUCTION_CONFIG.tenantId,
  redirectUri: useProductionConfig
    ? PRODUCTION_CONFIG.redirectUri
    : process.env.NEXT_PUBLIC_REDIRECT_URI ||
      "http://localhost:3000/auth/callback",
  apiUrl: useProductionConfig
    ? PRODUCTION_CONFIG.apiUrl
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
};

// Check for missing environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key, _]) => key);

if (missingVars.length > 0 && isDevelopment && typeof window !== "undefined") {
  console.error("Missing required environment variables:", missingVars);
  // Don't throw error during build, only warn
  console.warn(`Missing MSAL configuration: ${missingVars.join(", ")}`);
}

/**
 * MSAL Configuration for Azure AD authentication
 * Supports both development and production environments
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: requiredEnvVars.clientId,
    authority: `https://login.microsoftonline.com/${requiredEnvVars.tenantId}`,
    redirectUri: requiredEnvVars.redirectUri,
    postLogoutRedirectUri:
      requiredEnvVars.redirectUri?.replace("/auth/callback", "") ||
      (useProductionConfig
        ? "https://calm-pond-0b4024e0f-preview.eastus2.1.azurestaticapps.net"
        : typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000"),
    navigateToLoginRequestUrl: false, // Avoid redirect loops
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage, // More secure than localStorage
    storeAuthStateInCookie: false, // Set to true for IE11 support
    secureCookies: useProductionConfig, // Use secure cookies in production
  },
  system: {
    loggerOptions: {
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean
      ) => {
        if (containsPii) return; // Don't log PII

        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL Error]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL Warning]", message);
            break;
          case LogLevel.Info:
            if (!useProductionConfig) console.info("[MSAL Info]", message);
            break;
          case LogLevel.Verbose:
            if (!useProductionConfig) console.debug("[MSAL Verbose]", message);
            break;
        }
      },
      logLevel: useProductionConfig ? LogLevel.Warning : LogLevel.Verbose,
      piiLoggingEnabled: false, // Never log PII
    },
    windowHashTimeout: 60000, // 60 seconds
    iframeHashTimeout: 6000, // 6 seconds
    loadFrameTimeout: 0, // Use default
  },
};

/**
 * Scopes for login requests
 * These are the basic scopes needed for user authentication
 */
export const loginRequest = {
  scopes: ["openid", "profile", "User.Read"],
  prompt: "select_account" as const, // Allow user to select account
};

/**
 * Scopes for API access tokens
 * These scopes are used when calling the backend API
 */
export const apiRequest = {
  scopes: ["openid", "profile", "User.Read"], // Using basic scopes instead of backend API
};

/**
 * Silent token request configuration
 * Used for refreshing tokens without user interaction
 */
export const silentRequest = {
  scopes: ["openid", "profile", "User.Read"],
  forceRefresh: false, // Set to true to skip cache lookup
};

/**
 * Graph API scopes (optional)
 * Add these if you need to call Microsoft Graph API
 */
export const graphRequest = {
  scopes: ["User.Read", "Mail.Read"],
};

/**
 * Environment-specific configuration
 */
export const environmentConfig = {
  apiBaseUrl: requiredEnvVars.apiUrl || "http://localhost:8000",
  isProduction,
  isDevelopment,
  useProductionConfig,
  isProductionDomain,
  tenantId: requiredEnvVars.tenantId,
  clientId: requiredEnvVars.clientId,
  redirectUri: requiredEnvVars.redirectUri,
};

/**
 * MSAL instance configuration validation
 */
export const validateMsalConfig = (): boolean => {
  const errors: string[] = [];

  if (!msalConfig.auth.clientId) {
    errors.push("Client ID is required");
  }

  if (!msalConfig.auth.authority) {
    errors.push("Authority is required");
  }

  if (!msalConfig.auth.redirectUri) {
    errors.push("Redirect URI is required");
  }

  if (errors.length > 0) {
    console.error("MSAL Configuration Errors:", errors);
    return false;
  }

  return true;
};

/**
 * Protected routes configuration
 * Define which routes require authentication
 */
export const protectedRoutes = ["/chat", "/dashboard", "/profile", "/settings"];

/**
 * Public routes that don't require authentication
 */
export const publicRoutes = ["/", "/login", "/about", "/contact"];

/**
 * Check if a route requires authentication
 */
export const isProtectedRoute = (pathname: string): boolean => {
  return protectedRoutes.some((route) => pathname.startsWith(route));
};

/**
 * Check if a route is public
 */
export const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(
    (route) => pathname === route || (route === "/" && pathname === "/")
  );
};
