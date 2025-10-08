#!/bin/bash

# SageInsure DocStream Deployment Script

set -e

# Configuration
RESOURCE_GROUP="sageinsure-rg"
LOCATION="eastus"
DEPLOYMENT_NAME="sagedocstream-$(date +%s)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying SageInsure DocStream...${NC}"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not found. Please install it first.${NC}"
    exit 1
fi

# Login check
if ! az account show &> /dev/null; then
    echo -e "${BLUE}🔐 Please login to Azure...${NC}"
    az login
fi

# Deploy infrastructure
echo -e "${BLUE}🏗️ Deploying infrastructure...${NC}"
DEPLOYMENT_OUTPUT=$(az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file infrastructure/main.bicep \
    --name $DEPLOYMENT_NAME \
    --query 'properties.outputs' -o json)

# Extract outputs
STORAGE_ACCOUNT=$(echo $DEPLOYMENT_OUTPUT | jq -r '.storageAccountName.value')
FUNCTION_APP=$(echo $DEPLOYMENT_OUTPUT | jq -r '.functionAppName.value')
WEBSITE_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.staticWebsiteUrl.value')
FUNCTION_URL=$(echo $DEPLOYMENT_OUTPUT | jq -r '.functionAppUrl.value')

echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo -e "${GREEN}📦 Storage Account: $STORAGE_ACCOUNT${NC}"
echo -e "${GREEN}⚡ Function App: $FUNCTION_APP${NC}"

# Enable static website
echo -e "${BLUE}🌐 Enabling static website...${NC}"
az storage blob service-properties update \
    --account-name $STORAGE_ACCOUNT \
    --static-website \
    --index-document index.html

# Copy branding assets
echo -e "${BLUE}🎨 Copying branding assets...${NC}"
cp ../frontend/public/sageinsure_logo.png frontend/ 2>/dev/null || echo "Logo not found, skipping..."

# Update frontend API URL
echo -e "${BLUE}🔧 Updating frontend configuration...${NC}"
sed -i.bak "s|FUNCTION_APP_URL|${FUNCTION_URL}|g" frontend/index.html

# Deploy frontend
echo -e "${BLUE}🌐 Deploying frontend...${NC}"
az storage blob upload-batch \
    --account-name $STORAGE_ACCOUNT \
    --destination '$web' \
    --source frontend/ \
    --overwrite

# Deploy backend functions
echo -e "${BLUE}⚡ Deploying backend functions...${NC}"
cd backend
zip -r ../docstream-functions.zip . -x "*.pyc" "__pycache__/*"
cd ..

az functionapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $FUNCTION_APP \
    --src docstream-functions.zip

# Clean up
rm -f docstream-functions.zip
rm -f frontend/index.html.bak

echo -e "${GREEN}🎉 DocStream deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Website URL: $WEBSITE_URL${NC}"
echo -e "${GREEN}⚡ API URL: $FUNCTION_URL${NC}"
echo -e "${BLUE}💡 DocStream is now ready for FNOL document processing!${NC}"

# Create sample containers
echo -e "${BLUE}📁 Creating document containers...${NC}"
for container in staging processed valid-claims needs-review; do
    az storage container create \
        --name $container \
        --account-name $STORAGE_ACCOUNT \
        --public-access off
done

echo -e "${GREEN}📄 Document processing containers created successfully!${NC}"