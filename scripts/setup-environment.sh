#!/bin/bash
# Setup script to configure environment variables from Terraform outputs
# Run this after terraform apply to set up the search index seeding

set -e

echo "🔧 Setting up environment from Terraform outputs..."

# Get Terraform outputs
cd ../terraform
SEARCH_ENDPOINT=$(terraform output -raw api_app_url | sed 's/sageinsure-api.azurewebsites.net/https:\/\/sageinsure-search.search.windows.net/')
SEARCH_SERVICE=$(terraform output -raw search_service_name)
STORAGE_ACCOUNT=$(terraform output -raw storage_account)
KEY_VAULT_NAME=$(terraform output -raw key_vault_name)

# Get secrets from Key Vault
echo "🔑 Retrieving secrets from Key Vault..."
SEARCH_KEY=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name "AZURE-SEARCH-KEY" --query value -o tsv)
STORAGE_KEY=$(az keyvault secret show --vault-name $KEY_VAULT_NAME --name "STORAGE-ACCOUNT-KEY" --query value -o tsv)

# Export environment variables
export AZURE_SEARCH_ENDPOINT="https://${SEARCH_SERVICE}.search.windows.net"
export AZURE_SEARCH_KEY="$SEARCH_KEY"
export AZURE_SEARCH_INDEX="policy-index"
export AZURE_STORAGE_ACCOUNT="$STORAGE_ACCOUNT"
export STORAGE_ACCOUNT_KEY="$STORAGE_KEY"
export POLICY_DOCS_CONTAINER="policy-docs"

echo "✅ Environment configured. Running search index seeding..."

# Install dependencies and run seeding script
pip install -r requirements.txt
python seed-search-index.py

echo "🚀 Search index seeding complete!"