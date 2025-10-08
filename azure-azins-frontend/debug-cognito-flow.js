#!/usr/bin/env node

/**
 * Debug script to test the complete Cognito OAuth flow
 * This helps identify where the invalid_grant error is coming from
 */

const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const CLIENT_SECRET = "19qt5sdcundafnmsq0g1pvnjnrfolgu2tice2cgtenokdh8d9ao";
const CUSTOM_DOMAIN = "auth2.maplesage.com";
const AWS_DOMAIN = "sageinsure-auth";
const REDIRECT_URI = "http://localhost:3000/auth/callback";

console.log("🔍 Cognito OAuth Flow Debug");
console.log("==========================");

// Step 1: Show the authorization URL that should be used (now using AWS domain)
console.log("\n1. Authorization URL (use this to get a code):");
const authUrl =
  `https://${CUSTOM_DOMAIN}/oauth2/authorize?` +
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=openid+email+profile`;

console.log(authUrl);

// Step 2: Test token exchange with both domains
async function testTokenExchange(code) {
  if (!code) {
    console.log("\n❌ No authorization code provided");
    console.log("Usage: node debug-cognito-flow.js <authorization_code>");
    return;
  }

  console.log(
    `\n2. Testing token exchange with code: ${code.substring(0, 10)}...`
  );

  const tokenUrls = [
    `https://${CUSTOM_DOMAIN}/oauth2/token`,
    `https://${AWS_DOMAIN}.auth.us-east-1.amazoncognito.com/oauth2/token`,
  ];

  for (const tokenUrl of tokenUrls) {
    console.log(`\n🔄 Trying: ${tokenUrl}`);

    const tokenBody = {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI,
    };

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(tokenBody),
      });

      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        const tokens = await response.json();
        console.log("✅ SUCCESS! Token exchange worked");
        console.log("Token types received:", Object.keys(tokens));

        // Decode ID token to show user info
        if (tokens.id_token) {
          const payload = JSON.parse(
            Buffer.from(tokens.id_token.split(".")[1], "base64").toString()
          );
          console.log("User info:", {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
          });
        }
        return;
      } else {
        const errorText = await response.text();
        console.log(`❌ Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  console.log("\n💡 Troubleshooting tips:");
  console.log(
    "1. Make sure the authorization code is fresh (not expired or used)"
  );
  console.log(
    "2. Verify the redirect URI matches exactly what was used in authorization"
  );
  console.log("3. Check that the Cognito app client is configured correctly");
  console.log("4. Ensure the client secret is correct");
}

// Run the test if a code is provided
const code = process.argv[2];
testTokenExchange(code);
