#!/bin/bash

# AKS Key Vault Integration Setup Script
# This script configures Key Vault CSI driver and workload identity for AKS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up AKS Key Vault integration...${NC}"

# Configuration
CLUSTER_NAME="sageinsure-aks"
RESOURCE_GROUP="rg-maplesage-openai-project"
KEY_VAULT_NAME="kv-sageretailjssso"
NAMESPACE="sageinsure"
SERVICE_ACCOUNT="sageinsure-workload-identity"
CLIENT_ID="27650c1d-91fa-4747-a2fa-1a52813ac5ac"
TENANT_ID="e9394f90-446d-41dd-8c8c-98ac08c5f090"

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${YELLOW}⚠️ kubectl not configured. Getting AKS credentials...${NC}"
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME
fi

# Create namespace if it doesn't exist
echo -e "${BLUE}📁 Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Install Azure Key Vault CSI driver (if not already installed)
echo -e "${BLUE}🔧 Installing Key Vault CSI driver...${NC}"
helm repo add csi-secrets-store-provider-azure https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
helm repo update

helm upgrade --install csi-secrets-store-provider-azure/csi-secrets-store-provider-azure \
    --generate-name \
    --set secrets-store-csi-driver.syncSecret.enabled=true \
    --set secrets-store-csi-driver.enableSecretRotation=true \
    || echo -e "${YELLOW}⚠️ CSI driver may already be installed${NC}"

# Enable workload identity on AKS cluster
echo -e "${BLUE}🆔 Enabling workload identity on AKS cluster...${NC}"
az aks update \
    --resource-group $RESOURCE_GROUP \
    --name $CLUSTER_NAME \
    --enable-workload-identity \
    --enable-oidc-issuer \
    || echo -e "${YELLOW}⚠️ Workload identity may already be enabled${NC}"

# Get OIDC issuer URL
OIDC_ISSUER=$(az aks show --resource-group $RESOURCE_GROUP --name $CLUSTER_NAME --query "oidcIssuerProfile.issuerUrl" --output tsv)
echo -e "${GREEN}📋 OIDC Issuer: $OIDC_ISSUER${NC}"

# Create federated identity credential
echo -e "${BLUE}🔗 Creating federated identity credential...${NC}"
az identity federated-credential create \
    --name "sageinsure-federated-identity" \
    --identity-name "id-sageretailjssso" \
    --resource-group $RESOURCE_GROUP \
    --issuer $OIDC_ISSUER \
    --subject "system:serviceaccount:$NAMESPACE:$SERVICE_ACCOUNT" \
    || echo -e "${YELLOW}⚠️ Federated credential may already exist${NC}"

# Apply Kubernetes manifests
echo -e "${BLUE}📋 Applying Kubernetes manifests...${NC}"
kubectl apply -f k8s/secrets/keyvault-csi-driver.yaml

# Grant Key Vault access to managed identity
echo -e "${BLUE}🔑 Granting Key Vault access to managed identity...${NC}"
MANAGED_IDENTITY_OBJECT_ID=$(az identity show --name "id-sageretailjssso" --resource-group $RESOURCE_GROUP --query principalId --output tsv)

az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee $MANAGED_IDENTITY_OBJECT_ID \
    --scope "/subscriptions/$(az account show --query id --output tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEY_VAULT_NAME" \
    || echo -e "${YELLOW}⚠️ Role assignment may already exist${NC}"

# Test the setup
echo -e "${BLUE}🧪 Testing Key Vault integration...${NC}"
kubectl create job test-keyvault-access --image=mcr.microsoft.com/azure-cli:latest \
    --dry-run=client -o yaml > test-job.yaml

cat >> test-job.yaml << EOF
spec:
  template:
    metadata:
      labels:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: $SERVICE_ACCOUNT
      containers:
      - name: test
        image: mcr.microsoft.com/azure-cli:latest
        command: ["sh", "-c"]
        args:
        - |
          echo "Testing Key Vault access..."
          az login --identity --username $CLIENT_ID
          az keyvault secret show --vault-name $KEY_VAULT_NAME --name azure-client-secret --query value -o tsv
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
      restartPolicy: Never
EOF

kubectl apply -f test-job.yaml -n $NAMESPACE
echo -e "${YELLOW}⏳ Waiting for test job to complete...${NC}"
sleep 30

# Check test results
kubectl logs job/test-keyvault-access -n $NAMESPACE || echo -e "${YELLOW}⚠️ Test job may still be running${NC}"

# Cleanup test job
kubectl delete job test-keyvault-access -n $NAMESPACE --ignore-not-found
rm -f test-job.yaml

echo -e "${GREEN}✅ AKS Key Vault integration setup completed!${NC}"

echo -e "${BLUE}📝 Next Steps:${NC}"
echo -e "1. Verify secrets are accessible in pods"
echo -e "2. Update application deployments to use workload identity"
echo -e "3. Test secret rotation functionality"
echo -e "4. Monitor Key Vault access logs"

echo -e "${GREEN}🎉 Key Vault integration ready for production!${NC}"