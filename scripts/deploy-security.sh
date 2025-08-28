#!/bin/bash
# Deploy SageInsure Security and Compliance Controls

set -e

echo "🔒 Deploying SageInsure Security and Compliance Controls..."

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

# Install OPA Gatekeeper
echo "🛡️  Installing OPA Gatekeeper..."
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
helm repo update

helm upgrade --install gatekeeper gatekeeper/gatekeeper \
  --namespace gatekeeper-system \
  --create-namespace \
  --set replicas=2 \
  --set auditInterval=60 \
  --set constraintViolationsLimit=20 \
  --wait --timeout=10m

# Wait for Gatekeeper to be ready
echo "⏳ Waiting for Gatekeeper to be ready..."
kubectl wait --for=condition=available deployment --all -n gatekeeper-system --timeout=300s

# Apply Pod Security Standards
echo "🔐 Applying Pod Security Standards..."
kubectl apply -f kubernetes/security/pod-security/pod-security-standards.yaml

# Apply Network Policies
echo "🌐 Applying Network Policies..."
kubectl apply -f kubernetes/security/network-policies/network-policies.yaml

# Apply RBAC configurations
echo "👤 Applying RBAC configurations..."
kubectl apply -f kubernetes/security/rbac/service-accounts.yaml

# Apply security configurations
echo "⚙️  Applying security configurations..."
kubectl apply -f kubernetes/security/security-config.yaml

# Apply Gatekeeper Constraint Templates
echo "📋 Applying Gatekeeper Constraint Templates..."
kubectl apply -f kubernetes/security/opa-gatekeeper/constraint-templates.yaml

# Wait for Constraint Templates to be established
echo "⏳ Waiting for Constraint Templates to be established..."
sleep 30

# Apply Gatekeeper Constraints
echo "🎯 Applying Gatekeeper Constraints..."
kubectl apply -f kubernetes/security/opa-gatekeeper/constraints.yaml

echo "✅ Security and compliance controls deployed successfully!"
echo ""
echo "🔍 Verification commands:"
echo "kubectl get constrainttemplates"
echo "kubectl get constraints"
echo "kubectl get networkpolicies -n default"
echo "kubectl get psp"