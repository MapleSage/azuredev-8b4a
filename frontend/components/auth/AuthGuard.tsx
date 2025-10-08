import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../lib/msal-auth-context";
import { isProtectedRoute, isPublicRoute } from "../../lib/msal-config";
import LoginButton from "./LoginButton";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth,
  redirectTo = "/login",
}) => {
  const { isAuthenticated, isLoading, error } = useAuth();
  const router = useRouter();

  // Determine if authentication is required
  const authRequired =
    requireAuth !== undefined ? requireAuth : isProtectedRoute(router.pathname);

  useEffect(() => {
    // Don't redirect during loading or if auth is not required
    if (isLoading || !authRequired) return;

    // Redirect unauthenticated users to login
    if (!isAuthenticated && authRequired) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, authRequired, router, redirectTo]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <LoginButton className="w-full">Try Again</LoginButton>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt for protected routes
  if (authRequired && !isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-blue-500 text-6xl mb-4">🔐</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Sign In Required
            </h1>
            <p className="text-gray-600 mb-6">
              Please sign in to access SageInsure AI Assistant.
            </p>
            <LoginButton className="w-full">Sign in with Microsoft</LoginButton>
          </div>
        </div>
      </div>
    );
  }

  // Render children for authenticated users or public routes
  return <>{children}</>;
};

export default AuthGuard;
