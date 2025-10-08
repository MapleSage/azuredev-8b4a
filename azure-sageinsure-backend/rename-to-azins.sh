#!/bin/bash

# Rename all Azure resources to azins
echo "🔄 Renaming to azins..."

# Create new resource group
az group create --name azins-rg --location eastus

# Create Azure AD app
az ad app create \
  --display-name "AzIns-Platform" \
  --web-redirect-uris "https://azins.maplesage.com/.auth/login/aad/callback" \
  --enable-id-token-issuance \
  --enable-access-token-issuance

# Create new resources with azins naming
az functionapp create \
  --resource-group azins-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name azins-functions \
  --storage-account azinsstorage \
  --os-type Linux

az staticwebapp create \
  --name azins-frontend \
  --resource-group azins-rg \
  --location eastus2

echo "✅ Renamed to azins!"
echo "🔗 New URLs:"
echo "  - Frontend: azins-frontend.azurestaticapps.net"
echo "  - Functions: azins-functions.azurewebsites.net"