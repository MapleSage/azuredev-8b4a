#!/bin/bash

# SageInsure Deployment Health Check Script
# This script diagnoses deployment monitoring and application health issues

set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="sageinsure-rg"
AKS_CLUSTER="sageinsure-aks"
NAMESPACE="sageinsure"

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_status() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check AKS cluster connectivity
check_aks_connectivity() {
    print_header "AKS Cluster Connectivity"
    
    # Get AKS credentials
    print_info "Getting AKS credentials..."
    if az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing > /dev/null 2>&1; then
        print_status "AKS credentials retrieved successfully"
    else
        print_error "Failed to retrieve AKS credentials"
        return 1
    fi
    
    # Test kubectl connectivity
    print_info "Testing kubectl connectivity..."
    if timeout 30 kubectl cluster-info > /dev/null 2>&1; then
        print_status "kubectl connectivity successful"
    else
        print_error "kubectl connectivity failed - may require interactive authentication"
        print_info "Trying alternative authentication method..."
        
        # Try to use device code authentication
        if az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing --format azure > /dev/null 2>&1; then
            print_warning "Alternative authentication configured - manual login may be required"
        else
            print_error "All authentication methods failed"
            return 1
        fi
    fi
    
    return 0
}

# Check cluster nodes
check_cluster_nodes() {
    print_header "Cluster Nodes Status"
    
    if ! timeout 10 kubectl get nodes > /dev/null 2>&1; then
        print_error "Cannot access cluster nodes - authentication required"
        return 1
    fi
    
    print_info "Node status:"
    kubectl get nodes -o wide 2>/dev/null || print_error "Failed to get node status"
    
    # Check node readiness
    TOTAL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
    READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
    
    if [[ $READY_NODES -eq $TOTAL_NODES && $TOTAL_NODES -gt 0 ]]; then
        print_status "All $TOTAL_NODES nodes are ready"
    else
        print_error "$READY_NODES out of $TOTAL_NODES nodes are ready"
    fi
    
    # Check node resource usage
    print_info "Node resource usage:"
    kubectl top nodes 2>/dev/null || print_warning "Metrics server not available for resource usage"
}

# Check system pods
check_system_pods() {
    print_header "System Pods Health"
    
    if ! timeout 10 kubectl get pods -n kube-system > /dev/null 2>&1; then
        print_error "Cannot access system pods"
        return 1
    fi
    
    print_info "System pods status:"
    kubectl get pods -n kube-system 2>/dev/null
    
    # Check for failed system pods
    FAILED_SYSTEM_PODS=$(kubectl get pods -n kube-system --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
    if [[ $FAILED_SYSTEM_PODS -eq 0 ]]; then
        print_status "All system pods are running"
    else
        print_error "$FAILED_SYSTEM_PODS system pods are not running"
        print_info "Failed system pods:"
        kubectl get pods -n kube-system --field-selector=status.phase!=Running 2>/dev/null
    fi
}

# Check application namespace
check_application_namespace() {
    print_header "Application Namespace Check"
    
    # Check if namespace exists
    if kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
        print_status "Namespace '$NAMESPACE' exists"
    else
        print_warning "Namespace '$NAMESPACE' does not exist - creating it"
        if kubectl create namespace $NAMESPACE > /dev/null 2>&1; then
            print_status "Namespace '$NAMESPACE' created successfully"
        else
            print_error "Failed to create namespace '$NAMESPACE'"
            return 1
        fi
    fi
    
    # Check pods in application namespace
    print_info "Checking pods in '$NAMESPACE' namespace:"
    POD_COUNT=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    
    if [[ $POD_COUNT -eq 0 ]]; then
        print_warning "No pods found in '$NAMESPACE' namespace - applications may not be deployed"
        return 0
    fi
    
    kubectl get pods -n $NAMESPACE -o wide 2>/dev/null
    
    # Check pod health
    RUNNING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    if [[ $RUNNING_PODS -eq $POD_COUNT ]]; then
        print_status "All $POD_COUNT application pods are running"
    else
        print_error "Only $RUNNING_PODS out of $POD_COUNT application pods are running"
        
        # Show failed pods
        print_info "Failed pods:"
        kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running 2>/dev/null
        
        # Show pod logs for failed pods
        print_info "Logs from failed pods:"
        kubectl get pods -n $NAMESPACE --field-selector=status.phase!=Running --no-headers 2>/dev/null | while read pod rest; do
            print_info "Logs for pod: $pod"
            kubectl logs $pod -n $NAMESPACE --tail=20 2>/dev/null || print_warning "Could not get logs for $pod"
        done
    fi
}

# Check services and ingress
check_services_ingress() {
    print_header "Services and Ingress Check"
    
    # Check services
    print_info "Services in '$NAMESPACE' namespace:"
    SERVICE_COUNT=$(kubectl get services -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    
    if [[ $SERVICE_COUNT -eq 0 ]]; then
        print_warning "No services found in '$NAMESPACE' namespace"
    else
        kubectl get services -n $NAMESPACE -o wide 2>/dev/null
        print_status "Found $SERVICE_COUNT services"
    fi
    
    # Check ingress
    print_info "Ingress resources:"
    INGRESS_COUNT=$(kubectl get ingress -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    
    if [[ $INGRESS_COUNT -eq 0 ]]; then
        print_warning "No ingress resources found in '$NAMESPACE' namespace"
    else
        kubectl get ingress -n $NAMESPACE -o wide 2>/dev/null
        print_status "Found $INGRESS_COUNT ingress resources"
    fi
    
    # Check ingress controller
    print_info "Checking ingress controller:"
    INGRESS_CONTROLLER_PODS=$(kubectl get pods -n ingress-nginx --no-headers 2>/dev/null | wc -l)
    
    if [[ $INGRESS_CONTROLLER_PODS -eq 0 ]]; then
        print_error "No ingress controller pods found"
    else
        kubectl get pods -n ingress-nginx 2>/dev/null
        
        # Check ingress controller service
        INGRESS_SVC=$(kubectl get service -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
        if [[ -n "$INGRESS_SVC" ]]; then
            print_status "Ingress controller has external IP: $INGRESS_SVC"
        else
            print_warning "Ingress controller does not have external IP assigned"
        fi
    fi
}

# Check application health endpoints
check_health_endpoints() {
    print_header "Application Health Endpoints"
    
    # Get ingress IP
    INGRESS_IP=$(kubectl get service -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    
    if [[ -z "$INGRESS_IP" ]]; then
        print_warning "No ingress IP available - cannot test health endpoints"
        return 0
    fi
    
    print_info "Testing health endpoints via ingress IP: $INGRESS_IP"
    
    # Test basic ingress connectivity
    if curl -s --max-time 10 "http://$INGRESS_IP" > /dev/null 2>&1; then
        print_status "Ingress controller is responding"
    else
        print_error "Ingress controller is not responding"
    fi
    
    # Test API health endpoint (if configured)
    API_HEALTH_URL="http://$INGRESS_IP/api/healthz"
    print_info "Testing API health endpoint: $API_HEALTH_URL"
    
    HEALTH_RESPONSE=$(curl -s --max-time 10 "$API_HEALTH_URL" 2>/dev/null)
    if [[ $? -eq 0 && -n "$HEALTH_RESPONSE" ]]; then
        print_status "API health endpoint is responding: $HEALTH_RESPONSE"
    else
        print_warning "API health endpoint is not responding or not configured"
    fi
    
    # Test frontend (if configured)
    FRONTEND_URL="http://$INGRESS_IP/"
    print_info "Testing frontend endpoint: $FRONTEND_URL"
    
    if curl -s --max-time 10 "$FRONTEND_URL" > /dev/null 2>&1; then
        print_status "Frontend is responding"
    else
        print_warning "Frontend is not responding or not configured"
    fi
}

# Check monitoring and metrics
check_monitoring() {
    print_header "Monitoring and Metrics"
    
    # Check if monitoring namespace exists
    if kubectl get namespace monitoring > /dev/null 2>&1; then
        print_status "Monitoring namespace exists"
        
        # Check Prometheus
        PROMETHEUS_PODS=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus --no-headers 2>/dev/null | wc -l)
        if [[ $PROMETHEUS_PODS -gt 0 ]]; then
            print_status "Prometheus is deployed ($PROMETHEUS_PODS pods)"
        else
            print_warning "Prometheus not found in monitoring namespace"
        fi
        
        # Check Grafana
        GRAFANA_PODS=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana --no-headers 2>/dev/null | wc -l)
        if [[ $GRAFANA_PODS -gt 0 ]]; then
            print_status "Grafana is deployed ($GRAFANA_PODS pods)"
        else
            print_warning "Grafana not found in monitoring namespace"
        fi
        
    else
        print_warning "Monitoring namespace does not exist"
    fi
    
    # Check metrics server
    if kubectl get deployment metrics-server -n kube-system > /dev/null 2>&1; then
        print_status "Metrics server is deployed"
    else
        print_warning "Metrics server not found"
    fi
}

# Deploy sample application for testing
deploy_test_application() {
    print_header "Deploying Test Application"
    
    print_info "Deploying a simple test application to validate deployment capabilities..."
    
    # Create test deployment
    cat <<EOF | kubectl apply -f - > /dev/null 2>&1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: test-app
        image: nginx:alpine
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 10m
            memory: 16Mi
          limits:
            cpu: 50m
            memory: 64Mi
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 15
          periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: test-app-service
  namespace: $NAMESPACE
spec:
  selector:
    app: test-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
EOF

    if [[ $? -eq 0 ]]; then
        print_status "Test application deployed successfully"
        
        # Wait for pod to be ready
        print_info "Waiting for test pod to be ready..."
        if kubectl wait --for=condition=ready pod -l app=test-app -n $NAMESPACE --timeout=60s > /dev/null 2>&1; then
            print_status "Test pod is ready"
            
            # Test the service
            print_info "Testing service connectivity..."
            if kubectl exec -n $NAMESPACE deployment/test-app -- curl -s http://test-app-service > /dev/null 2>&1; then
                print_status "Service connectivity test passed"
            else
                print_warning "Service connectivity test failed"
            fi
            
        else
            print_error "Test pod failed to become ready within 60 seconds"
            kubectl describe pod -l app=test-app -n $NAMESPACE 2>/dev/null
        fi
        
        # Clean up test application
        print_info "Cleaning up test application..."
        kubectl delete deployment test-app -n $NAMESPACE > /dev/null 2>&1
        kubectl delete service test-app-service -n $NAMESPACE > /dev/null 2>&1
        
    else
        print_error "Failed to deploy test application"
        return 1
    fi
}

# Generate deployment health report
generate_deployment_report() {
    print_header "Deployment Health Summary"
    
    echo ""
    echo "Deployment Health Check Results:"
    echo "==============================="
    
    # Re-run key checks for summary
    if timeout 10 kubectl cluster-info > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Kubernetes cluster connectivity"
        
        TOTAL_NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
        READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
        
        if [[ $READY_NODES -eq $TOTAL_NODES && $TOTAL_NODES -gt 0 ]]; then
            echo -e "${GREEN}✓${NC} All $TOTAL_NODES cluster nodes are ready"
        else
            echo -e "${RED}✗${NC} Only $READY_NODES out of $TOTAL_NODES nodes are ready"
        fi
        
        FAILED_SYSTEM_PODS=$(kubectl get pods -n kube-system --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
        if [[ $FAILED_SYSTEM_PODS -eq 0 ]]; then
            echo -e "${GREEN}✓${NC} All system pods are healthy"
        else
            echo -e "${RED}✗${NC} $FAILED_SYSTEM_PODS system pods are not running"
        fi
        
        if kubectl get namespace $NAMESPACE > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Application namespace '$NAMESPACE' exists"
            
            POD_COUNT=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
            RUNNING_PODS=$(kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
            
            if [[ $POD_COUNT -eq 0 ]]; then
                echo -e "${YELLOW}⚠${NC} No application pods deployed"
            elif [[ $RUNNING_PODS -eq $POD_COUNT ]]; then
                echo -e "${GREEN}✓${NC} All $POD_COUNT application pods are running"
            else
                echo -e "${RED}✗${NC} Only $RUNNING_PODS out of $POD_COUNT application pods are running"
            fi
        else
            echo -e "${YELLOW}⚠${NC} Application namespace '$NAMESPACE' does not exist"
        fi
        
    else
        echo -e "${RED}✗${NC} Cannot connect to Kubernetes cluster"
    fi
    
    echo ""
    echo "Recommendations:"
    echo "==============="
    
    if ! timeout 10 kubectl cluster-info > /dev/null 2>&1; then
        echo "1. Authenticate with AKS cluster: az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER"
        echo "2. If authentication fails, try: kubelogin convert-kubeconfig -l azurecli"
        echo "3. Verify cluster is running: az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER"
    fi
    
    POD_COUNT=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [[ $POD_COUNT -eq 0 ]]; then
        echo "1. Deploy applications to the '$NAMESPACE' namespace"
        echo "2. Use Helm charts: helm install sageinsure-api ./helm/sageinsure-api -n $NAMESPACE"
        echo "3. Verify container images are available in ACR"
    fi
    
    INGRESS_IP=$(kubectl get service -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
    if [[ -z "$INGRESS_IP" ]]; then
        echo "1. Deploy ingress controller: helm install ingress-nginx ingress-nginx/ingress-nginx"
        echo "2. Wait for external IP assignment (may take 5-10 minutes)"
        echo "3. Configure DNS records to point to the ingress IP"
    fi
}

# Main execution
main() {
    print_header "SageInsure Deployment Health Check"
    echo "This script diagnoses deployment monitoring and application health issues"
    echo ""
    
    check_aks_connectivity
    echo ""
    
    check_cluster_nodes
    echo ""
    
    check_system_pods
    echo ""
    
    check_application_namespace
    echo ""
    
    check_services_ingress
    echo ""
    
    check_health_endpoints
    echo ""
    
    check_monitoring
    echo ""
    
    # Only deploy test app if no applications are running
    POD_COUNT=$(kubectl get pods -n $NAMESPACE --no-headers 2>/dev/null | wc -l)
    if [[ $POD_COUNT -eq 0 ]]; then
        echo ""
        deploy_test_application
    fi
    
    echo ""
    generate_deployment_report
}

# Run main function
main