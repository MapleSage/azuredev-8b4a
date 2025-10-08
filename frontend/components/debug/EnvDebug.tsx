import React from "react";

export const EnvDebug: React.FC = () => {
  if (process.env.NODE_ENV === "production") {
    return null; // Don't show in production
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        fontSize: "12px",
        zIndex: 9999,
        maxWidth: "300px",
      }}>
      <h4>Environment Debug</h4>
      <div>NODE_ENV: {process.env.NODE_ENV}</div>
      <div>DEVELOPMENT_MODE: {process.env.NEXT_PUBLIC_DEVELOPMENT_MODE}</div>
      <div>
        CLIENT_ID: {process.env.NEXT_PUBLIC_AZURE_CLIENT_ID?.substring(0, 8)}...
      </div>
      <div>REDIRECT_URI: {process.env.NEXT_PUBLIC_REDIRECT_URI}</div>
      <div>API_URL: {process.env.NEXT_PUBLIC_API_URL}</div>
    </div>
  );
};
