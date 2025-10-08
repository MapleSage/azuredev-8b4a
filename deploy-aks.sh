#!/bin/bash

# Azure Insurance AKS Deployment Script
set -e

# Configuration
RESOURCE_GROUP="sageinsure-rg"
AKS_CLUSTER="sageinsure-aks"
LOCATION="eastus2"
ACR_NAME="sageinsureacr1758906383"
DOMAIN="agents.maplesage.com"

echo "🚀 Starting AKS deployment for Azure Insurance..."

# 1. Create AKS Cluster
echo "📦 Creating AKS cluster..."
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER \
  --location $LOCATION \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys

# 2. Get AKS credentials
echo "🔑 Getting AKS credentials..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER

# 3. Install NGINX Ingress Controller
echo "🌐 Installing NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

# 4. Install cert-manager for SSL
echo "🔒 Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# 5. Wait for ingress controller
echo "⏳ Waiting for ingress controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# 6. Create namespace
echo "📁 Creating namespace..."
kubectl apply -f k8s-manifests/agents-deployment.yaml

# 7. Deploy secrets (you'll need to update with actual values)
echo "🔐 Creating secrets..."
echo "⚠️  Please update secrets.yaml with actual base64 encoded values before deploying"
echo "   Use: echo -n 'your-value' | base64"
read -p "Press enter when secrets.yaml is updated with real values..."
kubectl apply -f k8s-manifests/secrets.yaml

# 8. Deploy MCP servers
echo "🔧 Deploying MCP servers..."
kubectl apply -f k8s-manifests/mcp-servers.yaml

# 9. Deploy agents
echo "🤖 Deploying agents..."
kubectl apply -f k8s-manifests/agents-deployment.yaml

# 10. Deploy ingress
echo "🌍 Deploying ingress..."
kubectl apply -f k8s-manifests/ingress.yaml

# 11. Get external IP
echo "📍 Getting external IP..."
kubectl get service ingress-nginx-controller --namespace=ingress-nginx

echo "✅ Deployment complete!"
echo "📋 Next steps:"
echo "   1. Point DNS record $DOMAIN to the external IP above"
echo "   2. Wait for SSL certificate to be issued"
echo "   3. Build and push agent images to ACR"
echo "   4. Update frontend to use new endpoints"