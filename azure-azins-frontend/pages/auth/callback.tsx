import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { authService, AuthSession } from "../../lib/auth-service";

export default function AuthCallback() {
  const router = useRouter();
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { code, error, error_description } = router.query;

        console.log("Callback received:", { code, error, error_description });

        if (error) {
          console.error("OAuth error:", error, error_description);
          setMessage(`Authentication failed: ${error_description || error}`);
          setTimeout(() => router.replace("/"), 3000);
          return;
        }

        if (code) {
          console.log("Authorization code received:", code);
          setMessage("Exchanging authorization code for tokens...");

          try {
            const tokenResponse = await fetch("/api/auth/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ code: code }),
            });

            console.log("Token response status:", tokenResponse.status);

            if (tokenResponse.ok) {
              const tokens = await tokenResponse.json();
              console.log("Tokens received successfully");

              // Parse the ID token to get user info
              let user;
              try {
                const idTokenPayload = JSON.parse(
                  atob(tokens.id_token.split(".")[1])
                );
                user = {
                  id: idTokenPayload.sub,
                  email: idTokenPayload.email,
                  username:
                    idTokenPayload["cognito:username"] || idTokenPayload.email,
                  name: idTokenPayload.name,
                  picture: idTokenPayload.picture,
                  phone: idTokenPayload.phone_number,
                  verified: idTokenPayload.email_verified,
                };
              } catch (parseError) {
                console.error("Failed to parse ID token:", parseError);
                user = {
                  id: tokens.sub || "oauth_user",
                  email: tokens.email || "user@maplesage.com",
                  username: tokens.username || tokens.email || "oauth_user",
                  name: tokens.name,
                  picture: tokens.picture,
                  phone: tokens.phone_number,
                  verified: tokens.email_verified,
                };
              }

              // Create a proper auth session for the auth service
              const authSession: AuthSession = {
                user,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                idToken: tokens.id_token,
                expiresAt: Date.now() + (tokens.expires_in || 3600) * 1000,
              };

              // Step 2: Get Fargate session token for API access
              setMessage("Getting API session token...");

              try {
                const sessionResponse = await fetch(
                  "/api/auth/token-exchange",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      authCode: code,
                      userId: user.id,
                    }),
                  }
                );

                if (sessionResponse.ok) {
                  const sessionData = await sessionResponse.json();
                  console.log("Fargate session token received");

                  // Add the session token to our auth session
                  authSession.sessionToken = sessionData.tokens.sessionToken;
                  authSession.sessionId = sessionData.sessionId;
                } else {
                  console.warn(
                    "Failed to get Fargate session token, continuing with Cognito tokens only"
                  );
                }
              } catch (sessionError) {
                console.warn("Session token exchange failed:", sessionError);
                // Continue with just Cognito tokens
              }

              // Use the auth service to save the session properly
              authService.saveSession(authSession);

              setMessage("Authentication successful! Redirecting...");

              // Clear any redirect flags
              sessionStorage.removeItem("auth_redirect_attempted");

              // Trigger a storage event to notify the auth context
              window.dispatchEvent(
                new StorageEvent("storage", {
                  key: "sageinsure_auth_session",
                  newValue: JSON.stringify(authSession),
                })
              );

              // Use router.replace instead of window.location.href to avoid redirect loops
              setTimeout(() => {
                router.replace("/");
              }, 1000);
            } else {
              const error = await tokenResponse.json();
              console.error("Token exchange failed:", error);
              setMessage("Authentication failed");
              setTimeout(() => router.replace("/"), 2000);
            }
          } catch (tokenError) {
            console.error("Token exchange error:", tokenError);
            setMessage("Authentication failed");
            setTimeout(() => router.replace("/"), 2000);
          }
        } else {
          console.log("No code received, redirecting to home");
          router.replace("/");
        }
      } catch (error) {
        console.error("Callback handling error:", error);
        setMessage("Authentication error occurred");
        setTimeout(() => router.replace("/"), 2000);
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
