#!/bin/bash

# Migrate complete AWS backend to Azure with MSAL
echo "🔄 Migrating AWS SageInsure Backend to Azure..."

# Create resource group
az group create --name sageinsure-backend-rg --location eastus

# 1. Create Azure AD App (Cognito equivalent)
echo "1️⃣ Creating Azure AD App Registration..."
APP_ID=$(az ad app create \
  --display-name "SageInsure-App" \
  --sign-in-audience "AzureADMyOrg" \
  --web-redirect-uris "http://localhost:3000/auth/callback" \
  --query appId -o tsv)

# 2. Create Function App (Lambda equivalent)
echo "2️⃣ Creating Azure Functions..."
az storage account create \
  --name sageinsurestorage2 \
  --resource-group sageinsure-backend-rg \
  --location eastus \
  --sku Standard_LRS

az functionapp create \
  --resource-group sageinsure-backend-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name sageinsure-functions \
  --storage-account sageinsurestorage2

# 3. Create Cosmos DB (DynamoDB equivalent)
echo "3️⃣ Creating Cosmos DB..."
az cosmosdb create \
  --name sageinsure-cosmos \
  --resource-group sageinsure-backend-rg \
  --locations regionName=eastus \
  --capabilities EnableServerless

az cosmosdb sql database create \
  --account-name sageinsure-cosmos \
  --resource-group sageinsure-backend-rg \
  --name sageinsure

# 4. Create Event Grid (EventBridge equivalent)
echo "4️⃣ Creating Event Grid..."
az eventgrid topic create \
  --name sageinsure-events \
  --resource-group sageinsure-backend-rg \
  --location eastus

# 5. Create Service Bus (SQS equivalent)
echo "5️⃣ Creating Service Bus..."
az servicebus namespace create \
  --name sageinsure-servicebus \
  --resource-group sageinsure-backend-rg \
  --location eastus \
  --sku Standard

# 6. Create API Management (API Gateway equivalent)
echo "6️⃣ Creating API Management..."
az apim create \
  --name sageinsure-apim \
  --resource-group sageinsure-backend-rg \
  --location eastus \
  --publisher-email admin@sageinsure.com \
  --publisher-name SageInsure \
  --sku-name Consumption

# 7. Create Static Web App (CloudFront equivalent)
echo "7️⃣ Creating Static Web App..."
az staticwebapp create \
  --name sageinsure-frontend \
  --resource-group sageinsure-backend-rg \
  --location eastus2

echo "✅ Azure Backend Migration Complete!"
echo "🔗 Outputs:"
echo "  - Client ID: $APP_ID"
echo "  - Tenant ID: $(az account show --query tenantId -o tsv)"
echo "  - Functions: https://sageinsure-functions.azurewebsites.net"
echo "  - API: https://sageinsure-apim.azure-api.net"
echo "  - Frontend: $(az staticwebapp show --name sageinsure-frontend --resource-group sageinsure-backend-rg --query defaultHostname -o tsv)"