import { PublicClientApplication, Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AAD_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_AAD_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000/chat",
    postLogoutRedirectUri: "http://localhost:3000",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // LogLevel.Error
            console.error(message);
            return;
          case 1: // LogLevel.Warning
            console.warn(message);
            return;
          case 2: // LogLevel.Info
            console.info(message);
            return;
          case 3: // LogLevel.Verbose
            console.debug(message);
            return;
        }
      },
    },
  },
};

// Login Request
export const loginRequest = {
  scopes: ["User.Read"],
};

// Placeholder for B2C policies (not used with regular Azure AD)
export const b2cPolicies = {
  authorities: {
    signUpSignIn: {
      authority: "https://login.microsoftonline.com/common",
    },
    forgotPassword: {
      authority: "https://login.microsoftonline.com/common",
    },
  },
};

// Only create MSAL instance on client side
export const msalInstance =
  typeof window !== "undefined" && typeof window.crypto !== "undefined"
    ? new PublicClientApplication(msalConfig)
    : null;
