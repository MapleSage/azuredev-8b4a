#!/bin/bash

# Deploy MSAL fix to Azure Static Web Apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying MSAL fix to Azure Static Web Apps...${NC}"

# Configuration
STATIC_WEB_APP_NAME="sageinsure-clean"
RESOURCE_GROUP="rg-sageinsure-multi-agent-prod"

# Check if we're in the right directory
if [ ! -f "frontend/lib/msal-config.ts" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Get deployment token
echo -e "${BLUE}🔑 Getting deployment token...${NC}"
DEPLOYMENT_TOKEN=$(az staticwebapp secrets list --name $STATIC_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query properties.apiKey -o tsv)

if [ -z "$DEPLOYMENT_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get deployment token${NC}"
    exit 1
fi

# Build the frontend
echo -e "${BLUE}🏗️ Building frontend...${NC}"
cd frontend
npm install
npm run build

# Deploy using Azure Static Web Apps CLI
echo -e "${BLUE}📦 Deploying to Azure Static Web Apps...${NC}"

# Check if SWA CLI is installed
if ! command -v swa &> /dev/null; then
    echo -e "${YELLOW}⚠️ Azure Static Web Apps CLI not found. Installing...${NC}"
    npm install -g @azure/static-web-apps-cli
fi

# Deploy the built application
swa deploy ./out --deployment-token $DEPLOYMENT_TOKEN --env production

cd ..

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌐 Your app is available at: https://calm-pond-0b4024e0f-preview.eastus2.1.azurestaticapps.net${NC}"
echo -e "${YELLOW}📝 Test the authentication fix by visiting the deployed URL${NC}"