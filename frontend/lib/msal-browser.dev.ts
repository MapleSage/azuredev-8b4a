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
  constructor(errorCode = "auth_not_configured", errorMessage = "Authentication is not configured for this environment") {
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
  acquireTokenSilent = async () => {
    throw new InteractionRequiredAuthError();
  };
  acquireTokenRedirect = async () => {
    throw new InteractionRequiredAuthError();
  };
  loginRedirect = async () => {
    throw new InteractionRequiredAuthError();
  };
  logoutRedirect = async () => null;
  logoutPopup = async () => null;
  getAllAccounts = () => [];
  getActiveAccount = () => null;
  setActiveAccount = () => {};
  addEventCallback = () => "dev01-callback";
  removeEventCallback = () => {};
}

export const devAccount = null;
