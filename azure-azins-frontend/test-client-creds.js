// Test client credentials with a simple client_credentials grant
const CLIENT_ID = "4n3ufqhb1uevi6vjq6vddmtvb2";
const CLIENT_SECRET = "19qt5sdcundafnmsq0g1pvnjnrfolgu2tice2cgtenokdh8d9ao";
const COGNITO_DOMAIN = "auth2.maplesage.com";

const testClientCredentials = async () => {
  console.log("Testing client credentials...");

  const tokenBody = {
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
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
    console.log("Response status:", response.status);
    console.log("Response:", result);

    if (response.status === 400) {
      const error = JSON.parse(result);
      if (error.error === "unauthorized_client") {
        console.log(
          "❌ Client credentials are invalid or client_credentials grant not enabled"
        );
      } else if (error.error === "unsupported_grant_type") {
        console.log(
          "✅ Client credentials are valid, but client_credentials grant not enabled (this is expected)"
        );
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

testClientCredentials();
