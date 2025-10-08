import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { clearRedirectLoopData } from "../lib/utils/redirect-loop-detector";

export default function ClearRedirectLoop() {
  const router = useRouter();
  const [status, setStatus] = useState("Clearing redirect loop data...");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        clearRedirectLoopData();
        setStatus("✅ Redirect loop data cleared successfully!");

        setTimeout(() => {
          router.push("/");
        }, 2000);
      } catch (error) {
        setStatus("❌ Error clearing redirect loop data");
        console.error("Error clearing redirect loop data:", error);
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Clear Redirect Loop Data
          </h1>
          <p className="text-gray-600 mb-4">{status}</p>
          <div className="text-sm text-gray-500">
            You will be redirected to the home page shortly...
          </div>
        </div>
      </div>
    </div>
  );
}
