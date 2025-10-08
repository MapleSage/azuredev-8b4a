import React, { useState } from "react";
import { useAuth } from "../../lib/msal-auth-context";

interface LogoutButtonProps {
  className?: string;
  children?: React.ReactNode;
  onLogoutStart?: () => void;
  onLogoutSuccess?: () => void;
  onLogoutError?: (error: string) => void;
}

export const LogoutButton: React.FC<LogoutButtonProps> = ({
  className = "",
  children,
  onLogoutStart,
  onLogoutSuccess,
  onLogoutError,
}) => {
  const { signOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      onLogoutStart?.();

      await signOut();

      onLogoutSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.message || "Logout failed";
      onLogoutError?.(errorMessage);
    } finally {
      setIsSigningOut(false);
    }
  };

  const isButtonLoading = isLoading || isSigningOut;

  return (
    <button
      onClick={handleLogout}
      disabled={isButtonLoading}
      className={`
        inline-flex items-center justify-center px-4 py-2 
        border border-gray-300 text-sm font-medium rounded-md 
        text-gray-700 bg-white hover:bg-gray-50 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        ${className}
      `}>
      {isButtonLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500"
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
          Signing out...
        </>
      ) : (
        children || (
          <>
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Sign out
          </>
        )
      )}
    </button>
  );
};

export default LogoutButton;
