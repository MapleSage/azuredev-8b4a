export const msalConfig = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AAD_B2C_CLIENT_ID!,
    authority: `https://${process.env.NEXT_PUBLIC_AAD_B2C_TENANT}/b2c_1_signupsignin`,
    redirectUri: process.env.NEXT_PUBLIC_AAD_B2C_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};