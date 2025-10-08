#!/bin/bash

# Migrate existing AWS insurance KB to Azure
echo "📚 Migrating Insurance KB from AWS to Azure..."

# Copy insurance documents
cp -r ../sample-insurance-policy-ai-assistant/policy_docs ./
cp -r ../sample-insurance-policy-ai-assistant/customer_policy ./

# Create storage account for documents
az storage account create \
  --name sageinsurestorage \
  --resource-group sageinsure-rg \
  --location eastus \
  --sku Standard_LRS

# Upload documents to blob storage
az storage container create \
  --name insurance-docs \
  --account-name sageinsurestorage

az storage blob upload-batch \
  --destination insurance-docs \
  --source ./policy_docs \
  --account-name sageinsurestorage

echo "✅ Insurance KB migrated to Azure!"
echo "📄 Documents: $(ls policy_docs | wc -l) policy files"