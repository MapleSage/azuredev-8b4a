const {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const USER_POOL_ID = "us-east-1_eFC9Xu9Mq";
const REGION = "us-east-1";

const client = new CognitoIdentityProviderClient({ region: REGION });

async function checkCognitoConfig() {
  try {
    console.log("🔍 Checking Cognito User Pool Client configuration...");
    console.log(`User Pool ID: ${USER_POOL_ID}`);
    console.log(`Client ID: ${CLIENT_ID}`);
    console.log("");

    const command = new DescribeUserPoolClientCommand({
      UserPoolId: USER_POOL_ID,
      ClientId: CLIENT_ID,
    });

    const response = await client.send(command);
    const userPoolClient = response.UserPoolClient;

    console.log("📋 Current Configuration:");
    console.log("Callback URLs:", userPoolClient.CallbackURLs);
    console.log("Logout URLs:", userPoolClient.LogoutURLs);
    console.log(
      "Supported Identity Providers:",
      userPoolClient.SupportedIdentityProviders
    );
    console.log("OAuth Flows:", userPoolClient.AllowedOAuthFlows);
    console.log("OAuth Scopes:", userPoolClient.AllowedOAuthScopes);
    console.log("");

    console.log("✅ Expected URLs for your application:");
    console.log("- https://insure.maplesage.com/auth/callback");
    console.log("- http://localhost:3000/auth/callback");
    console.log("");

    const callbackUrls = userPoolClient.CallbackURLs || [];
    const hasProductionCallback = callbackUrls.includes(
      "https://insure.maplesage.com/auth/callback"
    );
    const hasLocalCallback = callbackUrls.includes(
      "http://localhost:3000/auth/callback"
    );

    if (hasProductionCallback && hasLocalCallback) {
      console.log("✅ All required callback URLs are configured!");
    } else {
      console.log("❌ Missing callback URLs:");
      if (!hasProductionCallback) {
        console.log("  - https://insure.maplesage.com/auth/callback");
      }
      if (!hasLocalCallback) {
        console.log("  - http://localhost:3000/auth/callback");
      }
      console.log("");
      console.log(
        "🔧 You need to add these URLs to your Cognito User Pool Client configuration."
      );
    }
  } catch (error) {
    console.error("❌ Error checking Cognito configuration:", error.message);

    if (error.name === "ResourceNotFoundException") {
      console.log("The User Pool or Client ID might be incorrect.");
    } else if (
      error.name === "UnauthorizedOperation" ||
      error.name === "AccessDenied"
    ) {
      console.log(
        "You need AWS credentials with cognito-idp:DescribeUserPoolClient permission."
      );
    }
  }
}

checkCognitoConfig();
