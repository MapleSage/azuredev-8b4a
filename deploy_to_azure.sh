#!/bin/bash

# Azure Insurance Chat API Deployment Script
# This script deploys the FastAPI backend to Azure App Service

set -e

# Configuration
RESOURCE_GROUP="your-resource-group"
APP_SERVICE_NAME="your-app-service-name"
LOCATION="East US"

echo "🚀 Deploying Azure Insurance Chat API to Azure App Service..."

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "🔐 Please log in to Azure first:"
    az login
fi

echo "📋 Current Azure subscription:"
az account show --query "name" -o tsv

# Create resource group if it doesn't exist
echo "🏗️  Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
az group create --name $RESOURCE_GROUP --location $LOCATION --output none

# Create App Service plan (Free tier for demo)
echo "📱 Creating App Service plan..."
az appservice plan create \
    --name "${APP_SERVICE_NAME}-plan" \
    --resource-group $RESOURCE_GROUP \
    --sku F1 \
    --is-linux \
    --output none

# Create App Service
echo "🌐 Creating App Service '$APP_SERVICE_NAME'..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${APP_SERVICE_NAME}-plan" \
    --name $APP_SERVICE_NAME \
    --runtime "PYTHON:3.11" \
    --deployment-local-git \
    --output none

# Configure startup command
echo "⚙️  Configuring startup command..."
az webapp config set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_SERVICE_NAME \
    --startup-file "python start_api.py" \
    --output none

# Set environment variables (you'll need to update these with your actual values)
echo "🔧 Setting environment variables..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $APP_SERVICE_NAME \
    --settings \
        AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com/" \
        AZURE_OPENAI_API_KEY="your_openai_api_key_here" \
        AZURE_OPENAI_DEPLOYMENT="gpt-4" \
        AZURE_SEARCH_ENDPOINT="https://your-search-service.search.windows.net" \
        AZURE_SEARCH_KEY="your_search_api_key_here" \
        AZURE_SEARCH_INDEX="policy-index" \
        AZURE_STORAGE_ACCOUNT="yourstorageaccount" \
        STORAGE_ACCOUNT_KEY="your_storage_account_key_here" \
        POLICY_DOCS_CONTAINER="policy-docs" \
        API_HOST="0.0.0.0" \
        API_PORT="8000" \
        DEBUG="false" \
    --output none

# Enable logging
echo "📝 Enabling application logging..."
az webapp log config \
    --resource-group $RESOURCE_GROUP \
    --name $APP_SERVICE_NAME \
    --web-server-logging filesystem \
    --output none

# Get the deployment URL
DEPLOYMENT_URL=$(az webapp deployment source config-local-git \
    --resource-group $RESOURCE_GROUP \
    --name $APP_SERVICE_NAME \
    --query url \
    --output tsv)

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🌐 App Service URL: https://$APP_SERVICE_NAME.azurewebsites.net"
echo "📚 API Documentation: https://$APP_SERVICE_NAME.azurewebsites.net/docs"
echo "💚 Health Check: https://$APP_SERVICE_NAME.azurewebsites.net/healthz"
echo ""
echo "📋 Next steps:"
echo "1. Update the environment variables above with your actual Azure service values"
echo "2. Deploy your code using Git:"
echo "   git remote add azure $DEPLOYMENT_URL"
echo "   git push azure main"
echo ""
echo "3. Test the API endpoints"
echo "4. Update your frontend to point to this backend URL"
echo ""
echo "🔍 Monitor your app:"
echo "   az webapp log tail --resource-group $RESOURCE_GROUP --name $APP_SERVICE_NAME"

