# Azure AD App Registration Setup Guide

## Overview

This guide walks through setting up Azure Active Directory (Azure AD) app registration for MSAL authentication in the SageInsure application.

## Prerequisites

- Azure CLI installed and configured
- Admin access to Azure AD tenant
- Access to the `rg-maplesage-openai-project` resource group

## Automated Setup

Run the automated setup script:

```bash
./scripts/setup-azure-ad.sh
```

This script will:

1. Create Azure AD app registration
2. Configure redirect URIs for development and production
3. Set up API permissions
4. Create client secret
5. Generate environment configuration files

## Manual Setup (Alternative)

If you prefer manual setup or need to troubleshoot:

### 1. Create App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in the details:
   - **Name**: `SageInsure-MSAL-App`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**:
     - Platform: `Single-page application (SPA)`
     - URI: `http://localhost:3000/auth/callback`

### 2. Configure Authentication

1. In your app registration, go to **Authentication**
2. Add additional redirect URIs:
   - `https://your-production-domain.com/auth/callback`
   - `https://staging.your-domain.com/auth/callback`
3. Under **Implicit grant and hybrid flows**, enable:
   - ✅ Access tokens
   - ✅ ID tokens
4. Set **Logout URL**: `https://your-domain.com/logout`

### 3. Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `User.Read` (Sign in and read user profile)
   - `openid` (Sign users in)
   - `profile` (View users' basic profile)

### 4. Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `SageInsure-Secret`
4. Set expiration: `24 months`
5. **Important**: Copy the secret value immediately (it won't be shown again)

### 5. Note Configuration Values

Record these values for your environment configuration:

- **Application (client) ID**: Found on the Overview page
- **Directory (tenant) ID**: Found on the Overview page
- **Client Secret**: The value you copied in step 4

## Environment Configuration

### Development Environment

Create `frontend/.env.local`:

```bash
# Azure AD Configuration
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id-here
NEXT_PUBLIC_AZURE_TENANT_ID=your-tenant-id-here
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/auth/callback
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEVELOPMENT_MODE=false
```

Create `backend/.env`:

```bash
# Azure AD Configuration
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
AZURE_CLIENT_SECRET=your-client-secret-here
AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/
ENVIRONMENT=development

# Existing Azure AI Configuration
AZURE_OPENAI_ENDPOINT=https://parvinddutta-9607_ai.openai.azure.com/
AZURE_OPENAI_API_KEY=your-existing-key
AZURE_OPENAI_DEPLOYMENT=gpt-4o
```

### Production Environment (AKS)

For production, store secrets in Azure Key Vault and reference them in Kubernetes:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: msal-config
  namespace: sageinsure
type: Opaque
stringData:
  AZURE_TENANT_ID: "your-tenant-id"
  AZURE_CLIENT_ID: "your-client-id"
  AZURE_CLIENT_SECRET: "your-client-secret"
  AZURE_KEY_VAULT_URL: "https://kv-sageretailjssso.vault.azure.net/"
```

## Security Best Practices

1. **Never commit secrets to version control**
2. **Use Azure Key Vault for production secrets**
3. **Rotate client secrets regularly (every 6-12 months)**
4. **Use managed identities in AKS when possible**
5. **Restrict redirect URIs to known domains only**

## Troubleshooting

### Common Issues

1. **"AADSTS50011: The reply URL specified in the request does not match"**

   - Verify redirect URIs are correctly configured in Azure AD
   - Ensure URLs match exactly (including trailing slashes)

2. **"AADSTS700016: Application not found in the directory"**

   - Check the client ID is correct
   - Verify you're using the right tenant

3. **"AADSTS65001: The user or administrator has not consented"**
   - Grant admin consent for API permissions
   - Or implement user consent flow in the application

### Verification Steps

1. Test authentication flow in development:

   ```bash
   cd frontend && npm run dev
   ```

2. Check Azure AD logs:

   - Go to Azure Portal > Azure AD > Sign-ins
   - Look for authentication attempts from your application

3. Validate token:
   - Use [jwt.ms](https://jwt.ms) to decode and verify JWT tokens
   - Check audience, issuer, and expiration claims

## Next Steps

After completing Azure AD setup:

1. ✅ Configure Azure Key Vault integration
2. ✅ Implement frontend MSAL configuration
3. ✅ Build backend token validation
4. ✅ Update application components
5. ✅ Deploy to AKS with authentication
