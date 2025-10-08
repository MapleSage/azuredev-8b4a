// Test script to verify Cognito configuration
const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const CLIENT_SECRET = "19qt5sdcundafnmsq0g1pvnjnrfolgu2tice2cgtenokdh8d9ao";
const COGNITO_DOMAIN = "auth2.maplesage.com";

console.log("Testing Cognito configuration...");
console.log("Client ID:", CLIENT_ID);
console.log("Domain:", COGNITO_DOMAIN);
console.log("Custom domain URL:", `https://${COGNITO_DOMAIN}/oauth2/token`);
console.log("Custom Cognito URL:", `https://auth2.maplesage.com/oauth2/token`);

// Test with a dummy authorization code to see what error we get
const testTokenExchange = async () => {
  const tokenBody = {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: "dummy-code-for-testing",
    redirect_uri: "http://localhost:3000/auth/callback",
  };

  try {
    const response = await fetch(`https://auth2.maplesage.com/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenBody),
    });

    const result = await response.text();
    console.log("Response status:", response.status);
    console.log("Response:", result);
  } catch (error) {
    console.error("Error:", error);
  }
};

testTokenExchange();
