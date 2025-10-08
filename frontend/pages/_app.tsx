import "../styles/globals.css";
import { AuthProvider } from "../lib/msal-auth-context";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { validateMsalConfig, isProtectedRoute } from "../lib/msal-config";

// Error Boundary Component
function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Configuration Error
          </h1>
          <p className="text-gray-600 mb-4">
            There's an issue with the authentication configuration. Please check
            your environment variables.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

// Loading Component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading SageInsure...</p>
      </div>
    </div>
  );
}

// Route Guard Component
function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Handle authentication callback
    if (router.pathname === "/auth/callback") {
      // MSAL will handle the callback automatically
      return;
    }
  }, [router.pathname]);

  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: any) {
  // Validate MSAL configuration on app start
  const configValid = validateMsalConfig();

  if (!configValid) {
    return (
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    );
  }

  return (
    <AuthProvider>
      <RouteGuard>
        <Component {...pageProps} />
      </RouteGuard>
    </AuthProvider>
  );
}
