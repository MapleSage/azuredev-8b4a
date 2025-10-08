#!/bin/bash
# Deploy RAG API to Azure Container Apps

echo "🚀 Deploying SageInsure RAG API to Azure Container Apps"
echo "======================================================"

# Variables
RESOURCE_GROUP="sageinsure-rg"
LOCATION="eastus"
CONTAINER_APP_ENV="sageinsure-env"
CONTAINER_APP_NAME="sageinsure-rag-api"
ACR_NAME="sageinsureacr$(date +%s | tail -c 6)"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo "   Container App: $CONTAINER_APP_NAME"
echo "   ACR: $ACR_NAME"
echo ""

# Create Container Registry
echo "🏗️  Creating Azure Container Registry..."
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Get ACR login server
ACR_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query "loginServer" --output tsv)
echo "   ACR Server: $ACR_SERVER"

# Build and push Docker image
echo "🐳 Building and pushing Docker image..."
az acr build \
  --registry $ACR_NAME \
  --image sageinsure-rag-api:latest \
  --file Dockerfile.rag \
  .

# Create Container Apps Environment
echo "🌐 Creating Container Apps Environment..."
az containerapp env create \
  --name $CONTAINER_APP_ENV \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Get Azure service credentials
echo "🔑 Getting Azure service credentials..."
OPENAI_KEY=$(az cognitiveservices account keys list --name sageinsure-openai --resource-group $RESOURCE_GROUP --query "key1" --output tsv)
SEARCH_KEY=$(az search admin-key show --service-name sageinsure-search --resource-group $RESOURCE_GROUP --query "primaryKey" --output tsv)

# Deploy Container App
echo "🚀 Deploying Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $CONTAINER_APP_ENV \
  --image $ACR_SERVER/sageinsure-rag-api:latest \
  --target-port 8000 \
  --ingress 'external' \
  --registry-server $ACR_SERVER \
  --env-vars \
    AZURE_OPENAI_KEY="$OPENAI_KEY" \
    AZURE_SEARCH_KEY="$SEARCH_KEY" \
  --cpu 0.5 \
  --memory 1Gi \
  --min-replicas 1 \
  --max-replicas 3

# Get the app URL
APP_URL=$(az containerapp show --name $CONTAINER_APP_NAME --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" --output tsv)

echo ""
echo "✅ Deployment Complete!"
echo "🌐 RAG API URL: https://$APP_URL"
echo "🧪 Health Check: https://$APP_URL/healthz"
echo "💬 Chat Endpoint: https://$APP_URL/chat"
echo ""
echo "📝 Next: Update frontend .env.local with:"
echo "NEXT_PUBLIC_API_URL=https://$APP_URL"