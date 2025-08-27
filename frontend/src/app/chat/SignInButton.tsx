// frontend/src/app/chat/SignInButton.tsx
"use client";

import React from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionType, PopupRequest } from "@azure/msal-browser";

// Make sure you have a valid msalInstance in your provider
export default function SignInButton() {
  const { instance } = useMsal();

  const loginRequest: PopupRequest = {
    scopes: ["user.read"], // adjust scopes for your app
  };

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      console.log("Login successful");
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Sign in with SageInsure
    </button>
  );
}
