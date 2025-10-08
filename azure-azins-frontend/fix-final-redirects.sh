#!/bin/bash

# Define the correct User Pool and Client IDs
USER_POOL_ID="us-east-1_eFC9Xu9Mq"
CLIENT_ID="4n3ufqhb1uevi6vjq6vddmtvb2"

# Define the Redirect URLs as comma-separated lists
CALLBACK_URLS="https://insure.maplesage.com/auth/callback,http://localhost:3000/auth/callback"
LOGOUT_URLS="https://insure.maplesage.com/sign-out,http://localhost:3000/sign-out"

echo "Updating Cognito User Pool Client $CLIENT_ID..."

aws cognito-idp update-user-pool-client \
--user-pool-id "$USER_POOL_ID" \
--client-id "$CLIENT_ID" \
--callback-urls "$CALLBACK_URLS" \
--logout-urls "$LOGOUT_URLS" \
--supported-identity-providers "COGNITO" "Google" "Facebook" "LoginWithAmazon" \
--allowed-o-auth-flows-user-pool-client \
--allowed-o-auth-flows "code" \
--allowed-o-auth-scopes "openid" "email" "profile" \
--region us-east-1

echo "✅ Cognito User Pool Client updated successfully."
