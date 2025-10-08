// Test different domain formats
const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const CLIENT_SECRET = "19qt5sdcundafnmsq0g1pvnjnrfolgu2tice2cgtenokdh8d9ao";

const testDomains = [
  "https://auth2.maplesage.com/oauth2/token",
  "https://sageinsure-agentcore.auth.us-east-1.amazoncognito.com/oauth2/token",
  // Try different variations
  "https://us-east-1_eFC9Xu9Mq.auth.us-east-1.amazoncognito.com/oauth2/token",
];

const testDomain = async (url) => {
  console.log(`\n🔄 Testing: ${url}`);

  const tokenBody = {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: "dummy-code-for-testing",
    redirect_uri: "http://localhost:3000/auth/callback",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenBody),
      timeout: 5000, // 5 second timeout
    });

    const result = await response.text();
    console.log(`✅ Status: ${response.status}`);
    console.log(`📝 Response: ${result}`);

    if (response.status === 400 && result.includes("invalid_grant")) {
      console.log(
        `🎯 This domain works! (invalid_grant is expected with dummy code)`
      );
    }
  } catch (error) {
    if (error.code === "ETIMEDOUT") {
      console.log(`❌ Timeout - domain likely doesn't exist`);
    } else {
      console.log(`❌ Error: ${error.message}`);
    }
  }
};

console.log("🔍 Testing different Cognito domain formats...");
testDomains.forEach((domain) => testDomain(domain));
