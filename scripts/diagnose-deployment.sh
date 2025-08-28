#!/bin/bash
# Deployment Diagnostic Script for SageInsure
# This script helps diagnose deployment issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AKS_CLUSTER_NAME="sageinsure-aks"
AKS_RESOURCE_GROUP="sageinsure-rg"

echo -e "${BLUE}🔍 SageInsure Deployment Diagnostics${NC}"
echo "====================================="

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check Azure CLI connection
check_azure_connection() {
    print_status "Checking Azure CLI connection..."
    
    if az account show &> /dev/null; then
        local subscription=$(az account show --query name -o tsv)
        print_success "Connected to Azure subscription: $subscription"
    else
        print_error "Not logged into Azure CLI. Run 'az login' first."
        return 1
    fi
}

# Function to check AKS cluster status
check_aks_cluster() {
    print_status "Checking AKS cluster status..."
    
    local cluster_status=$(az aks show --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --query provisioningState -o tsv 2>/dev/null || echo "NotFound")
    
    if [ "$cluster_status" = "Succeeded" ]; then
        print_success "AKS cluster is running"
        
        # Get cluster info
        local k8s_version=$(az aks show --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --query kubernetesVersion -o tsv)
        local node_count=$(az aks show --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --query agentPoolProfiles[0].count -o tsv)
        
        echo "  Kubernetes Version: $k8s_version"
        echo "  Node Count: $node_count"
    elif [ "$cluster_status" = "NotFound" ]; then
        print_error "AKS cluster not found"
        return 1
    else
        print_warning "AKS cluster status: $cluster_status"
    fi
}

# Function to check kubectl connection
check_kubectl_connection() {
    print_status "Checking kubectl connection..."
    
    # Try to get AKS credentials
    if az aks get-credentials --resource-group "$AKS_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME" --overwrite-existing --admin &> /dev/null; then
        print_success "Retrieved AKS credentials"
        
        # Test kubectl connection
        if kubectl cluster-info &> /dev/null; then
            print_success "kubectl connection successful"
            kubectl get nodes --no-headers | while read line; do
                echo "  Node: $line"
            done
        else
            print_error "kubectl connection failed"
            return 1
        fi
    else
        print_error "Failed to get AKS credentials"
        return 1
    fi
}

# Function to check namespaces
check_namespaces() {
    print_status "Checking namespaces..."
    
    local namespaces=$(kubectl get namespaces --no-headers -o custom-columns=":metadata.name" | grep -E "(default|staging|production)" || true)
    
    if [ -n "$namespaces" ]; then
        echo "Available namespaces:"
        for ns in $namespaces; do
            local pod_count=$(kubectl get pods -n "$ns" --no-headers 2>/dev/null | wc -l)
            echo "  $ns: $pod_count pods"
        done
    else
        print_warning "No application namespaces found"
    fi
}

# Function to check deployments
check_deployments() {
    print_status "Checking deployments..."
    
    for namespace in default staging production; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            local deployments=$(kubectl get deployments -n "$namespace" --no-headers 2>/dev/null | wc -l)
            if [ "$deployments" -gt 0 ]; then
                echo "Deployments in $namespace:"
                kubectl get deployments -n "$namespace" -o wide
                echo ""
            else
                print_warning "No deployments found in $namespace namespace"
            fi
        fi
    done
}

# Function to check services
check_services() {
    print_status "Checking services..."
    
    for namespace in default staging production; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            local services=$(kubectl get services -n "$namespace" --no-headers 2>/dev/null | grep -v kubernetes | wc -l)
            if [ "$services" -gt 0 ]; then
                echo "Services in $namespace:"
                kubectl get services -n "$namespace" | grep -v kubernetes
                echo ""
            else
                print_warning "No application services found in $namespace namespace"
            fi
        fi
    done
}

# Function to check pods
check_pods() {
    print_status "Checking pod status..."
    
    for namespace in default staging production; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            local pods=$(kubectl get pods -n "$namespace" --no-headers 2>/dev/null | wc -l)
            if [ "$pods" -gt 0 ]; then
                echo "Pods in $namespace:"
                kubectl get pods -n "$namespace" -o wide
                
                # Check for unhealthy pods
                local unhealthy=$(kubectl get pods -n "$namespace" --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
                if [ "$unhealthy" -gt 0 ]; then
                    print_warning "Found $unhealthy unhealthy pods in $namespace"
                    kubectl get pods -n "$namespace" --field-selector=status.phase!=Running
                fi
                echo ""
            else
                print_warning "No pods found in $namespace namespace"
            fi
        fi
    done
}

# Function to check secrets
check_secrets() {
    print_status "Checking required secrets..."
    
    local required_secrets=("database-secret" "azure-secrets" "acr-secret")
    
    for namespace in default staging; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            echo "Secrets in $namespace:"
            for secret in "${required_secrets[@]}"; do
                if kubectl get secret "$secret" -n "$namespace" &> /dev/null; then
                    print_success "  $secret: Found"
                else
                    print_error "  $secret: Missing"
                fi
            done
            echo ""
        fi
    done
}

# Function to check ingress
check_ingress() {
    print_status "Checking ingress configuration..."
    
    # Check if NGINX ingress controller is installed
    if kubectl get pods -n ingress-nginx --no-headers 2>/dev/null | grep -q nginx; then
        print_success "NGINX Ingress Controller is running"
        kubectl get pods -n ingress-nginx
    else
        print_warning "NGINX Ingress Controller not found"
    fi
    
    # Check ingress resources
    for namespace in default staging production; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            local ingresses=$(kubectl get ingress -n "$namespace" --no-headers 2>/dev/null | wc -l)
            if [ "$ingresses" -gt 0 ]; then
                echo "Ingress resources in $namespace:"
                kubectl get ingress -n "$namespace"
                echo ""
            fi
        fi
    done
}

# Function to check helm releases
check_helm_releases() {
    print_status "Checking Helm releases..."
    
    if command -v helm &> /dev/null; then
        for namespace in default staging production; do
            if kubectl get namespace "$namespace" &> /dev/null; then
                local releases=$(helm list -n "$namespace" --no-headers 2>/dev/null | wc -l)
                if [ "$releases" -gt 0 ]; then
                    echo "Helm releases in $namespace:"
                    helm list -n "$namespace"
                    echo ""
                fi
            fi
        done
    else
        print_warning "Helm not installed"
    fi
}

# Function to provide recommendations
provide_recommendations() {
    echo ""
    echo -e "${YELLOW}📋 Recommendations:${NC}"
    echo "==================="
    
    # Check if staging namespace exists
    if ! kubectl get namespace staging &> /dev/null; then
        echo "1. Create staging namespace and deploy applications:"
        echo "   ./scripts/setup-staging-environment.sh"
        echo ""
    fi
    
    # Check if any applications are deployed
    local total_deployments=0
    for namespace in default staging production; do
        if kubectl get namespace "$namespace" &> /dev/null; then
            local deployments=$(kubectl get deployments -n "$namespace" --no-headers 2>/dev/null | wc -l)
            total_deployments=$((total_deployments + deployments))
        fi
    done
    
    if [ "$total_deployments" -eq 0 ]; then
        echo "2. Deploy applications using Helm charts:"
        echo "   helm install sageinsure-api ./helm-charts/sageinsure-api -n staging"
        echo "   helm install sageinsure-frontend ./helm-charts/sageinsure-frontend -n staging"
        echo ""
    fi
    
    # Check secrets
    if ! kubectl get secret database-secret -n staging &> /dev/null; then
        echo "3. Create required secrets in staging namespace:"
        echo "   kubectl create secret generic database-secret --from-literal=connection-string='<your-db-connection>' -n staging"
        echo "   kubectl create secret generic azure-secrets --from-literal=openai-api-key='<key>' --from-literal=search-api-key='<key>' -n staging"
        echo ""
    fi
    
    echo "4. Monitor deployment status:"
    echo "   kubectl get all -n staging"
    echo "   kubectl logs -l app.kubernetes.io/name=sageinsure-api -n staging"
}

# Main function
main() {
    check_azure_connection || exit 1
    check_aks_cluster || exit 1
    check_kubectl_connection || exit 1
    check_namespaces
    check_deployments
    check_services
    check_pods
    check_secrets
    check_ingress
    check_helm_releases
    provide_recommendations
    
    echo ""
    print_success "Diagnostic complete!"
}

# Run main function
main