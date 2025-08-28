#!/bin/bash
# Deploy SageInsure Secret Management and Rotation

set -e

echo "🔐 Deploying SageInsure Secret Management and Rotation..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    echo "❌ helm is not installed or not in PATH"
    exit 1
fi

# Install External Secrets Operator
echo "🔑 Installing External Secrets Operator..."
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm upgrade --install external-secrets external-secrets/external-secrets \
  --namespace external-secrets \
  --create-namespace \
  --set installCRDs=true \
  --set webhook.port=9443 \
  --set certController.create=true \
  --wait --timeout=10m

# Wait for External Secrets Operator to be ready
echo "⏳ Waiting for External Secrets Operator to be ready..."
kubectl wait --for=condition=available deployment external-secrets -n external-secrets --timeout=300s
kubectl wait --for=condition=available deployment external-secrets-cert-controller -n external-secrets --timeout=300s
kubectl wait --for=condition=available deployment external-secrets-webhook -n external-secrets --timeout=300s

# Apply RBAC for secret management
echo "👤 Applying RBAC for secret management..."
kubectl apply -f kubernetes/secrets/management/secret-management-rbac.yaml

# Apply External Secrets configuration
echo "🔗 Applying External Secrets configuration..."
kubectl apply -f kubernetes/secrets/external-secrets/external-secrets-operator.yaml

# Install Reloader for zero-downtime secret updates
echo "🔄 Installing Reloader..."
kubectl apply -f kubernetes/secrets/management/reloader-config.yaml

# Wait for Reloader to be ready
echo "⏳ Waiting for Reloader to be ready..."
kubectl wait --for=condition=available deployment reloader -n reloader --timeout=300s

# Apply secret rotation CronJobs
echo "⏰ Applying secret rotation CronJobs..."
kubectl apply -f kubernetes/secrets/rotation/secret-rotation-cronjob.yaml

# Create Azure credentials secret (if not exists)
echo "🔐 Creating Azure credentials secret..."
if ! kubectl get secret azure-credentials -n default &> /dev/null; then
    echo "⚠️  Azure credentials secret not found. Please create it manually:"
    echo "kubectl create secret generic azure-credentials \\"
    echo "  --from-literal=client-id=YOUR_CLIENT_ID \\"
    echo "  --from-literal=client-secret=YOUR_CLIENT_SECRET \\"
    echo "  --from-literal=tenant-id=YOUR_TENANT_ID \\"
    echo "  -n default"
fi

# Verify External Secrets setup
echo "🔍 Verifying External Secrets setup..."
sleep 30

# Check if External Secrets are syncing
kubectl get externalsecrets -n default
kubectl describe externalsecret sageinsure-api-secrets -n default || echo "⚠️  External Secret not yet created"

echo "✅ Secret management and rotation deployed successfully!"
echo ""
echo "🔗 Verification commands:"
echo "kubectl get externalsecrets -n default"
echo "kubectl get secrets -n default | grep sageinsure"
echo "kubectl get cronjobs -n default"
echo "kubectl logs -n external-secrets deployment/external-secrets"
echo ""
echo "📊 Monitoring commands:"
echo "kubectl describe externalsecret sageinsure-api-secrets"
echo "kubectl get events --field-selector involvedObject.kind=ExternalSecret"