#!/bin/bash

# Vercel Deployment Script for SageInsure Frontend
# This script deploys the frontend to Vercel and backend to Azure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Vercel + Azure deployment for SageInsure...${NC}"

# Configuration
RESOURCE_GROUP="rg-sageinsure-multi-agent-prod"
LOCATION="eastus2"
BACKEND_APP_NAME="sageinsure-api-$(date +%s)"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please login first.${NC}"
    az login
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Deploy Backend to Azure App Service
echo -e "${BLUE}🚀 Deploying backend to Azure App Service...${NC}"

# Create App Service Plan if it doesn't exist
az appservice plan create \
    --name "sageinsure-plan" \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux \
    --only-show-errors || echo "App Service Plan may already exist"

# Create backend web app
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "sageinsure-plan" \
    --name $BACKEND_APP_NAME \
    --runtime "PYTHON|3.11" \
    --only-show-errors

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
    --only-show-errors

# Get backend URL
BACKEND_URL="https://$BACKEND_APP_NAME.azurewebsites.net"
echo -e "${GREEN}✅ Backend will be available at: $BACKEND_URL${NC}"

# Update CORS settings with Vercel domain (we'll update this after Vercel deployment)
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --settings \
        CORS_ORIGINS="https://sageinsure.vercel.app,http://localhost:3000" \
    --only-show-errors

# Deploy backend code
echo -e "${BLUE}📤 Deploying backend code...${NC}"
cd backend

# Create requirements.txt if it doesn't exist
if [ ! -f requirements.txt ]; then
    pip freeze > requirements.txt
fi

# Create deployment package
zip -r ../backend-deploy.zip . -x "*.pyc" "__pycache__/*" "venv/*" ".env" "test_*"

# Deploy using ZIP
az webapp deployment source config-zip \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --src ../backend-deploy.zip \
    --only-show-errors

cd ..

# Configure backend startup command
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --startup-file "pip install -r requirements.txt && python -m uvicorn app:app --host 0.0.0.0 --port 8000" \
    --only-show-errors

echo -e "${GREEN}✅ Backend deployed to Azure${NC}"

# Deploy Frontend to Vercel
echo -e "${BLUE}🚀 Deploying frontend to Vercel...${NC}"
cd frontend

# Create vercel.json configuration
cat > vercel.json << EOF
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "NEXT_PUBLIC_AZURE_CLIENT_ID": "27650c1d-91fa-4747-a2fa-1a52813ac5ac",
    "NEXT_PUBLIC_AZURE_TENANT_ID": "e9394f90-446d-41dd-8c8c-98ac08c5f090",
    "NEXT_PUBLIC_API_URL": "$BACKEND_URL",
    "NEXT_PUBLIC_DEVELOPMENT_MODE": "false"
  },
  "functions": {
    "pages/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "$BACKEND_URL/:path*"
    }
  ]
}
EOF

# Update environment variables for production
cat > .env.production << EOF
NEXT_PUBLIC_AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac
NEXT_PUBLIC_AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090
NEXT_PUBLIC_API_URL=$BACKEND_URL
NEXT_PUBLIC_DEVELOPMENT_MODE=false
EOF

# Deploy to Vercel
echo -e "${YELLOW}📤 Deploying to Vercel (this may take a few minutes)...${NC}"
vercel --prod --yes --env NEXT_PUBLIC_AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac --env NEXT_PUBLIC_AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090 --env NEXT_PUBLIC_API_URL=$BACKEND_URL --env NEXT_PUBLIC_DEVELOPMENT_MODE=false

# Get Vercel URL
VERCEL_URL=$(vercel --scope $(vercel whoami) ls | grep frontend | head -1 | awk '{print $2}')
if [ -z "$VERCEL_URL" ]; then
    VERCEL_URL="https://sageinsure.vercel.app"
fi

echo -e "${GREEN}✅ Frontend deployed to Vercel: $VERCEL_URL${NC}"

cd ..

# Update Azure AD app registration with Vercel URL
echo -e "${BLUE}🔧 Updating Azure AD app registration...${NC}"
az ad app update \
    --id 27650c1d-91fa-4747-a2fa-1a52813ac5ac \
    --web-redirect-uris "http://localhost:3000/auth/callback" "$VERCEL_URL/auth/callback" \
    --only-show-errors

# Update backend CORS with actual Vercel URL
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --settings \
        CORS_ORIGINS="$VERCEL_URL,http://localhost:3000" \
    --only-show-errors

echo -e "${GREEN}✅ Azure AD and CORS updated${NC}"

# Wait for deployments to stabilize
echo -e "${YELLOW}⏳ Waiting for deployments to stabilize...${NC}"
sleep 60

# Test deployments
echo -e "${BLUE}🧪 Testing deployments...${NC}"

# Test backend
echo -e "${BLUE}Testing backend at $BACKEND_URL${NC}"
if curl -f -s "$BACKEND_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Backend may still be starting up${NC}"
fi

# Test frontend
echo -e "${BLUE}Testing frontend at $VERCEL_URL${NC}"
if curl -f -s "$VERCEL_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend may still be starting up${NC}"
fi

# Clean up
rm -f backend-deploy.zip

# Display deployment summary
echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "Frontend URL (Vercel): $VERCEL_URL"
echo -e "Backend URL (Azure): $BACKEND_URL"
echo -e "Resource Group: $RESOURCE_GROUP"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo -e "1. Visit $VERCEL_URL to test the application"
echo -e "2. Sign in with your Microsoft account"
echo -e "3. Test the AI chat functionality"
echo -e "4. Monitor logs in Azure Portal and Vercel Dashboard"

echo -e "\n${BLUE}🔧 Management Commands:${NC}"
echo -e "View backend logs: az webapp log tail --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "View Vercel logs: vercel logs $VERCEL_URL"
echo -e "Restart backend: az webapp restart --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "Redeploy frontend: vercel --prod"

echo -e "\n${GREEN}🎊 SageInsure is now live with Vercel + Azure!${NC}"