import React, { useState } from "react";
import { useAuth } from "../../lib/msal-auth-context";
import { getErrorMessage } from "../../lib/utils/auth-utils";

interface LoginButtonProps {
  className?: string;
  children?: React.ReactNode;
  onLoginStart?: () => void;
  onLoginSuccess?: () => void;
  onLoginError?: (error: string) => void;
}

export const LoginButton: React.FC<LoginButtonProps> = ({
  className = "",
  children,
  onLoginStart,
  onLoginSuccess,
  onLoginError,
}) => {
  const { signIn, isLoading, error } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsSigningIn(true);
      onLoginStart?.();

      await signIn();

      onLoginSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.message || "Login failed";
      onLoginError?.(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const isButtonLoading = isLoading || isSigningIn;

  return (
    <button
      onClick={handleLogin}
      disabled={isButtonLoading}
      className={`
        inline-flex items-center justify-center px-6 py-3 
        border border-transparent text-base font-medium rounded-md 
        text-white bg-blue-600 hover:bg-blue-700 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}>
      {isButtonLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Signing in...
        </>
      ) : (
        children || (
          <>
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Sign in with Microsoft
          </>
        )
      )}
    </button>
  );
};

export default LoginButton;
