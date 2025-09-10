"use client";

import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { b2cPolicies } from "../../msal/msalConfig";

export function B2CErrorHandler() {
  const { instance } = useMsal();

  useEffect(() => {
    const handleB2CResponse = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");
      const code = urlParams.get("code");
      const state = urlParams.get("state");

      // If we have an authorization code, MSAL should handle it automatically
      if (code && state) {
        console.log("Authorization code received, MSAL will handle the response");
        // Clean up URL without the auth parameters
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        return;
      }

      // Handle B2C password reset flow
      if (error === "access_denied" && errorDescription?.includes("AADB2C90118")) {
        try {
          await instance.loginRedirect({
            authority: b2cPolicies.authorities.forgotPassword.authority,
            scopes: ["openid", "profile"],
          });
        } catch (resetError) {
          console.error("Password reset redirect failed:", resetError);
        }
      }

      // Handle B2C profile edit cancellation
      if (error === "access_denied" && errorDescription?.includes("AADB2C90091")) {
        // User cancelled profile editing, redirect back to app
        window.history.replaceState({}, document.title, "/chat");
      }

      // Handle other B2C errors
      if (error && !code) {
        console.error("B2C Authentication error:", error, errorDescription);
        // Clean up URL
        window.history.replaceState({}, document.title, "/chat");
      }
    };

    handleB2CResponse();
  }, [instance]);

  return null;
}