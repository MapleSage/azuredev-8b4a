import { useEffect } from "react";
import { signOut } from "aws-amplify/auth";

export default function ClearAuth() {
  useEffect(() => {
    const clearSession = async () => {
      try {
        console.log("Starting aggressive session clear...");

        // Clear all browser storage first
        localStorage.clear();
        sessionStorage.clear();

        // Clear cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie =
            name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie =
            name +
            "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" +
            window.location.hostname;
        });

        // Clear IndexedDB (where Amplify might store data)
        if ("indexedDB" in window) {
          const databases = await indexedDB.databases();
          databases.forEach((db) => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        }

        // Try to sign out from Amplify
        try {
          await signOut({ global: true });
        } catch (amplifyError) {
          console.log("Amplify signOut failed (expected):", amplifyError);
        }

        // Clear storage again after signOut attempt
        localStorage.clear();
        sessionStorage.clear();

        console.log("Session cleared, redirecting...");

        // Force a hard reload to completely reset the app state
        setTimeout(() => {
          window.location.replace("/");
        }, 1000);
      } catch (error) {
        console.log("Clear session error:", error);
        // Force clear and redirect even on error
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace("/");
      }
    };
    clearSession();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">
          Clearing all authentication data...
        </p>
        <p className="mt-2 text-sm text-gray-500">This may take a moment</p>
      </div>
    </div>
  );
}
