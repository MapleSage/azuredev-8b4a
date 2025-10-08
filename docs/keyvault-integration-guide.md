# Azure Key Vault Integration Guide

## Overview

This guide covers integrating Azure Key Vault with the SageInsure application for secure secret management in both development and production (AKS) environments.

## Key Vault Configuration

### Existing Key Vault

- **Name**: `kv-sageretailjssso`
- **Resource Group**: `rg-maplesage-openai-project`
- **URL**: `https://kv-sageretailjssso.vault.azure.net/`

### Required Secrets

The following secrets need to be stored in Key Vault:

1. **azure-client-secret**: `2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ`
2. **azure-openai-key**: `172068a0b5a348efa948c8339cca0329`
3. **azure-openai-endpoint**: `https://parvinddutta-9607_ai.openai.azure.com/`

## Manual Key Vault Setup

Since automated setup requires additional permissions, follow these manual steps:

### 1. Grant Key Vault Access

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Key vaults** > **kv-sageretailjssso**
3. Go to **Access control (IAM)**
4. Click **Add** > **Add role assignment**
5. Select **Key Vault Secrets Officer** role
6. Assign to your user account (`parvind.dutta@gmail.com`)
7. Click **Review + assign**

### 2. Add Secrets

1. In the Key Vault, go to **Secrets**
2. Click **Generate/Import**
3. Add each secret:

   **Secret 1: azure-client-secret**

   - Name: `azure-client-secret`
   - Value: `2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ`

   **Secret 2: azure-openai-key**

   - Name: `azure-openai-key`
   - Value: `172068a0b5a348efa948c8339cca0329`

   **Secret 3: azure-openai-endpoint**

   - Name: `azure-openai-endpoint`
   - Value: `https://parvinddutta-9607_ai.openai.azure.com/`

### 3. Configure Managed Identity Access

For production AKS deployment:

1. Go to **Key vaults** > **kv-sageretailjssso** > **Access control (IAM)**
2. Click **Add** > **Add role assignment**
3. Select **Key Vault Secrets User** role
4. Assign to the managed identity: `id-sageretailjssso`

## AKS Integration

### 1. Install Key Vault CSI Driver

```bash
# Add Helm repository
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
helm repo update

# Install CSI driver
helm install csi-secrets-store-provider-azure csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
    --set secrets-store-csi-driver.syncSecret.enabled=true \
    --set secrets-store-csi-driver.enableSecretRotation=true
```

### 2. Enable Workload Identity

```bash
# Enable workload identity on AKS cluster
az aks update \
    --resource-group rg-maplesage-openai-project \
    --name sageinsure-aks \
    --enable-workload-identity \
    --enable-oidc-issuer
```

### 3. Apply Kubernetes Manifests

The Key Vault integration manifests are in `k8s/secrets/keyvault-csi-driver.yaml`:

```bash
kubectl apply -f k8s/secrets/keyvault-csi-driver.yaml
```

## Backend Integration

### 1. Install Required Packages

```bash
pip install azure-identity azure-keyvault-secrets
```

### 2. Key Vault Service Class

Create `backend/services/keyvault_service.py`:

```python
import os
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class KeyVaultService:
    def __init__(self):
        self.vault_url = os.getenv('AZURE_KEY_VAULT_URL')
        self.client_id = os.getenv('AZURE_CLIENT_ID')

        # Use appropriate credential based on environment
        if os.getenv('ENVIRONMENT') == 'production':
            self.credential = ManagedIdentityCredential(client_id=self.client_id)
        else:
            self.credential = DefaultAzureCredential()

        self.client = SecretClient(vault_url=self.vault_url, credential=self.credential)

    def get_secret(self, secret_name: str) -> Optional[str]:
        """Retrieve a secret from Key Vault"""
        try:
            secret = self.client.get_secret(secret_name)
            return secret.value
        except Exception as e:
            logger.error(f"Failed to retrieve secret {secret_name}: {e}")
            return None

    def get_openai_config(self) -> dict:
        """Get OpenAI configuration from Key Vault"""
        return {
            'api_key': self.get_secret('azure-openai-key'),
            'endpoint': self.get_secret('azure-openai-endpoint'),
            'api_version': '2024-02-15-preview'
        }
```

### 3. Update FastAPI Application

Modify `backend/app.py` to use Key Vault:

```python
from services.keyvault_service import KeyVaultService

# Initialize Key Vault service
kv_service = KeyVaultService()

# Get OpenAI configuration from Key Vault
openai_config = kv_service.get_openai_config()
if openai_config['api_key']:
    openai.api_key = openai_config['api_key']
    openai.api_base = openai_config['endpoint']
```

## Development Environment

For local development, use environment variables as fallback:

```bash
# backend/.env
AZURE_TENANT_ID=e9394f90-446d-41dd-8c8c-98ac08c5f090
AZURE_CLIENT_ID=27650c1d-91fa-4747-a2fa-1a52813ac5ac
AZURE_CLIENT_SECRET=2nr8Q~uTHkYXbWglQm80ibOlqo-K6N2Ew5g6VacZ
AZURE_KEY_VAULT_URL=https://kv-sageretailjssso.vault.azure.net/
ENVIRONMENT=development

# Fallback values (if Key Vault is not accessible)
AZURE_OPENAI_ENDPOINT=https://parvinddutta-9607_ai.openai.azure.com/
AZURE_OPENAI_API_KEY=172068a0b5a348efa948c8339cca0329
```

## Production Deployment

### 1. Kubernetes Deployment with Key Vault

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sageinsure-backend
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: sageinsure-workload-identity
      containers:
        - name: backend
          image: sageinsure/backend:latest
          env:
            - name: AZURE_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: msal-config
                  key: AZURE_CLIENT_ID
          volumeMounts:
            - name: secrets-store
              mountPath: "/mnt/secrets"
              readOnly: true
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: "sageinsure-secrets"
```

## Testing Key Vault Integration

### 1. Test Script

Use the provided test script:

```bash
cd backend
python test_keyvault.py
```

### 2. Manual Testing

```bash
# Test Azure CLI access
az keyvault secret show --vault-name kv-sageretailjssso --name azure-client-secret

# Test from AKS pod
kubectl exec -it <pod-name> -- cat /mnt/secrets/azure-client-secret
```

## Troubleshooting

### Common Issues

1. **"Caller is not authorized"**

   - Check Key Vault access policies
   - Verify managed identity permissions
   - Ensure correct client ID

2. **"No module named 'azure.keyvault'"**

   - Install: `pip install azure-keyvault-secrets`
   - Check virtual environment activation

3. **"Authentication failed"**
   - Verify Azure CLI login: `az login`
   - Check environment variables
   - Validate managed identity configuration

### Verification Steps

1. **Check Key Vault Access**:

   ```bash
   az keyvault secret list --vault-name kv-sageretailjssso
   ```

2. **Verify Managed Identity**:

   ```bash
   az identity show --name id-sageretailjssso --resource-group rg-maplesage-openai-project
   ```

3. **Test Workload Identity**:
   ```bash
   kubectl describe serviceaccount sageinsure-workload-identity -n sageinsure
   ```

## Security Best Practices

1. **Use Managed Identity in production**
2. **Rotate secrets regularly**
3. **Monitor Key Vault access logs**
4. **Use least privilege access**
5. **Enable Key Vault soft delete**
6. **Implement secret rotation automation**

## Next Steps

After completing Key Vault integration:

1. ✅ Test secret retrieval in development
2. ✅ Deploy to AKS with workload identity
3. ✅ Implement frontend MSAL configuration
4. ✅ Update backend authentication middleware
5. ✅ Test end-to-end authentication flow
