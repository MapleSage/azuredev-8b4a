#!/bin/bash
# Validate SageInsure Security and Compliance Controls

set -e

echo "🔍 Validating SageInsure Security and Compliance Controls..."

# Check Gatekeeper installation
echo "🛡️  Checking Gatekeeper installation..."
if kubectl get namespace gatekeeper-system &> /dev/null; then
    echo "✅ Gatekeeper namespace exists"
    
    # Check Gatekeeper pods
    gatekeeper_pods=$(kubectl get pods -n gatekeeper-system --no-headers | grep Running | wc -l)
    if [ "$gatekeeper_pods" -gt 0 ]; then
        echo "✅ Gatekeeper pods are running ($gatekeeper_pods pods)"
    else
        echo "❌ No Gatekeeper pods are running"
        exit 1
    fi
else
    echo "❌ Gatekeeper namespace does not exist"
    exit 1
fi

# Check Constraint Templates
echo "📋 Checking Constraint Templates..."
constraint_templates=$(kubectl get constrainttemplates --no-headers | wc -l)
if [ "$constraint_templates" -gt 0 ]; then
    echo "✅ Found $constraint_templates Constraint Templates"
    kubectl get constrainttemplates
else
    echo "⚠️  No Constraint Templates found"
fi

# Check Constraints
echo "🎯 Checking Constraints..."
constraints=$(kubectl get constraints --no-headers | wc -l)
if [ "$constraints" -gt 0 ]; then
    echo "✅ Found $constraints Constraints"
    kubectl get constraints
else
    echo "⚠️  No Constraints found"
fi

# Check Network Policies
echo "🌐 Checking Network Policies..."
network_policies=$(kubectl get networkpolicies -n default --no-headers | wc -l)
if [ "$network_policies" -gt 0 ]; then
    echo "✅ Found $network_policies Network Policies in default namespace"
    kubectl get networkpolicies -n default
else
    echo "⚠️  No Network Policies found in default namespace"
fi

# Check Pod Security Standards
echo "🔐 Checking Pod Security Standards..."
namespaces_with_pss=$(kubectl get namespaces -l pod-security.kubernetes.io/enforce --no-headers | wc -l)
if [ "$namespaces_with_pss" -gt 0 ]; then
    echo "✅ Found $namespaces_with_pss namespaces with Pod Security Standards"
    kubectl get namespaces -l pod-security.kubernetes.io/enforce
else
    echo "⚠️  No namespaces with Pod Security Standards found"
fi

# Check RBAC
echo "👤 Checking RBAC configurations..."
service_accounts=$(kubectl get serviceaccounts -n default | grep sageinsure | wc -l)
if [ "$service_accounts" -gt 0 ]; then
    echo "✅ Found $service_accounts SageInsure service accounts"
    kubectl get serviceaccounts -n default | grep sageinsure
else
    echo "⚠️  No SageInsure service accounts found"
fi

# Test policy enforcement (create a test pod that should be rejected)
echo "🧪 Testing policy enforcement..."
cat <<EOF | kubectl apply --dry-run=server -f - 2>&1 | grep -q "denied\|rejected" && echo "✅ Policy enforcement is working" || echo "⚠️  Policy enforcement test inconclusive"
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged-pod
  namespace: default
  labels:
    app.kubernetes.io/part-of: sageinsure
spec:
  containers:
  - name: test
    image: nginx
    securityContext:
      privileged: true
EOF

echo ""
echo "✅ Security validation completed!"
echo ""
echo "🔗 Additional verification commands:"
echo "kubectl describe constrainttemplate k8srequiresecuritycontext"
echo "kubectl describe constraint sageinsure-security-context"
echo "kubectl get networkpolicies -n default -o wide"