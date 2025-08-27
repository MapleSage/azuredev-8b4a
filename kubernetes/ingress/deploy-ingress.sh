#!/bin/bash

# Deploy Ingress and Networking Configuration for SageInsure AKS Migration
# This script deploys all ingress, networking, and security configurations

set -euo pipefail

echo "🚀 Deploying SageInsure Ingress and Networking Configuration..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we're connected to the correct cluster
CURRENT_CONTEXT=$(kubectl config current-context)
echo "📋 Current kubectl context: $CURRENT_CONTEXT"

# Confirm deployment
read -p "🤔 Do you want to deploy to this cluster? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "📦 Deploying TLS certificates..."
kubectl apply -f tls-certificates.yaml

echo "🔒 Deploying security policies..."
kubectl apply -f security-policies.yaml

echo "🌐 Deploying network policies..."
kubectl apply -f network-policies.yaml

echo "⚡ Deploying rate limiting configuration..."
kubectl apply -f rate-limiting-config.yaml

echo "🔀 Deploying main ingress configuration..."
kubectl apply -f main-ingress.yaml

echo "⏳ Waiting for certificates to be ready..."
kubectl wait --for=condition=Ready certificate/sageinsure-tls-cert --timeout=300s -n default || echo "⚠️  Certificate not ready yet, continuing..."

echo "📊 Checking ingress status..."
kubectl get ingress -n default
kubectl get certificates -n default
kubectl get networkpolicies -n default

echo "🔍 Checking NGINX Ingress Controller status..."
kubectl get pods -n ingress-nginx

echo "✅ Ingress and networking configuration deployed successfully!"

echo "📝 Next steps:"
echo "1. Update your DNS records to point to the NGINX Ingress Controller LoadBalancer IP"
echo "2. Test the endpoints:"
echo "   - https://sageinsure.local (Frontend)"
echo "   - https://api.sageinsure.local (API)"
echo "   - https://grafana.sageinsure.local (Monitoring)"
echo "3. Monitor certificate issuance with: kubectl describe certificate sageinsure-tls-cert"

# Get LoadBalancer IP
echo "🌍 LoadBalancer IP for DNS configuration:"
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' || echo "LoadBalancer IP not yet assigned"