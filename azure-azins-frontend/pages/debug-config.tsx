export default function DebugConfig() {
  const handleTestRedirect = () => {
    console.log("Environment variables:");
    console.log("USER_POOL_ID:", process.env.NEXT_PUBLIC_USER_POOL_ID);
    console.log(
      "USER_POOL_CLIENT_ID:",
      process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID
    );
    console.log("COGNITO_DOMAIN:", process.env.NEXT_PUBLIC_COGNITO_DOMAIN);
    console.log("REDIRECT_SIGN_IN:", process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN);

    // Manual test URL
    const testUrl =
      `https://${process.env.NEXT_PUBLIC_COGNITO_DOMAIN}/oauth2/authorize?` +
      `client_id=${process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID}&` +
      `response_type=code&` +
      `scope=email+openid+profile&` +
      `redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN!)}`;

    console.log("Test URL:", testUrl);
    window.open(testUrl, "_blank");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug OAuth Configuration</h1>

      <div className="space-y-2 mb-6">
        <p>
          <strong>User Pool ID:</strong> {process.env.NEXT_PUBLIC_USER_POOL_ID}
        </p>
        <p>
          <strong>Client ID:</strong>{" "}
          {process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID}
        </p>
        <p>
          <strong>Domain:</strong> {process.env.NEXT_PUBLIC_COGNITO_DOMAIN}
        </p>
        <p>
          <strong>Redirect URI:</strong>{" "}
          {process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN}
        </p>
      </div>

      <button
        onClick={handleTestRedirect}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
        Test Manual OAuth URL
      </button>

      <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
        <p>
          <strong>Expected URL:</strong>
        </p>
        <p className="break-all">
          https://{process.env.NEXT_PUBLIC_COGNITO_DOMAIN}
          /oauth2/authorize?client_id=
          {process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID}
          &response_type=code&scope=email+openid+profile&redirect_uri=
          {encodeURIComponent(process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN!)}
        </p>
      </div>
    </div>
  );
}
