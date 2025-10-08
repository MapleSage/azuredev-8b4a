#!/bin/bash

# Azure Key Vault Access Setup Script
# This script configures Key Vault access for MSAL authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up Azure Key Vault access for MSAL...${NC}"

# Configuration
KEY_VAULT_NAME="kv-sageretailjssso"
RESOURCE_GROUP="rg-maplesage-openai-project"
CLIENT_SECRET="2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ"

# Get current user
CURRENT_USER=$(az account show --query user.name --output tsv)
echo -e "${BLUE}📋 Current user: $CURRENT_USER${NC}"

# Grant Key Vault access to current user
echo -e "${BLUE}🔑 Granting Key Vault Secrets Officer role to current user...${NC}"
az role assignment create \
    --role "Key Vault Secrets Officer" \
    --assignee $CURRENT_USER \
    --scope "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" \
    || echo -e "${YELLOW}⚠️ Role assignment may already exist or require admin privileges${NC}"

# Wait for role propagation
echo -e "${YELLOW}⏳ Waiting 30 seconds for role propagation...${NC}"
sleep 30

# Store secrets in Key Vault
echo -e "${BLUE}💾 Storing MSAL client secret in Key Vault...${NC}"
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "azure-client-secret" \
    --value "$CLIENT_SECRET" \
    || echo -e "${RED}❌ Failed to store client secret. Please add manually.${NC}"

# Store other Azure AI secrets if they don't exist
echo -e "${BLUE}💾 Storing Azure AI secrets in Key Vault...${NC}"

# Azure OpenAI Key
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "azure-openai-key" \
    --value "172068a0b5a348efa948c8339cca0329" \
    || echo -e "${YELLOW}⚠️ OpenAI key may already exist${NC}"

# Azure OpenAI Endpoint
az keyvault secret set \
    --vault-name $KEY_VAULT_NAME \
    --name "azure-openai-endpoint" \
    --value "https://parvinddutta-9607_ai.openai.azure.com/" \
    || echo -e "${YELLOW}⚠️ OpenAI endpoint may already exist${NC}"

echo -e "${GREEN}✅ Key Vault setup completed!${NC}"

# List stored secrets
echo -e "${BLUE}📋 Secrets stored in Key Vault:${NC}"
az keyvault secret list --vault-name $KEY_VAULT_NAME --query "[].name" --output table

echo -e "${BLUE}📝 Manual Steps (if automated setup failed):${NC}"
echo -e "1. Go to Azure Portal > Key Vaults > $KEY_VAULT_NAME"
echo -e "2. Go to Access policies or RBAC"
echo -e "3. Add your user with 'Key Vault Secrets Officer' role"
echo -e "4. Add these secrets manually:"
echo -e "   - azure-client-secret: $CLIENT_SECRET"
echo -e "   - azure-openai-key: 172068a0b5a348efa948c8339cca0329"
echo -e "   - azure-openai-endpoint: https://parvinddutta-9607_ai.openai.azure.com/"

echo -e "${GREEN}🎉 Key Vault access setup completed!${NC}"