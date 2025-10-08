import { useEffect } from "react";
import { useRouter } from "next/router";
import { authService } from "../lib/auth-service";

export default function SignOut() {
  const router = useRouter();

  useEffect(() => {
    // Clear any local storage and session storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("sageinsure_auth_session");
      sessionStorage.removeItem("auth_redirect_attempted");

      // Set a flag to prevent automatic re-login
      sessionStorage.setItem("user_signed_out", "true");

      // Clear any other auth-related storage
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
    }

    // Show sign-out message and provide manual login option
    const redirectTimer = setTimeout(() => {
      // Don't auto-redirect, let user manually choose to login
      // router.push("/");
    }, 2000);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage:
          "url(/6CAD2AEF-0D28-4041-9EF9-F75440E6951A_1_105_c.jpeg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}>
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      <div className="text-center relative z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg p-8 shadow-xl">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Successfully Signed Out
          </h2>
          <p className="text-gray-600 mb-6">
            You have been successfully signed out of SageInsure.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem("user_signed_out");
              authService.redirectToManagedLogin();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}
