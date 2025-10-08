#!/bin/bash

# Azure Insurance Backend Deployment Script
set -e

echo "🚀 Deploying Azure Insurance Backend..."

# Configuration
RESOURCE_GROUP="rg-sagegpt-mae-dev"
CONTAINER_APP_NAME="sageinsure-backend"
CONTAINER_REGISTRY="sageinsureacr1758906383"
IMAGE_NAME="sageinsure-backend"
IMAGE_TAG="latest"

# Build and push Docker image
echo "📦 Building Docker image..."
docker build -t ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG} .

echo "🔐 Logging into Azure Container Registry..."
az acr login --name ${CONTAINER_REGISTRY}

echo "📤 Pushing image to registry..."
docker push ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

# Update Container App
echo "🔄 Updating Container App..."
az containerapp update \
  --name ${CONTAINER_APP_NAME} \
  --resource-group ${RESOURCE_GROUP} \
  --image ${CONTAINER_REGISTRY}.azurecr.io/${IMAGE_NAME}:${IMAGE_TAG}

echo "✅ Deployment completed!"
echo "🌐 Backend URL: https://${CONTAINER_APP_NAME}.livelyforest-2e320588.eastus2.azurecontainerapps.io"

# Test the deployment
echo "🧪 Testing deployment..."
sleep 10
curl -f "https://${CONTAINER_APP_NAME}.livelyforest-2e320588.eastus2.azurecontainerapps.io/health" || echo "❌ Health check failed"
curl -f "https://${CONTAINER_APP_NAME}.livelyforest-2e320588.eastus2.azurecontainerapps.io/" || echo "❌ Root endpoint failed"