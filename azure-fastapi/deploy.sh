#!/bin/bash

# Azure FastAPI Deployment Script
# Deploys SageInsure Azure FastAPI service to Azure Container Instances

set -e

# Configuration
RESOURCE_GROUP="sageinsure-rg"
LOCATION="eastus"
CONTAINER_NAME="sageinsure-azure-api"
IMAGE_NAME="sageinsure/azure-fastapi"
REGISTRY_NAME="sageinsureregistry"
DNS_NAME="sageinsure-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Azure FastAPI deployment...${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please login first.${NC}"
    az login
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    echo -e "${BLUE}📄 Loading environment variables from .env file...${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠️ No .env file found. Using environment variables.${NC}"
fi

# Validate required environment variables
required_vars=(
    "AZURE_SEARCH_SERVICE"
    "AZURE_SEARCH_KEY"
    "AZURE_OPENAI_ENDPOINT"
    "AZURE_OPENAI_KEY"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Required environment variable $var is not set${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required environment variables are set${NC}"

# Create resource group if it doesn't exist
echo -e "${BLUE}🏗️ Creating resource group...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION --output table

# Create Azure Container Registry if it doesn't exist
echo -e "${BLUE}🏗️ Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $REGISTRY_NAME \
    --sku Basic \
    --admin-enabled true \
    --output table

# Get ACR login server
ACR_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo -e "${GREEN}📦 ACR Login Server: $ACR_LOGIN_SERVER${NC}"

# Build Docker image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build -t $IMAGE_NAME:latest .

# Tag image for ACR
docker tag $IMAGE_NAME:latest $ACR_LOGIN_SERVER/$IMAGE_NAME:latest

# Login to ACR
echo -e "${BLUE}🔐 Logging in to Azure Container Registry...${NC}"
az acr login --name $REGISTRY_NAME

# Push image to ACR
echo -e "${BLUE}📤 Pushing image to Azure Container Registry...${NC}"
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:latest

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --resource-group $RESOURCE_GROUP --query passwords[0].value --output tsv)

# Create Azure Container Instance
echo -e "${BLUE}🚀 Deploying to Azure Container Instances...${NC}"
az container create \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_NAME \
    --image $ACR_LOGIN_SERVER/$IMAGE_NAME:latest \
    --registry-login-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label $DNS_NAME \
    --ports 8000 \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
        AZURE_SEARCH_SERVICE=$AZURE_SEARCH_SERVICE \
        AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT \
        AZURE_OPENAI_DEPLOYMENT=${AZURE_OPENAI_DEPLOYMENT:-gpt-4} \
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT=${AZURE_OPENAI_EMBEDDING_DEPLOYMENT:-text-embedding-ada-002} \
        AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION:-2024-02-15-preview} \
        HOST=0.0.0.0 \
        PORT=8000 \
        WORKERS=1 \
    --secure-environment-variables \
        AZURE_SEARCH_KEY=$AZURE_SEARCH_KEY \
        AZURE_OPENAI_KEY=$AZURE_OPENAI_KEY \
    --output table

# Get the FQDN
FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn --output tsv)

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your API is available at: http://$FQDN:8000${NC}"
echo -e "${GREEN}📊 Health check: http://$FQDN:8000/healthz${NC}"
echo -e "${GREEN}📚 API docs: http://$FQDN:8000/docs${NC}"

# Test the deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"
sleep 30  # Wait for container to start

if curl -f -s "http://$FQDN:8000/healthz" > /dev/null; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${YELLOW}⚠️ Health check failed. Container might still be starting.${NC}"
fi

# Show container logs
echo -e "${BLUE}📋 Recent container logs:${NC}"
az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --tail 20

echo -e "${GREEN}🎉 Deployment script completed!${NC}"
echo -e "${BLUE}💡 To update your frontend, set AZURE_FASTAPI_URL=http://$FQDN:8000${NC}"