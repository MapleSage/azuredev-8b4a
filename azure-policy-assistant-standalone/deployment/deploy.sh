#!/bin/bash

# Azure Policy Assistant Deployment Script
RG_NAME="rg-sageinsure-policy-assistant"
LOCATION="eastus"
DEPLOYMENT_NAME="policy-assistant-$(date +%s)"

echo "🚀 Deploying SageInsure Policy Assistant..."

# Create resource group
echo "📦 Creating resource group..."
az group create --name $RG_NAME --location $LOCATION

# Deploy infrastructure
echo "🏗️ Deploying infrastructure..."
az deployment group create \
  --resource-group $RG_NAME \
  --template-file ../infrastructure/main.bicep \
  --parameters namePrefix=sageinsure-policy \
  --name $DEPLOYMENT_NAME

# Get container registry details
ACR_NAME=$(az acr list -g $RG_NAME --query "[0].name" -o tsv)
ACR_LOGIN_SERVER=$(az acr list -g $RG_NAME --query "[0].loginServer" -o tsv)

echo "🐳 Building and pushing container image..."

# Build and push container image
cd ../frontend
az acr build --registry $ACR_NAME --image policy-assistant:latest .

# Get deployment outputs
POLICY_ASSISTANT_URL=$(az deployment group show \
  --resource-group $RG_NAME \
  --name $DEPLOYMENT_NAME \
  --query "properties.outputs.policyAssistantUrl.value" -o tsv)

APP_GATEWAY_IP=$(az deployment group show \
  --resource-group $RG_NAME \
  --name $DEPLOYMENT_NAME \
  --query "properties.outputs.applicationGatewayIP.value" -o tsv)

echo "✅ Deployment complete!"
echo ""
echo "🌐 Policy Assistant URL: $POLICY_ASSISTANT_URL"
echo "🔗 Application Gateway IP: $APP_GATEWAY_IP"
echo "📦 Container Registry: $ACR_LOGIN_SERVER"
echo ""
echo "🛡️ SageInsure Policy Assistant is now live!"
echo "   - Powered by Azure OpenAI GPT-4"
echo "   - Azure Cognitive Search knowledge base"
echo "   - Azure Container Apps (serverless)"
echo "   - Application Gateway (load balancer)"
echo "   - Azure CDN (global distribution)"
echo "   - Cosmos DB (session storage)"