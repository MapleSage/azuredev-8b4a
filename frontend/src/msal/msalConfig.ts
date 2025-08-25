import { PublicClientApplication, Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AAD_CLIENT_ID!,
    authority:
      process.env.NEXT_PUBLIC_AAD_AUTHORITY ||
      "https://login.microsoftonline.com/common",
    redirectUri:
      process.env.NEXT_PUBLIC_REDIRECT_URI || "http://localhost:3000",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

export const msalInstance = new PublicClientApplication(msalConfig);
