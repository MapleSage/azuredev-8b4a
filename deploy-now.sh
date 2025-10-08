#!/bin/bash
set -e

# Immediate AKS deployment following .kiro specs
RG_NAME="sageinsure-prod"
CLUSTER_NAME="sageinsure-aks"
LOCATION="eastus"
ACR_NAME="sageinsureacr$(date +%s)"

echo "Creating production deployment..."

# Create resource group
az group create --name $RG_NAME --location $LOCATION

# Create ACR
az acr create --resource-group $RG_NAME --name $ACR_NAME --sku Basic --admin-enabled true

# Create AKS cluster
az aks create \
  --resource-group $RG_NAME \
  --name $CLUSTER_NAME \
  --node-count 2 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --attach-acr $ACR_NAME \
  --enable-managed-identity

# Get credentials
az aks get-credentials --resource-group $RG_NAME --name $CLUSTER_NAME --overwrite-existing

# Build and push image
cd azure-agentcore
az acr build --registry $ACR_NAME --image sageinsure-api:latest .

# Deploy to AKS
envsubst < k8s-simple.yaml | kubectl apply -f -

echo "Deployment complete. Getting service endpoint..."
kubectl get services -o wide