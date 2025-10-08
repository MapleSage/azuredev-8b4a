#!/bin/bash

echo "🔧 Fixing Failed Azure Components..."

# 1. Fix Azure AD App (use portal method)
echo "1️⃣ Creating Azure AD App via portal method..."
az ad app create \
  --display-name "SageInsure-Backend" \
  --web-redirect-uris "https://gentle-sand-0f68e870f.2.azurestaticapps.net/auth/callback" \
  --enable-id-token-issuance true \
  --enable-access-token-issuance true

# 2. Fix Function App (use Linux)
echo "2️⃣ Recreating Function App with Linux..."
az functionapp delete --name sageinsure-functions --resource-group sageinsure-backend-rg --yes

az functionapp create \
  --resource-group sageinsure-backend-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name sageinsure-functions-linux \
  --storage-account sageinsurestorage2 \
  --os-type Linux

# 3. Fix Cosmos DB (use different region)
echo "3️⃣ Recreating Cosmos DB in West US..."
az cosmosdb delete --name sageinsure-cosmos --resource-group sageinsure-backend-rg --yes

az cosmosdb create \
  --name sageinsure-cosmos-west \
  --resource-group sageinsure-backend-rg \
  --locations regionName=westus \
  --default-consistency-level Session \
  --enable-free-tier true

az cosmosdb sql database create \
  --account-name sageinsure-cosmos-west \
  --resource-group sageinsure-backend-rg \
  --name sageinsure

echo "✅ All components fixed!"
echo "🔗 Updated endpoints:"
echo "  - Functions: https://sageinsure-functions-linux.azurewebsites.net"
echo "  - Cosmos: sageinsure-cosmos-west"