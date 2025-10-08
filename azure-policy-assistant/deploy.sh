#!/bin/bash

# Azure Policy Assistant Deployment Script
RG_NAME="rg-sageinsure-policy"
LOCATION="eastus"
APP_NAME="sageinsure-policy-$(date +%s)"

echo "🚀 Deploying Azure Policy Assistant..."

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Deploy infrastructure
echo "📦 Deploying infrastructure..."
az deployment group create \
  --resource-group $RG_NAME \
  --template-file infrastructure/main.bicep \
  --parameters namePrefix=$APP_NAME

# Get storage account name
STORAGE_NAME=$(az storage account list -g $RG_NAME --query "[0].name" -o tsv)

# Create static web app
echo "🌐 Creating static web app..."
az staticwebapp create \
  --name "${APP_NAME}-web" \
  --resource-group $RG_NAME \
  --source frontend/ \
  --location $LOCATION \
  --sku Free

# Get URLs
FUNC_URL=$(az functionapp show -g $RG_NAME -n "${APP_NAME}-func" --query "defaultHostName" -o tsv)
WEB_URL=$(az staticwebapp show -g $RG_NAME -n "${APP_NAME}-web" --query "defaultHostname" -o tsv)

echo "✅ Deployment complete!"
echo "📱 Web App: https://$WEB_URL"
echo "⚡ Function App: https://$FUNC_URL"
echo "💾 Storage: $STORAGE_NAME"