#!/bin/bash
# Deploy Autoscaling Configuration for SageInsure

set -e

echo "📈 Deploying Autoscaling Configuration..."

# Check prerequisites
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed"
    exit 1
fi

if ! command -v helm &> /dev/null; then
    echo "❌ helm is not installed"
    exit 1
fi

# Install Metrics Server (required for HPA)
echo "📊 Installing Metrics Server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for metrics server to be ready
echo "⏳ Waiting for Metrics Server to be ready..."
kubectl wait --for=condition=available deployment/metrics-server -n kube-system --timeout=300s

# Install Prometheus Adapter for custom metrics
echo "📈 Installing Prometheus Adapter..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm upgrade --install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.url=http://prometheus-operated.monitoring.svc.cluster.local \
  --set prometheus.port=9090 \
  --set rules.custom[0].seriesQuery='http_requests_total{namespace!="",pod!=""}' \
  --set rules.custom[0].resources.overrides.namespace.resource="namespace" \
  --set rules.custom[0].resources.overrides.pod.resource="pod" \
  --set rules.custom[0].name.matches="^http_requests_total" \
  --set rules.custom[0].name.as="http_requests_per_second" \
  --set rules.custom[0].metricsQuery='sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)' \
  --wait --timeout=10m

# Install KEDA for advanced autoscaling
echo "🎯 Installing KEDA..."
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm upgrade --install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set prometheus.metricServer.enabled=true \
  --set prometheus.operator.enabled=true \
  --wait --timeout=10m

# Install Vertical Pod Autoscaler (optional)
echo "📏 Installing Vertical Pod Autoscaler..."
VPA_VERSION="1.0.0"
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/download/vertical-pod-autoscaler-${VPA_VERSION}/vpa-release-${VPA_VERSION}.yaml || echo "⚠️  VPA installation failed, continuing..."

# Apply custom metrics configuration
echo "📊 Applying custom metrics configuration..."
kubectl apply -f kubernetes/autoscaling/custom-metrics.yaml

# Apply Horizontal Pod Autoscalers
echo "↔️  Applying Horizontal Pod Autoscalers..."
kubectl apply -f kubernetes/autoscaling/horizontal-pod-autoscaler.yaml

# Apply Vertical Pod Autoscalers (if VPA is installed)
echo "↕️  Applying Vertical Pod Autoscalers..."
kubectl apply -f kubernetes/autoscaling/vertical-pod-autoscaler.yaml || echo "⚠️  VPA not available, skipping VPA configuration"

# Configure Cluster Autoscaler (AKS-specific)
echo "🏗️  Configuring Cluster Autoscaler..."

# Check if running on AKS
if kubectl get nodes -o jsonpath='{.items[0].spec.providerID}' | grep -q "azure"; then
    echo "Detected AKS cluster, applying cluster autoscaler configuration..."
    
    # Create cluster autoscaler secret (this should be populated by Terraform)
    kubectl create secret generic cluster-autoscaler-azure \
      --from-literal=SubscriptionID="${AZURE_SUBSCRIPTION_ID:-}" \
      --from-literal=ResourceGroup="${AZURE_RESOURCE_GROUP:-sageinsure-rg}" \
      --from-literal=TenantID="${AZURE_TENANT_ID:-}" \
      --from-literal=ClientID="${AZURE_CLIENT_ID:-}" \
      --from-literal=ClientSecret="${AZURE_CLIENT_SECRET:-}" \
      --from-literal=VMType="AKS" \
      --from-literal=ClusterName="${AKS_CLUSTER_NAME:-sageinsure-aks}" \
      --from-literal=NodeResourceGroup="${AKS_NODE_RESOURCE_GROUP:-MC_sageinsure-rg_sageinsure-aks_eastus}" \
      --namespace=kube-system \
      --dry-run=client -o yaml | kubectl apply -f - || echo "⚠️  Cluster autoscaler secret already exists"
    
    # Apply cluster autoscaler
    kubectl apply -f kubernetes/autoscaling/cluster-autoscaler.yaml
else
    echo "⚠️  Not running on AKS, skipping cluster autoscaler configuration"
fi

# Validate autoscaling setup
echo "✅ Validating autoscaling setup..."

# Check HPA status
echo "Checking HPA status..."
kubectl get hpa -n default

# Check VPA status (if available)
echo "Checking VPA status..."
kubectl get vpa -n default || echo "VPA not available"

# Check KEDA ScaledObjects
echo "Checking KEDA ScaledObjects..."
kubectl get scaledobjects -n default || echo "No KEDA ScaledObjects found"

# Check metrics server
echo "Checking Metrics Server..."
kubectl top nodes || echo "⚠️  Metrics not available yet, may take a few minutes"

# Check custom metrics API
echo "Checking custom metrics API..."
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq . || echo "⚠️  Custom metrics API not ready yet"

echo ""
echo "📈 Autoscaling deployment completed!"
echo ""
echo "📊 Autoscaling Status:"
echo "- Metrics Server: $(kubectl get deployment metrics-server -n kube-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo '0') replicas ready"
echo "- Prometheus Adapter: $(kubectl get deployment prometheus-adapter -n monitoring -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo '0') replicas ready"
echo "- KEDA: $(kubectl get deployment keda-operator -n keda -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo '0') replicas ready"
echo "- VPA: $(kubectl get deployment vpa-recommender -n kube-system -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo 'Not installed')"
echo ""
echo "🔍 To monitor autoscaling:"
echo "kubectl get hpa -w"
echo "kubectl describe hpa sageinsure-api-hpa"
echo "kubectl top pods"
echo ""
echo "📈 To test autoscaling:"
echo "./scripts/test-autoscaling.sh"