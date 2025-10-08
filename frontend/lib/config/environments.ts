/**
 * Environment-specific configuration for MSAL authentication
 */

export interface EnvironmentConfig {
  name: string;
  clientId: string;
  tenantId: string;
  authority: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  apiBaseUrl: string;
  scopes: {
    login: string[];
    api: string[];
    graph?: string[];
  };
  cache: {
    location: "localStorage" | "sessionStorage";
    storeAuthStateInCookie: boolean;
  };
  logging: {
    level: "Error" | "Warning" | "Info" | "Verbose";
    piiLoggingEnabled: boolean;
  };
}

/**
 * Development environment configuration
 */
export const developmentConfig: EnvironmentConfig = {
  name: "development",
  clientId:
    process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ||
    "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  tenantId:
    process.env.NEXT_PUBLIC_AZURE_TENANT_ID ||
    "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "e9394f90-446d-41dd-8c8c-98ac08c5f090"}`,
  redirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI ||
    "http://localhost:3000/auth/callback",
  postLogoutRedirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  scopes: {
    login: ["openid", "profile", "User.Read"],
    api: [
      `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "27650c1d-91fa-4747-a2fa-1a52813ac5ac"}/access_as_user`,
    ],
    graph: ["User.Read", "Mail.Read"],
  },
  cache: {
    location: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  logging: {
    level: "Verbose",
    piiLoggingEnabled: false,
  },
};

/**
 * Staging environment configuration
 */
export const stagingConfig: EnvironmentConfig = {
  name: "staging",
  clientId:
    process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ||
    "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  tenantId:
    process.env.NEXT_PUBLIC_AZURE_TENANT_ID ||
    "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "e9394f90-446d-41dd-8c8c-98ac08c5f090"}`,
  redirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI_STAGING ||
    "https://staging.sageinsure.com/auth/callback",
  postLogoutRedirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI_STAGING ||
    "https://staging.sageinsure.com",
  apiBaseUrl:
    process.env.NEXT_PUBLIC_API_URL || "https://api-staging.sageinsure.com",
  scopes: {
    login: ["openid", "profile", "User.Read"],
    api: [
      `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "27650c1d-91fa-4747-a2fa-1a52813ac5ac"}/access_as_user`,
    ],
  },
  cache: {
    location: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  logging: {
    level: "Warning",
    piiLoggingEnabled: false,
  },
};

/**
 * Production environment configuration
 */
export const productionConfig: EnvironmentConfig = {
  name: "production",
  clientId:
    process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ||
    "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
  tenantId:
    process.env.NEXT_PUBLIC_AZURE_TENANT_ID ||
    "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || "e9394f90-446d-41dd-8c8c-98ac08c5f090"}`,
  redirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI_PROD ||
    "https://sageinsure.com/auth/callback",
  postLogoutRedirectUri:
    process.env.NEXT_PUBLIC_REDIRECT_URI_PROD || "https://sageinsure.com",
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "https://api.sageinsure.com",
  scopes: {
    login: ["openid", "profile", "User.Read"],
    api: [
      `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "27650c1d-91fa-4747-a2fa-1a52813ac5ac"}/access_as_user`,
    ],
  },
  cache: {
    location: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  logging: {
    level: "Error",
    piiLoggingEnabled: false,
  },
};

/**
 * Get current environment configuration
 */
export const getCurrentEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV;
  const isDevelopmentMode =
    process.env.NEXT_PUBLIC_DEVELOPMENT_MODE !== "false";

  if (env === "production" && !isDevelopmentMode) {
    return productionConfig;
  } else if (env === "staging") {
    return stagingConfig;
  } else {
    return developmentConfig;
  }
};

/**
 * Validate environment configuration
 */
export const validateEnvironmentConfig = (
  config: EnvironmentConfig
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.clientId) {
    errors.push("Client ID is required");
  }

  if (!config.tenantId) {
    errors.push("Tenant ID is required");
  }

  if (!config.redirectUri) {
    errors.push("Redirect URI is required");
  }

  if (!config.apiBaseUrl) {
    errors.push("API Base URL is required");
  }

  // Validate URL formats
  try {
    new URL(config.redirectUri);
  } catch {
    errors.push("Invalid redirect URI format");
  }

  try {
    new URL(config.apiBaseUrl);
  } catch {
    errors.push("Invalid API base URL format");
  }

  // Validate GUID format for client ID and tenant ID
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!guidRegex.test(config.clientId)) {
    errors.push("Client ID must be a valid GUID");
  }

  if (!guidRegex.test(config.tenantId)) {
    errors.push("Tenant ID must be a valid GUID");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get environment-specific allowed domains for redirect validation
 */
export const getAllowedDomains = (config: EnvironmentConfig): string[] => {
  const domains: string[] = [];

  try {
    const redirectUrl = new URL(config.redirectUri);
    domains.push(redirectUrl.hostname);

    const logoutUrl = new URL(config.postLogoutRedirectUri);
    if (logoutUrl.hostname !== redirectUrl.hostname) {
      domains.push(logoutUrl.hostname);
    }

    const apiUrl = new URL(config.apiBaseUrl);
    if (apiUrl.hostname !== redirectUrl.hostname) {
      domains.push(apiUrl.hostname);
    }
  } catch (error) {
    console.warn("Error parsing URLs for allowed domains:", error);
  }

  // Add common development domains
  if (config.name === "development") {
    domains.push("localhost", "127.0.0.1");
  }

  return [...new Set(domains)]; // Remove duplicates
};

/**
 * Export current configuration
 */
export const currentConfig = getCurrentEnvironmentConfig();
