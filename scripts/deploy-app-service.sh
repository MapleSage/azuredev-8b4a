#!/bin/bash

# Azure App Service Deployment Script for SageInsure
# This script deploys to Azure App Service without requiring Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Azure App Service deployment for SageInsure...${NC}"

# Configuration
RESOURCE_GROUP="rg-maplesage-openai-project"
LOCATION="eastus2"
BACKEND_APP_NAME="sageinsure-api-$(date +%s)"
FRONTEND_APP_NAME="sageinsure-app-$(date +%s)"
APP_SERVICE_PLAN="sageinsure-plan"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please login first.${NC}"
    az login
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create App Service Plan
echo -e "${BLUE}📋 Creating App Service Plan...${NC}"
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux

echo -e "${GREEN}✅ App Service Plan created${NC}"

# Deploy Backend
echo -e "${BLUE}🚀 Creating backend App Service...${NC}"

az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $BACKEND_APP_NAME \
    --runtime "PYTHON|3.11" \
    --deployment-local-git

# Configure backend app settings
echo -e "${BLUE}⚙️ Configuring backend app settings...${NC}"
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --settings \
        ENVIRONMENT=production \
        AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090 \
        AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac \
        AZURE_CLIENT_SECRET=2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ \
        AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/ \
        AZURE_OPENAI_ENDPOINT=https://parvinddutta-9607_ai.openai.azure.com/ \
        AZURE_OPENAI_API_KEY=172068a0b5a348efa948c8339cca0329 \
        AZURE_OPENAI_DEPLOYMENT=gpt-4o \
        AZURE_OPENAI_API_VERSION=2024-02-15-preview \
        PORT=8000 \
        CORS_ORIGINS="https://$FRONTEND_APP_NAME.azurewebsites.net,http://localhost:3000"

# Get backend URL
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo -e "${GREEN}✅ Backend app created: $BACKEND_URL${NC}"

# Deploy Frontend
echo -e "${BLUE}🚀 Creating frontend App Service...${NC}"

az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --name $FRONTEND_APP_NAME \
    --runtime "NODE|18-lts" \
    --deployment-local-git

# Configure frontend app settings
echo -e "${BLUE}⚙️ Configuring frontend app settings...${NC}"
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP_NAME \
    --settings \
        NODE_ENV=production \
        NEXT_PUBLIC_AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac \
        NEXT_PUBLIC_AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090 \
        NEXT_PUBLIC_REDIRECT_URI=https://$FRONTEND_APP_NAME.azurewebsites.net/auth/callback \
        NEXT_PUBLIC_API_URL=$BACKEND_URL \
        NEXT_PUBLIC_DEVELOPMENT_MODE=false

# Get frontend URL
FRONTEND_URL="https://$FRONTEND_APP_NAME.azurewebsites.net"
echo -e "${GREEN}✅ Frontend app created: $FRONTEND_URL${NC}"

# Update Azure AD app registration with new redirect URI
echo -e "${BLUE}🔧 Updating Azure AD app registration...${NC}"
az ad app update \
    --id 27650c1d-91fa-4747-a2fa-1a52813ac5ac \
    --web-redirect-uris "http://localhost:3000/auth/callback" "$FRONTEND_URL/auth/callback"

echo -e "${GREEN}✅ Azure AD app registration updated${NC}"

# Deploy backend code
echo -e "${BLUE}📤 Deploying backend code...${NC}"
cd backend

# Create deployment package
zip -r ../backend-deploy.zip . -x "*.pyc" "__pycache__/*" "venv/*" ".env"

# Deploy using ZIP
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --src ../backend-deploy.zip

cd ..

# Deploy frontend code
echo -e "${BLUE}📤 Deploying frontend code...${NC}"
cd frontend

# Create production build
npm run build

# Create deployment package
zip -r ../frontend-deploy.zip . -x "node_modules/*" ".next/cache/*" ".env*"

# Deploy using ZIP
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP_NAME \
    --src ../frontend-deploy.zip

cd ..

# Configure startup commands
echo -e "${BLUE}⚙️ Configuring startup commands...${NC}"

# Backend startup command
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --startup-file "pip install -r requirements.txt && python -m uvicorn app:app --host 0.0.0.0 --port 8000"

# Frontend startup command
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP_NAME \
    --startup-file "npm install && npm run build && npm start"

# Wait for deployments to complete
echo -e "${YELLOW}⏳ Waiting for deployments to complete...${NC}"
sleep 120

# Test deployments
echo -e "${BLUE}🧪 Testing deployments...${NC}"

# Test backend
echo -e "${BLUE}Testing backend at $BACKEND_URL${NC}"
if curl -f -s "$BACKEND_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Backend health check failed - checking logs...${NC}"
    az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME --provider application &
    sleep 10
    kill $! 2>/dev/null || true
fi

# Test frontend
echo -e "${BLUE}Testing frontend at $FRONTEND_URL${NC}"
if curl -f -s "$FRONTEND_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend health check failed - checking logs...${NC}"
    az webapp log tail --resource-group $RESOURCE_GROUP --name $FRONTEND_APP_NAME --provider application &
    sleep 10
    kill $! 2>/dev/null || true
fi

# Clean up deployment files
rm -f backend-deploy.zip frontend-deploy.zip

# Display deployment summary
echo -e "\n${GREEN}🎉 Deployment completed!${NC}"
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "Frontend URL: $FRONTEND_URL"
echo -e "Backend URL: $BACKEND_URL"
echo -e "Resource Group: $RESOURCE_GROUP"
echo -e "App Service Plan: $APP_SERVICE_PLAN"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo -e "1. Visit $FRONTEND_URL to test the application"
echo -e "2. Sign in with your Microsoft account"
echo -e "3. Test the AI chat functionality"
echo -e "4. Monitor application logs in Azure Portal"

echo -e "\n${BLUE}🔧 Management Commands:${NC}"
echo -e "View backend logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "View frontend logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $FRONTEND_APP_NAME"
echo -e "Restart backend: az webapp restart --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "Restart frontend: az webapp restart --resource-group $RESOURCE_GROUP --name $FRONTEND_APP_NAME"

echo -e "\n${GREEN}🎊 SageInsure is now live on Azure App Service!${NC}"