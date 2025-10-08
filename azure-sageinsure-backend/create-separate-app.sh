#!/bin/bash

# Create separate Azure AD app for SageInsure
echo "🔐 Creating separate Azure AD app for SageInsure..."

# Method 1: Try CLI with minimal permissions
APP_RESULT=$(az ad app create \
  --display-name "SageInsure-Separate" \
  --web-redirect-uris "https://gentle-sand-0f68e870f.2.azurestaticapps.net/.auth/login/aad/callback" \
  --enable-id-token-issuance \
  --enable-access-token-issuance 2>/dev/null)

if [ $? -eq 0 ]; then
  APP_ID=$(echo $APP_RESULT | jq -r '.appId')
  echo "✅ App created: $APP_ID"
else
  echo "❌ CLI failed - use manual method:"
  echo ""
  echo "🔗 Go to: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
  echo ""
  echo "📝 Manual steps:"
  echo "1. Click 'New registration'"
  echo "2. Name: 'SageInsure-Backend'"
  echo "3. Redirect URI: https://gentle-sand-0f68e870f.2.azurestaticapps.net/.auth/login/aad/callback"
  echo "4. Click 'Register'"
  echo "5. Copy Application (client) ID"
  echo "6. Go to 'Authentication' → Enable 'ID tokens' and 'Access tokens'"
  echo ""
  echo "🔧 Then update Static Web App:"
  echo "az staticwebapp appsettings set \\"
  echo "  --name sageinsure-frontend \\"
  echo "  --resource-group sageinsure-backend-rg \\"
  echo "  --setting-names AZURE_CLIENT_ID=YOUR_APP_ID"
fi

echo ""
echo "🔗 Tenant ID: $(az account show --query tenantId -o tsv)"