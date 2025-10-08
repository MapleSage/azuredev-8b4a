// Debug script to test social login configuration
import awsExports from "./lib/aws-exports.js";

console.log("=== Social Login Debug ===");
console.log("OAuth Domain:", awsExports.Auth.oauth?.domain);
console.log("Client ID:", awsExports.Auth.userPoolWebClientId);
console.log("Redirect URLs:", awsExports.Auth.oauth?.redirectSignIn);
console.log(
  "Current hostname:",
  typeof window !== "undefined" ? window.location.hostname : "server-side"
);

// Test URL construction
const domain = awsExports.Auth.oauth?.domain;
const clientId = awsExports.Auth.userPoolWebClientId;
const redirectSignInUrls = awsExports.Auth.oauth?.redirectSignIn || [];

if (domain && clientId) {
  const redirectUri =
    redirectSignInUrls.find((url) => url.includes("localhost")) ||
    redirectSignInUrls[0];

  const googleUrl =
    `https://${domain}/oauth2/authorize?` +
    `identity_provider=Google&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `client_id=${clientId}&` +
    `scope=openid+email+profile`;

  console.log("Generated Google OAuth URL:", googleUrl);
} else {
  console.error("Missing OAuth configuration:", { domain, clientId });
}
