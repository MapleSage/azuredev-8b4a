# SageInsure Deployment Guide

## 🚀 Complete End-to-End Deployment

Your Terraform infrastructure is now fully wired with secrets management, RBAC, and bootstrap data. Here's how to complete the deployment:

### 1. Apply Updated Terraform Configuration

```bash
cd terraform
terraform plan
terraform apply
```

This will create:
- ✅ All Azure resources (already done)
- 🔑 Key Vault secrets (OpenAI, Search, Storage keys)
- 🔐 RBAC role assignments for App Service managed identity
- 📄 Sample policy documents in storage
- 🔍 Search index with semantic configuration

### 2. Seed Search Index

```bash
cd scripts
./setup-environment.sh
```

This script will:
- Extract secrets from Key Vault
- Set environment variables
- Install Python dependencies
- Upload policy documents to search index

### 3. Deploy Your Application

Your App Service is now configured with:

```bash
# Environment variables available to your app:
AZURE_OPENAI_ENDPOINT=https://eastus.api.cognitive.microsoft.com/
AZURE_OPENAI_DEPLOYMENT=gpt4o-deployment
OPENAI_API_KEY=@Microsoft.KeyVault(...)

AZURE_SEARCH_ENDPOINT=https://sageinsure-search.search.windows.net
AZURE_SEARCH_INDEX=policy-index
AZURE_SEARCH_KEY=@Microsoft.KeyVault(...)

AZURE_STORAGE_ACCOUNT=policydocseedfa81f
POLICY_DOCS_CONTAINER=policy-docs
CUSTOMER_POLICY_CONTAINER=customer-policy
STORAGE_CONNECTION_STRING=@Microsoft.KeyVault(...)

KEY_VAULT_NAME=kv-eedfa81f
```

### 4. Test Your Deployment

```bash
# Health check
curl https://sageinsure-api.azurewebsites.net/health

# Test search functionality
curl -X POST https://sageinsure-api.azurewebsites.net/search \
  -H "Content-Type: application/json" \
  -d '{"query": "marine insurance coverage"}'

# Test chat endpoint
curl -X POST https://sageinsure-api.azurewebsites.net/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What does marine insurance cover?"}'
```

## 🔧 Configuration Details

### Key Vault Integration
- App Service uses managed identity to access secrets
- All sensitive values stored securely in Key Vault
- Automatic secret rotation supported

### RBAC Permissions
- **Storage Blob Data Contributor**: Read/write policy documents
- **Search Index Data Contributor**: Query and update search index
- **Search Service Contributor**: Manage search service
- **Cognitive Services OpenAI User**: Access OpenAI models

### Search Index Schema
```json
{
  "name": "policy-index",
  "fields": [
    {"name": "id", "type": "Edm.String", "key": true},
    {"name": "title", "type": "Edm.String", "searchable": true},
    {"name": "content", "type": "Edm.String", "searchable": true},
    {"name": "category", "type": "Edm.String", "filterable": true},
    {"name": "effectiveDate", "type": "Edm.DateTimeOffset", "sortable": true}
  ]
}
```

## 🎯 Next Steps

1. **Deploy your FastAPI application** to the App Service
2. **Configure CI/CD pipeline** for automated deployments
3. **Add monitoring** with Application Insights
4. **Scale resources** based on usage patterns
5. **Add custom domains** and SSL certificates

Your SageInsure infrastructure is now production-ready! 🎉