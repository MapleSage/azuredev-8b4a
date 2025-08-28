#!/bin/bash
# Validate SageInsure Monitoring Stack

set -e

NAMESPACE="monitoring"

echo "🔍 Validating SageInsure Monitoring Stack..."

# Check if monitoring namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    echo "❌ Monitoring namespace does not exist"
    exit 1
fi

# Check Prometheus deployment
echo "📊 Checking Prometheus..."
if kubectl get deployment prometheus-operator-kube-p-prometheus -n $NAMESPACE &> /dev/null; then
    echo "✅ Prometheus deployment found"
    
    # Check if Prometheus is ready
    if kubectl wait --for=condition=available deployment/prometheus-operator-kube-p-prometheus -n $NAMESPACE --timeout=60s; then
        echo "✅ Prometheus is ready"
    else
        echo "❌ Prometheus is not ready"
        exit 1
    fi
else
    echo "❌ Prometheus deployment not found"
    exit 1
fi

# Check Grafana deployment
echo "📈 Checking Grafana..."
if kubectl get deployment prometheus-operator-grafana -n $NAMESPACE &> /dev/null; then
    echo "✅ Grafana deployment found"
    
    # Check if Grafana is ready
    if kubectl wait --for=condition=available deployment/prometheus-operator-grafana -n $NAMESPACE --timeout=60s; then
        echo "✅ Grafana is ready"
    else
        echo "❌ Grafana is not ready"
        exit 1
    fi
else
    echo "❌ Grafana deployment not found"
    exit 1
fi

# Check AlertManager
echo "🚨 Checking AlertManager..."
if kubectl get statefulset alertmanager-prometheus-operator-kube-p-alertmanager -n $NAMESPACE &> /dev/null; then
    echo "✅ AlertManager found"
else
    echo "❌ AlertManager not found"
    exit 1
fi

# Check ServiceMonitors
echo "🎯 Checking ServiceMonitors..."
servicemonitors=$(kubectl get servicemonitors -n $NAMESPACE --no-headers | wc -l)
if [ "$servicemonitors" -gt 0 ]; then
    echo "✅ Found $servicemonitors ServiceMonitors"
    kubectl get servicemonitors -n $NAMESPACE
else
    echo "⚠️  No ServiceMonitors found"
fi

# Check PrometheusRules
echo "📋 Checking PrometheusRules..."
rules=$(kubectl get prometheusrules -n $NAMESPACE --no-headers | wc -l)
if [ "$rules" -gt 0 ]; then
    echo "✅ Found $rules PrometheusRules"
    kubectl get prometheusrules -n $NAMESPACE
else
    echo "⚠️  No PrometheusRules found"
fi

# Test Prometheus connectivity
echo "🔗 Testing Prometheus connectivity..."
kubectl run prometheus-test --image=curlimages/curl --rm -i --restart=Never -n $NAMESPACE -- \
    curl -f -m 10 http://prometheus-operator-kube-p-prometheus:9090/-/healthy && \
    echo "✅ Prometheus is healthy" || echo "❌ Prometheus health check failed"

# Test Grafana connectivity
echo "🔗 Testing Grafana connectivity..."
kubectl run grafana-test --image=curlimages/curl --rm -i --restart=Never -n $NAMESPACE -- \
    curl -f -m 10 http://prometheus-operator-grafana/api/health && \
    echo "✅ Grafana is healthy" || echo "❌ Grafana health check failed"

echo ""
echo "✅ Monitoring validation completed!"
echo ""
echo "🔗 To access the monitoring stack:"
echo "Grafana: kubectl port-forward -n $NAMESPACE svc/prometheus-operator-grafana 3000:80"
echo "Prometheus: kubectl port-forward -n $NAMESPACE svc/prometheus-operator-kube-p-prometheus 9090:9090"