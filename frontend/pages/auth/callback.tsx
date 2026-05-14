import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useMsal } from "@azure/msal-react";
import { EventType } from "@azure/msal-browser";
import { clearRedirectLoopData } from "../../lib/utils/redirect-loop-detector";

export default function AuthCallback() {
  const router = useRouter();
  const { instance } = useMsal();
  const [message, setMessage] = useState("Processing authentication...");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setMessage("Processing MSAL authentication...");
        setDetail(null);

        const queryError = router.query.error;
        const queryErrorDescription = router.query.error_description;
        if (queryError || queryErrorDescription) {
          const description = Array.isArray(queryErrorDescription)
            ? queryErrorDescription.join(" ")
            : queryErrorDescription;
          const code = Array.isArray(queryError) ? queryError.join(" ") : queryError;
          throw new Error([code, description].filter(Boolean).join(": "));
        }

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
      } catch (error: any) {
        console.error("MSAL callback error:", error);
        const errorMessage =
          error?.errorMessage ||
          error?.message ||
          error?.toString?.() ||
          "Unknown authentication error";

        setMessage("Authentication failed.");
        setDetail(errorMessage);
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
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 px-6">
      {message === "Authentication failed." ? (
        <div className="max-w-xl rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <img
              src="/brand/sagesure-mark.png"
              alt="SageSure"
              className="h-10 w-10 object-contain"
            />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Authentication failed</h1>
          {detail && (
            <p className="mt-4 break-words rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">
              {detail}
            </p>
          )}
          <button
            onClick={() => {
              clearRedirectLoopData();
              router.replace("/");
            }}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Reset sign-in state
          </button>
        </div>
      ) : (
        <>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">{message}</p>
        </>
      )}
    </div>
  );
}
