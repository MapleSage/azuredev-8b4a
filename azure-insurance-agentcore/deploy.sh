#!/bin/bash

# Azure Insurance Agent Deployment Script
RESOURCE_GROUP="sageinsure-rg"
LOCATION="eastus"
DEPLOYMENT_NAME="sageinsure-deployment"

echo "🚀 Deploying Azure Insurance Agent..."

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Deploy infrastructure
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file deploy.bicep \
  --name $DEPLOYMENT_NAME

# Get deployment outputs
AGENT_URL=$(az deployment group show \
  --resource-group $RESOURCE_GROUP \
  --name $DEPLOYMENT_NAME \
  --query properties.outputs.agentUrl.value -o tsv)

echo "✅ Deployment complete!"
echo "🔗 Agent URL: https://$AGENT_URL"

# Test the agent
echo "🧪 Testing agent..."
curl -X POST https://$AGENT_URL/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What does my auto insurance cover?"}'