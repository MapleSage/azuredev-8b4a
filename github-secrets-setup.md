# GitHub Secrets Setup for SageInsure AKS Migration

## Required GitHub Secrets

### 1. AZURE_CREDENTIALS

Add this secret to your GitHub repository for CI/CD authentication:

**Secret Name:** `AZURE_CREDENTIALS`

**Secret Value:**

```json
{
  "clientId": "13d36788-efc1-46cc-8302-03eb81850c4f",
  "clientSecret": "wdF8Q~K4qirFr5Jti9qq43rF~q26INECLPaLNc.h",
  "subscriptionId": "2bfa9715-785b-445f-8102-6a423a7495ef",
  "tenantId": "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

## How to Add GitHub Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name and value
6. Click **Add secret**

## Verification

After adding the secrets, you can test the CI/CD pipeline by:

1. Going to **Actions** tab in your GitHub repository
2. Running the "GitOps Deployment" workflow manually
3. Checking that Azure authentication works properly

## Application Secrets

The application secrets are already configured in Azure Key Vault:

- ✅ OPENAI-API-KEY (for Azure OpenAI access)
- ✅ SEARCH-ADMIN-KEY (for Azure Cognitive Search access)
- ✅ STORAGE-CONNECTION-STRING (for Azure Storage access)

These are automatically mounted into the pods via the Azure Key Vault CSI driver.
