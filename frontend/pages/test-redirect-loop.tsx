import { useEffect, useState } from "react";
import {
  getRedirectLoopDetector,
  trackAuthAttempt,
  isRedirectLoopDetected,
  clearRedirectLoopData,
} from "../lib/utils/redirect-loop-detector";

export default function TestRedirectLoop() {
  const [detector, setDetector] = useState<any>(null);
  const [status, setStatus] = useState<string>("Loading...");
  const [attempts, setAttempts] = useState<number>(0);
  const [isLoopDetected, setIsLoopDetected] = useState<boolean>(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const det = getRedirectLoopDetector();
      setDetector(det);
      updateStatus(det);
    }
  }, []);

  const updateStatus = (det: any) => {
    if (det) {
      setAttempts(det.getAttemptCount());
      setIsLoopDetected(det.isLoopDetected());
      setStatus(
        `Attempts: ${det.getAttemptCount()}, Loop Detected: ${det.isLoopDetected()}`
      );
    }
  };

  const handleTrackAttempt = () => {
    if (detector) {
      trackAuthAttempt();
      updateStatus(detector);
    }
  };

  const handleClearData = () => {
    if (detector) {
      clearRedirectLoopData();
      updateStatus(detector);
    }
  };

  const handleTestLoop = () => {
    if (detector) {
      // Simulate multiple rapid attempts
      for (let i = 0; i < 6; i++) {
        trackAuthAttempt(`/test-attempt-${i}`);
      }
      updateStatus(detector);
    }
  };

  if (typeof window === "undefined") {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Redirect Loop Detection Test
        </h1>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Status</h2>
          <p className="text-lg mb-2">{status}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Attempts:</strong> {attempts}
            </div>
            <div>
              <strong>Loop Detected:</strong> {isLoopDetected ? "Yes" : "No"}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
          <div className="space-x-4">
            <button
              onClick={handleTrackAttempt}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Track Single Attempt
            </button>
            <button
              onClick={handleTestLoop}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              Simulate Loop (6 attempts)
            </button>
            <button
              onClick={handleClearData}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
              Clear Data
            </button>
          </div>
        </div>

        {detector && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Diagnostics</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(detector.getDiagnostics(), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
