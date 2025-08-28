#!/bin/bash
# Deploy SageInsure Monitoring Stack

set -e

NAMESPACE="monitoring"
HELM_TIMEOUT="15m"

echo "🚀 Deploying SageInsure Monitoring Stack..."

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

# Create monitoring namespace
echo "📦 Creating monitoring namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Add Helm repositories
echo "📚 Adding Helm repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Prometheus Operator
echo "🔍 Installing Prometheus Operator..."
helm upgrade --install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace $NAMESPACE \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword="admin123" \
  --set grafana.persistence.enabled=true \
  --set grafana.persistence.size=10Gi \
  --set prometheus.prometheusSpec.retention=30d \
  --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=50Gi \
  --wait --timeout=$HELM_TIMEOUT

# Apply custom monitoring configurations
echo "⚙️  Applying custom monitoring configurations..."
kubectl apply -f kubernetes/monitoring/prometheus/servicemonitors.yaml
kubectl apply -f kubernetes/monitoring/prometheus/prometheus-rules.yaml
kubectl apply -f kubernetes/monitoring/grafana/dashboards-configmap.yaml
kubectl apply -f kubernetes/monitoring/alertmanager/alertmanager-config.yaml
kubectl apply -f kubernetes/monitoring/application-monitoring.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available deployment --all -n $NAMESPACE --timeout=600s

# Get service information
echo "📊 Monitoring stack deployed successfully!"
echo ""
echo "🔗 Access URLs:"
echo "Grafana: kubectl port-forward -n $NAMESPACE svc/prometheus-operator-grafana 3000:80"
echo "Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus-operator-kube-p-prometheus 9090:9090"
echo "AlertManager: kubectl port-forward -n $NAMESPACE svc/prometheus-operator-kube-p-alertmanager 9093:9093"
echo ""
echo "🔑 Default Grafana credentials:"
echo "Username: admin"
echo "Password: admin123"
echo ""
echo "✅ Monitoring deployment completed!"