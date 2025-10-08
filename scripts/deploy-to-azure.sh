#!/bin/bash

# Complete Azure Deployment Script for SageInsure with MSAL Authentication
# This script deploys both frontend and backend to Azure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting complete Azure deployment for SageInsure...${NC}"

# Configuration
RESOURCE_GROUP="rg-maplesage-openai-project"
LOCATION="eastus2"
BACKEND_APP_NAME="sageinsure-api-$(date +%s)"
FRONTEND_APP_NAME="sageinsure-app-$(date +%s)"
ACR_NAME="sageinsureregistry$(date +%s | tail -c 6)"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please login first.${NC}"
    az login
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Create Azure Container Registry
echo -e "${BLUE}📦 Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $ACR_NAME \
    --sku Basic \
    --admin-enabled true \
    --location $LOCATION

ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer --output tsv)
echo -e "${GREEN}✅ ACR created: $ACR_LOGIN_SERVER${NC}"

# Login to ACR
echo -e "${BLUE}🔐 Logging in to Azure Container Registry...${NC}"
az acr login --name $ACR_NAME

# Build and push backend image
echo -e "${BLUE}🔨 Building backend Docker image...${NC}"
cd backend

# Create Dockerfile for backend if it doesn't exist
if [ ! -f Dockerfile ]; then
    cat > Dockerfile << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
EOF
fi

docker build -t $ACR_LOGIN_SERVER/sageinsure-backend:latest .
docker push $ACR_LOGIN_SERVER/sageinsure-backend:latest

cd ..

# Build and push frontend image
echo -e "${BLUE}🔨 Building frontend Docker image...${NC}"
cd frontend

# Create Dockerfile for frontend if it doesn't exist
if [ ! -f Dockerfile ]; then
    cat > Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Run the application
CMD ["node", "server.js"]
EOF
fi

# Update next.config.js for standalone build
if [ ! -f next.config.js ]; then
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
}

module.exports = nextConfig
EOF
fi

docker build -t $ACR_LOGIN_SERVER/sageinsure-frontend:latest .
docker push $ACR_LOGIN_SERVER/sageinsure-frontend:latest

cd ..

# Deploy backend to Azure Container Instances
echo -e "${BLUE}🚀 Deploying backend to Azure Container Instances...${NC}"

# Get ACR credentials
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query username --output tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query passwords[0].value --output tsv)

az container create \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --image $ACR_LOGIN_SERVER/sageinsure-backend:latest \
    --registry-login-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label $BACKEND_APP_NAME \
    --ports 8000 \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
        ENVIRONMENT=production \
        PORT=8000 \
        AZURE_OPENAI_DEPLOYMENT=gpt-4o \
        AZURE_OPENAI_API_VERSION=2024-02-15-preview \
    --secure-environment-variables \
        AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090 \
        AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac \
        AZURE_CLIENT_SECRET=2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ \
        AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/ \
        AZURE_OPENAI_ENDPOINT=https://parvinddutta-9607_ai.openai.azure.com/ \
        AZURE_OPENAI_API_KEY=172068a0b5a348efa948c8339cca0329 \
        CORS_ORIGINS="https://$FRONTEND_APP_NAME.eastus2.azurecontainer.io,http://localhost:3000"

# Get backend URL
BACKEND_URL="https://$BACKEND_APP_NAME.eastus2.azurecontainer.io"
echo -e "${GREEN}✅ Backend deployed: $BACKEND_URL${NC}"

# Deploy frontend to Azure Container Instances
echo -e "${BLUE}🚀 Deploying frontend to Azure Container Instances...${NC}"

az container create \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP_NAME \
    --image $ACR_LOGIN_SERVER/sageinsure-frontend:latest \
    --registry-login-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label $FRONTEND_APP_NAME \
    --ports 3000 \
    --cpu 1 \
    --memory 2 \
    --environment-variables \
        NODE_ENV=production \
        NEXT_PUBLIC_AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac \
        NEXT_PUBLIC_AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090 \
        NEXT_PUBLIC_REDIRECT_URI=https://$FRONTEND_APP_NAME.eastus2.azurecontainer.io/auth/callback \
        NEXT_PUBLIC_API_URL=$BACKEND_URL \
        NEXT_PUBLIC_DEVELOPMENT_MODE=false

# Get frontend URL
FRONTEND_URL="https://$FRONTEND_APP_NAME.eastus2.azurecontainer.io"
echo -e "${GREEN}✅ Frontend deployed: $FRONTEND_URL${NC}"

# Update Azure AD app registration with new redirect URI
echo -e "${BLUE}🔧 Updating Azure AD app registration...${NC}"
az ad app update \
    --id 27650c1d-91fa-4747-a2fa-1a52813ac5ac \
    --web-redirect-uris "http://localhost:3000/auth/callback" "$FRONTEND_URL/auth/callback"

echo -e "${GREEN}✅ Azure AD app registration updated${NC}"

# Test deployments
echo -e "${BLUE}🧪 Testing deployments...${NC}"

echo -e "${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 60

# Test backend
if curl -f -s "$BACKEND_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Backend health check failed - container might still be starting${NC}"
fi

# Test frontend
if curl -f -s "$FRONTEND_URL/" > /dev/null; then
    echo -e "${GREEN}✅ Frontend health check passed${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend health check failed - container might still be starting${NC}"
fi

# Display deployment summary
echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📋 Deployment Summary:${NC}"
echo -e "Frontend URL: $FRONTEND_URL"
echo -e "Backend URL: $BACKEND_URL"
echo -e "Resource Group: $RESOURCE_GROUP"
echo -e "Container Registry: $ACR_LOGIN_SERVER"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo -e "1. Visit $FRONTEND_URL to test the application"
echo -e "2. Sign in with your Microsoft account"
echo -e "3. Test the AI chat functionality"
echo -e "4. Monitor container logs in Azure Portal"

echo -e "\n${BLUE}🔧 Management Commands:${NC}"
echo -e "View backend logs: az container logs --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "View frontend logs: az container logs --resource-group $RESOURCE_GROUP --name $FRONTEND_APP_NAME"
echo -e "Restart backend: az container restart --resource-group $RESOURCE_GROUP --name $BACKEND_APP_NAME"
echo -e "Restart frontend: az container restart --resource-group $RESOURCE_GROUP --name $FRONTEND_APP_NAME"

echo -e "\n${GREEN}🎊 SageInsure is now live on Azure!${NC}"