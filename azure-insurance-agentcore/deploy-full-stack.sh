#!/bin/bash

# Deploy complete Azure insurance stack with frontend
echo "🚀 Deploying Full Azure Insurance Stack..."

# Deploy Static Web App for frontend
az staticwebapp create \
  --name sageinsure-frontend \
  --resource-group sageinsure-rg \
  --source https://github.com/your-repo/frontend \
  --location eastus2 \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "out"

# Get Static Web App URL
FRONTEND_URL=$(az staticwebapp show --name sageinsure-frontend --resource-group sageinsure-rg --query defaultHostname -o tsv)

echo "✅ Full Stack Deployed!"
echo "🌐 Frontend: https://$FRONTEND_URL"
echo "🔗 Agent Core: https://sageinsure-agent.greenforest-00f97c58.eastus.azurecontainerapps.io"