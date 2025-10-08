// Debug script to test different redirect URIs
const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const CLIENT_SECRET = "19qt5sdcundafnmsq0g1pvnjnrfolgu2tice2cgtenokdh8d9ao";
const COGNITO_DOMAIN = "auth2.maplesage.com";

const testRedirectUris = [
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/callback",
  "https://insure.maplesage.com/auth/callback",
];

const testTokenExchange = async (redirectUri) => {
  console.log(`\n🔄 Testing redirect URI: ${redirectUri}`);

  const tokenBody = {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: "dummy-code-for-testing",
    redirect_uri: redirectUri,
  };

  try {
    const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenBody),
    });

    const result = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${result}`);

    if (response.status !== 400 || !result.includes("invalid_grant")) {
      console.log(`✅ This redirect URI might be correct!`);
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

console.log("🔍 Testing different redirect URIs to find the correct one...");
testRedirectUris.forEach((uri) => testTokenExchange(uri));
