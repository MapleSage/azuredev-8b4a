export type Configuration = any;
export type AccountInfo = any;
export type AuthenticationResult = any;

export const LogLevel = { Error: 0, Warning: 1, Info: 2, Verbose: 3 };
export const BrowserCacheLocation = {
  LocalStorage: "localStorage",
  SessionStorage: "sessionStorage",
  MemoryStorage: "memoryStorage",
};

export class AuthError extends Error {
  errorCode?: string;
  errorMessage?: string;
  constructor(errorCode = "dev01_auth_disabled", errorMessage = "Authentication disabled for dev01") {
    super(errorMessage);
    this.name = "AuthError";
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }
}

export class BrowserAuthError extends AuthError {}
export class InteractionRequiredAuthError extends AuthError {}

export class PublicClientApplication {
  constructor(_config?: unknown) {}
  initialize = async () => {};
  handleRedirectPromise = async () => null;
  acquireTokenSilent = async (request: any = {}) => ({
    accessToken: "dev01-auth-disabled",
    idToken: "dev01-auth-disabled",
    scopes: request.scopes || [],
    account: request.account || devAccount,
    expiresOn: new Date(Date.now() + 60 * 60 * 1000),
  });
  acquireTokenRedirect = async () => null;
  loginRedirect = async () => null;
  logoutRedirect = async () => null;
  logoutPopup = async () => null;
  getAllAccounts = () => [devAccount];
  getActiveAccount = () => devAccount;
  setActiveAccount = () => {};
  addEventCallback = () => "dev01-callback";
  removeEventCallback = () => {};
}

export const devAccount = {
  homeAccountId: "dev01-user",
  localAccountId: "dev01-user",
  environment: "dev01",
  tenantId: "dev01",
  username: "dev01@sagesure.local",
  name: "SageSure Dev01",
  idTokenClaims: {
    name: "SageSure Dev01",
    preferred_username: "dev01@sagesure.local",
    roles: ["agent", "admin", "claims", "underwriter", "manager"],
  },
};
