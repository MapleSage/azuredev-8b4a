import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import awsExports from "./aws-exports";

export interface User {
  id: string;
  email: string;
  username: string;
  name?: string;
  picture?: string;
  phone?: string;
  verified?: boolean;
}

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  sessionToken?: string; // For Fargate API access
  sessionId?: string; // For session management
}

class AuthService {
  private cognitoClient: CognitoIdentityProviderClient;
  private userPoolId: string;
  private clientId: string;

  constructor() {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: awsExports.Auth.region,
    });
    this.userPoolId = awsExports.Auth.userPoolId!;
    this.clientId = awsExports.Auth.userPoolWebClientId!;
  }

  // Email/Password Sign In
  async signIn(username: string, password: string): Promise<AuthSession> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (response.AuthenticationResult) {
        const user = await this.getUserFromToken(
          response.AuthenticationResult.IdToken!
        );
        return {
          user,
          accessToken: response.AuthenticationResult.AccessToken!,
          refreshToken: response.AuthenticationResult.RefreshToken!,
          idToken: response.AuthenticationResult.IdToken!,
          expiresAt:
            Date.now() + response.AuthenticationResult.ExpiresIn! * 1000,
        };
      }

      throw new Error("Authentication failed");
    } catch (error: any) {
      throw new Error(error.message || "Sign in failed");
    }
  }

  // Sign Up
  async signUp(
    username: string,
    password: string,
    email: string,
    phone?: string
  ): Promise<{ userSub: string }> {
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: username,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          ...(phone ? [{ Name: "phone_number", Value: phone }] : []),
        ],
      });

      const response = await this.cognitoClient.send(command);
      return { userSub: response.UserSub! };
    } catch (error: any) {
      throw new Error(error.message || "Sign up failed");
    }
  }

  // Confirm Sign Up
  async confirmSignUp(
    username: string,
    confirmationCode: string
  ): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(error.message || "Confirmation failed");
    }
  }

  // Forgot Password
  async forgotPassword(username: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.clientId,
        Username: username,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(error.message || "Password reset request failed");
    }
  }

  // Confirm Forgot Password
  async confirmForgotPassword(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      });

      await this.cognitoClient.send(command);
    } catch (error: any) {
      throw new Error(error.message || "Password reset failed");
    }
  }

  // Redirect to Cognito Managed Login (shows login page with all options)
  redirectToManagedLogin(): void {
    const domain = awsExports.Auth.oauth?.domain;

    if (!domain) {
      throw new Error("OAuth domain not configured");
    }

    // Use the configured redirect URIs
    const redirectSignInUrls = awsExports.Auth.oauth?.redirectSignIn || [];
    let redirectUri = "";

    // Choose the appropriate redirect URI based on current host
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      redirectUri =
        redirectSignInUrls.find((url) => url.includes("localhost")) ||
        "http://localhost:3000/auth/callback";
    } else {
      // Use current host for production
      redirectUri = `${window.location.protocol}//${window.location.host}/auth/callback`;
    }

    // Redirect to Cognito managed login page
    const authUrl =
      `https://${domain}/oauth2/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    console.log("Redirecting to Cognito managed login:", authUrl);
    window.location.href = authUrl;
  }

  // Social Sign In (OAuth) - for specific providers
  async signInWithSocial(
    provider: "Google" | "Facebook" | "Amazon"
  ): Promise<void> {
    const domain = awsExports.Auth.oauth?.domain;

    if (!domain) {
      throw new Error("OAuth domain not configured");
    }

    // Use the configured redirect URIs instead of dynamically constructing
    const redirectSignInUrls = awsExports.Auth.oauth?.redirectSignIn || [];
    let redirectUri = "";

    // Choose the appropriate redirect URI based on current host
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      redirectUri =
        redirectSignInUrls.find((url) => url.includes("localhost")) ||
        "http://localhost:3000/auth/callback";
    } else {
      // Use current host for production
      redirectUri = `${window.location.protocol}//${window.location.host}/auth/callback`;
    }

    const authUrl =
      `https://${domain}/oauth2/authorize?` +
      `identity_provider=${provider}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `client_id=${this.clientId}&` +
      `scope=email+openid+profile`;

    window.location.href = authUrl;
  }

  // Biometric Authentication (WebAuthn)
  async signInWithBiometric(): Promise<AuthSession> {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error("Biometric authentication not supported");
      }

      // For demo purposes, we'll simulate biometric auth
      // In production, this would use WebAuthn API
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: "SageInsure" },
          user: {
            id: new Uint8Array(16),
            name: "demo@sageinsure.com",
            displayName: "Demo User",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
        },
      });

      if (credential) {
        // Simulate successful biometric auth
        return this.createDemoSession();
      }

      throw new Error("Biometric authentication failed");
    } catch (error: any) {
      throw new Error(error.message || "Biometric authentication failed");
    }
  }

  // Facial Recognition (using device camera)
  async signInWithFacial(): Promise<AuthSession> {
    try {
      // Check if camera is available
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // For demo purposes, we'll simulate facial recognition
      // In production, this would use a facial recognition service
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop());
      }, 3000);

      return this.createDemoSession();
    } catch (error: any) {
      throw new Error("Facial recognition not available or failed");
    }
  }

  // Session Management
  saveSession(session: AuthSession): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("sageinsure_auth_session", JSON.stringify(session));
    }
  }

  loadSession(): AuthSession | null {
    if (typeof window === "undefined") return null;

    try {
      const sessionData = localStorage.getItem("sageinsure_auth_session");
      if (!sessionData) return null;

      const session = JSON.parse(sessionData);

      // Check if session is expired
      if (session.expiresAt && session.expiresAt < Date.now()) {
        this.clearSession();
        return null;
      }

      return session;
    } catch (error) {
      console.error("Failed to load session:", error);
      return null;
    }
  }

  clearSession(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sageinsure_auth_session");
    }
  }

  // Sign Out (handles both local and OAuth sign-out)
  signOut(): void {
    if (typeof window !== "undefined") {
      // Clear all auth-related storage immediately
      localStorage.removeItem("sageinsure_auth_session");
      sessionStorage.removeItem("auth_redirect_attempted");

      // Set flag to indicate user explicitly signed out
      sessionStorage.setItem("user_signed_out", "true");

      // Clear any other auth-related items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes("auth") ||
            key.includes("cognito") ||
            key.includes("amplify"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Just clear local session and stay on current page
      // The app will detect the user is signed out and show the sign-out UI
      console.log("User signed out successfully");
    }
  }

  // Refresh Token
  async refreshSession(refreshToken: string): Promise<AuthSession> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      });

      const response = await this.cognitoClient.send(command);

      if (response.AuthenticationResult) {
        const user = await this.getUserFromToken(
          response.AuthenticationResult.IdToken!
        );
        return {
          user,
          accessToken: response.AuthenticationResult.AccessToken!,
          refreshToken: refreshToken, // Refresh token doesn't change
          idToken: response.AuthenticationResult.IdToken!,
          expiresAt:
            Date.now() + response.AuthenticationResult.ExpiresIn! * 1000,
        };
      }

      throw new Error("Token refresh failed");
    } catch (error: any) {
      throw new Error(error.message || "Session refresh failed");
    }
  }

  // Helper Methods
  private async getUserFromToken(idToken: string): Promise<User> {
    try {
      const payload = JSON.parse(atob(idToken.split(".")[1]));
      return {
        id: payload.sub,
        email: payload.email,
        username: payload["cognito:username"] || payload.email,
        name: payload.name,
        picture: payload.picture,
        phone: payload.phone_number,
        verified: payload.email_verified,
      };
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  private createDemoSession(): AuthSession {
    const user: User = {
      id: "demo-user-id",
      email: "demo@sageinsure.com",
      username: "demo",
      name: "Demo User",
      verified: true,
    };

    return {
      user,
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      idToken: "demo-id-token",
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
  }
}

export const authService = new AuthService();
