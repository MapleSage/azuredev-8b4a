import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMsal } from "@azure/msal-react";
import { EventType } from "@azure/msal-browser";
import {
  getRedirectLoopDetector,
  trackAuthAttempt,
  clearRedirectLoopData,
} from "../../lib/utils/redirect-loop-detector";

export default function AuthCallback() {
  const router = useRouter();
  const { instance } = useMsal();
  const [message, setMessage] = useState("Processing authentication...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setMessage("Processing MSAL authentication...");

        // Check for redirect loop before processing callback
        const detector = getRedirectLoopDetector();
        if (detector.isLoopDetected() && !detector.shouldBypass()) {
          console.error("Redirect loop detected in callback");
          setMessage(
            "Authentication error: Too many redirect attempts. Please wait and try again."
          );

          setTimeout(() => {
            router.replace("/?error=redirect_loop");
          }, 3000);
          return;
        }

        // Track this callback attempt
        trackAuthAttempt(window.location.href);

        // Handle the redirect response with timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Callback timeout")), 30000); // 30 second timeout
        });

        const response = await Promise.race([
          instance.handleRedirectPromise(),
          timeoutPromise,
        ]);

        if (response) {
          console.log("MSAL authentication successful:", response);
          setMessage("Authentication successful! Redirecting...");

          // Set the active account
          instance.setActiveAccount(response.account);

          // Clear redirect loop data on successful authentication
          clearRedirectLoopData();

          // Redirect to the main application
          setTimeout(() => {
            router.replace("/");
          }, 1000);
        } else {
          // Check if there's already an active account
          const accounts = instance.getAllAccounts();
          if (accounts.length > 0) {
            console.log("Existing account found, redirecting...");
            instance.setActiveAccount(accounts[0]);

            // Clear redirect loop data if we have a valid account
            clearRedirectLoopData();

            router.replace("/");
          } else {
            console.log("No authentication response, redirecting to home");

            // Don't clear redirect loop data here as this might be part of a loop
            setTimeout(() => {
              router.replace("/");
            }, 1000);
          }
        }
      } catch (error) {
        console.error("MSAL callback error:", error);

        // Check if this might be a timeout or loop-related error
        const detector = getRedirectLoopDetector();
        if (detector.getAttemptCount() > 3) {
          setMessage(
            "Authentication failed: Too many attempts. Please wait and try again."
          );
          setTimeout(() => {
            router.replace("/?error=auth_failed");
          }, 3000);
        } else {
          setMessage("Authentication failed. Redirecting...");
          setTimeout(() => {
            router.replace("/");
          }, 2000);
        }
      }
    };

    // Set up event listener for authentication events
    const callbackId = instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS) {
        console.log("Login success event:", event);
        setMessage("Login successful! Redirecting...");
      } else if (event.eventType === EventType.LOGIN_FAILURE) {
        console.error("Login failure event:", event);
        setMessage("Login failed. Please try again.");
      }
    });

    if (router.isReady) {
      handleCallback();
    }

    // Cleanup event listener
    return () => {
      if (callbackId) {
        instance.removeEventCallback(callbackId);
      }
    };
  }, [router, instance]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
