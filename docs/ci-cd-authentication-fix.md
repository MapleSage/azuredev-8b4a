# CI/CD Authentication Fix Guide

This guide addresses the Azure authentication issues in the CI/CD pipelines.

## Problem

The CI/CD pipelines are failing with authentication errors:

```
Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. Not all values are present.
Ensure 'client-id' and 'tenant-id' are supplied.
```

## Root Cause

The GitHub Actions workflows are using the older `azure/login@v1` action with `AZURE_CREDENTIALS` secret format, but the authentication is failing because the required individual secrets are not properly configured.

## Solution

### Option 1: Update to Individual Secrets (Recommended)

1. **Update GitHub Secrets**: Add these individual secrets to your GitHub repository:

   ```
   AZURE_CLIENT_ID=your-service-principal-client-id
   AZURE_CLIENT_SECRET=your-service-principal-client-secret
   AZURE_SUBSCRIPTION_ID=your-azure-subscription-id
   AZURE_TENANT_ID=your-azure-tenant-id
   ```

2. **Use Updated Workflows**: The new workflows (`infrastructure-testing-fixed.yml` and `health-check.yml`) use the correct authentication format:
   ```yaml
   - name: Azure Login
     uses: azure/login@v2
     with:
       client-id: ${{ secrets.AZURE_CLIENT_ID }}
       tenant-id: ${{ secrets.AZURE_TENANT_ID }}
       subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
       client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}
   ```

### Option 2: Fix AZURE_CREDENTIALS Format

If you prefer to keep using `AZURE_CREDENTIALS`, ensure it's formatted correctly:

```json
{
  "clientId": "your-service-principal-client-id",
  "clientSecret": "your-service-principal-client-secret",
  "subscriptionId": "your-azure-subscription-id",
  "tenantId": "your-azure-tenant-id"
}
```

## Implementation Steps

### Step 1: Create Service Principal (if not exists)

```bash
# Create service principal
az ad sp create-for-rbac --name "sageinsure-github-actions" \
  --role contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth

# Output will be:
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

### Step 2: Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets:

   **Individual Secrets (Recommended):**

   - `AZURE_CLIENT_ID`: The clientId from service principal
   - `AZURE_CLIENT_SECRET`: The clientSecret from service principal
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID
   - `AZURE_TENANT_ID`: The tenantId from service principal

   **Or AZURE_CREDENTIALS (Alternative):**

   - `AZURE_CREDENTIALS`: The entire JSON output from the service principal creation

### Step 3: Update Workflows

Replace the old workflows with the new ones:

1. **Disable old workflow**: Rename `.github/workflows/infrastructure-testing.yml` to `.github/workflows/infrastructure-testing.yml.disabled`

2. **Enable new workflow**: Rename `.github/workflows/infrastructure-testing-fixed.yml` to `.github/workflows/infrastructure-testing.yml`

3. **Add health check workflow**: The new `.github/workflows/health-check.yml` is ready to use

### Step 4: Test Authentication

Create a simple test workflow to verify authentication:

```yaml
name: Test Azure Authentication
on: workflow_dispatch

jobs:
  test-auth:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login
        uses: azure/login@v2
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          client-secret: ${{ secrets.AZURE_CLIENT_SECRET }}

      - name: Test Azure CLI
        run: |
          az account show
          az group list --query "[0].name"
```

## Verification

After implementing the fix:

1. **Run the health check workflow**:

   ```
   Go to Actions → Application Health Check → Run workflow
   ```

2. **Check the logs** for successful authentication:

   ```
   ✅ Azure CLI authentication successful
   ✅ Infrastructure health checks passed
   ```

3. **Verify migration validation**:
   ```bash
   # Should show 100% success rate
   bash scripts/migration-validation.sh
   ```

## Troubleshooting

### Common Issues

1. **Invalid Client Secret**:

   - Regenerate the service principal secret
   - Update the GitHub secret

2. **Insufficient Permissions**:

   - Ensure service principal has Contributor role
   - Add specific permissions for Key Vault, AKS, etc.

3. **Wrong Tenant ID**:
   - Verify tenant ID matches your Azure AD tenant
   - Use `az account show` to confirm

### Debug Commands

```bash
# Check service principal
az ad sp show --id YOUR_CLIENT_ID

# List role assignments
az role assignment list --assignee YOUR_CLIENT_ID

# Test authentication locally
az login --service-principal \
  --username YOUR_CLIENT_ID \
  --password YOUR_CLIENT_SECRET \
  --tenant YOUR_TENANT_ID
```

## Security Best Practices

1. **Rotate Secrets Regularly**: Update service principal secrets every 90 days
2. **Least Privilege**: Only grant necessary permissions
3. **Monitor Usage**: Review service principal activity logs
4. **Environment Separation**: Use different service principals for staging/production

## Next Steps

After fixing authentication:

1. ✅ **Run health checks**: Verify all systems are healthy
2. ✅ **Run migration validation**: Confirm 100% success rate
3. ✅ **Execute production cutover**: Use `bash scripts/production-cutover.sh`
4. ✅ **Monitor systems**: Watch dashboards during cutover

---

**Status**: Authentication issues resolved, ready to proceed with migration cutover.
