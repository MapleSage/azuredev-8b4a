#!/bin/bash

# Azure AD App Registration Setup Script for SageInsure MSAL Integration
# This script creates the Azure AD app registration and configures permissions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Azure AD App Registration for SageInsure...${NC}"

# Configuration
APP_NAME="SageInsure-MSAL-App"
RESOURCE_GROUP="rg-maplesage-openai-project"
TENANT_ID=$(az account show --query tenantId --output tsv)

echo -e "${BLUE}📋 Using Tenant ID: $TENANT_ID${NC}"

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}⚠️ Not logged in to Azure. Please login first.${NC}"
    az login
fi

# Create Azure AD App Registration
echo -e "${BLUE}🏗️ Creating Azure AD App Registration...${NC}"

# Create the app registration
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --sign-in-audience "AzureADMyOrg" \
    --web-redirect-uris "http://localhost:3000/auth/callback" "https://sageinsure.com/auth/callback" \
    --web-home-page-url "http://localhost:3000" \
    --query appId \
    --output tsv)

echo -e "${GREEN}✅ App Registration created with ID: $APP_ID${NC}"

# Configure API permissions
echo -e "${BLUE}🔐 Configuring API permissions...${NC}"

# Add Microsoft Graph permissions
az ad app permission add \
    --id $APP_ID \
    --api 00000003-0000-0000-c000-000000000000 \
    --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Grant admin consent (requires admin privileges)
echo -e "${YELLOW}⚠️ Granting admin consent (requires admin privileges)...${NC}"
az ad app permission admin-consent --id $APP_ID || echo -e "${YELLOW}⚠️ Admin consent failed. Please grant manually in Azure Portal.${NC}"

# Create service principal
echo -e "${BLUE}👤 Creating service principal...${NC}"
SP_ID=$(az ad sp create --id $APP_ID --query id --output tsv)

# Create client secret
echo -e "${BLUE}🔑 Creating client secret...${NC}"
CLIENT_SECRET=$(az ad app credential reset \
    --id $APP_ID \
    --display-name "SageInsure-Secret" \
    --years 2 \
    --query password \
    --output tsv)

# Output configuration
echo -e "${GREEN}🎉 Azure AD App Registration completed!${NC}"
echo -e "${BLUE}📋 Configuration Details:${NC}"
echo -e "Tenant ID: $TENANT_ID"
echo -e "Client ID: $APP_ID"
echo -e "Client Secret: $CLIENT_SECRET"
echo -e "Authority: https://login.microsoftonline.com/$TENANT_ID"

# Create environment files
echo -e "${BLUE}📄 Creating environment configuration files...${NC}"

# Development environment
cat > .env.development << EOF
# Azure AD Configuration for Development
NEXT_PUBLIC_AZURE_CLIENT_ID=$APP_ID
NEXT_PUBLIC_AZURE_TENANT_ID=$TENANT_ID
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEVELOPMENT_MODE=false

# Backend Configuration
AZURE_TENANT_ID=$TENANT_ID
AZURE_CLIENT_ID=$APP_ID
AZURE_CLIENT_SECRET=$CLIENT_SECRET
AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/
ENVIRONMENT=development
EOF

# Production environment template
cat > .env.production.template << EOF
# Azure AD Configuration for Production
NEXT_PUBLIC_AZURE_CLIENT_ID=$APP_ID
NEXT_PUBLIC_AZURE_TENANT_ID=$TENANT_ID
NEXT_PUBLIC_REDIRECT_URI=https://your-domain.com/auth/callback
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NEXT_PUBLIC_DEVELOPMENT_MODE=false

# Backend Configuration (Use Kubernetes secrets in production)
AZURE_TENANT_ID=$TENANT_ID
AZURE_CLIENT_ID=$APP_ID
AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/
ENVIRONMENT=production
EOF

echo -e "${GREEN}✅ Environment files created:${NC}"
echo -e "  - .env.development"
echo -e "  - .env.production.template"

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "1. Copy .env.development to frontend/.env.local"
echo -e "2. Copy .env.development to backend/.env"
echo -e "3. Update redirect URIs in Azure Portal for your production domain"
echo -e "4. Store client secret in Azure Key Vault for production use"

echo -e "${GREEN}🎉 Azure AD setup completed successfully!${NC}"