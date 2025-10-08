import React from "react";
import { environmentConfig, msalConfig } from "../lib/msal-config";

const AuthTest: React.FC = () => {
  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>MSAL Configuration Test</h1>

      <h2>Environment Detection</h2>
      <div>
        <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
        <br />
        <strong>isProduction:</strong>{" "}
        {environmentConfig.isProduction.toString()}
        <br />
        <strong>isDevelopment:</strong>{" "}
        {environmentConfig.isDevelopment.toString()}
        <br />
        <strong>useProductionConfig:</strong>{" "}
        {environmentConfig.useProductionConfig.toString()}
        <br />
        <strong>isProductionDomain:</strong>{" "}
        {environmentConfig.isProductionDomain.toString()}
        <br />
        <strong>Current hostname:</strong>{" "}
        {typeof window !== "undefined" ? window.location.hostname : "SSR"}
        <br />
      </div>

      <h2>MSAL Configuration</h2>
      <div>
        <strong>Client ID:</strong> {environmentConfig.clientId}
        <br />
        <strong>Tenant ID:</strong> {environmentConfig.tenantId}
        <br />
        <strong>Redirect URI:</strong> {environmentConfig.redirectUri}
        <br />
        <strong>API Base URL:</strong> {environmentConfig.apiBaseUrl}
        <br />
      </div>

      <h2>Environment Variables</h2>
      <div>
        <strong>NEXT_PUBLIC_AZURE_CLIENT_ID:</strong>{" "}
        {process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}
        <br />
        <strong>NEXT_PUBLIC_AZURE_TENANT_ID:</strong>{" "}
        {process.env.NEXT_PUBLIC_AZURE_TENANT_ID}
        <br />
        <strong>NEXT_PUBLIC_REDIRECT_URI:</strong>{" "}
        {process.env.NEXT_PUBLIC_REDIRECT_URI}
        <br />
        <strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL}
        <br />
        <strong>NEXT_PUBLIC_DEVELOPMENT_MODE:</strong>{" "}
        {process.env.NEXT_PUBLIC_DEVELOPMENT_MODE}
        <br />
      </div>

      <h2>MSAL Auth Config</h2>
      <div>
        <strong>Authority:</strong> {msalConfig.auth.authority}
        <br />
        <strong>Redirect URI:</strong> {msalConfig.auth.redirectUri}
        <br />
        <strong>Post Logout Redirect URI:</strong>{" "}
        {msalConfig.auth.postLogoutRedirectUri}
        <br />
      </div>
    </div>
  );
};

export default AuthTest;
