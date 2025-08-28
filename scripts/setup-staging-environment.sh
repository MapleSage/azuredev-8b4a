#!/bin/bash
# Setup Staging Environment for SageInsure
# This script creates the staging namespace and deploys applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="staging"
AKS_CLUSTER_NAME="sageinsure-aks"
AKS_RESOURCE_GROUP="sageinsure-rg"
REGISTRY="sageinsureacr.azurecr.io"
IMAGE_TAG=${IMAGE_TAG:-"latest"}

echo -e "${BLUE}🚀 Setting up SageInsure Staging Environment${NC}"
echo "=============================================="

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if helm is available
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    # Check if az CLI is available
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed or not in PATH"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to connect to AKS cluster
connect_to_aks() {
    print_status "Connecting to AKS cluster..."
    
    # Get AKS credentials
    az aks get-credentials \
        --resource-group "$AKS_RESOURCE_GROUP" \
        --name "$AKS_CLUSTER_NAME" \
        --overwrite-existing \
        --admin
    
    # Verify connection
    if kubectl cluster-info &> /dev/null; then
        print_success "Successfully connected to AKS cluster"
        kubectl get nodes
    else
        print_error "Failed to connect to AKS cluster"
        exit 1
    fi
}

# Function to create staging namespace
create_namespace() {
    print_status "Creating staging namespace..."
    
    # Create namespace if it doesn't exist
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        print_success "Created namespace: $NAMESPACE"
    fi
    
    # Label the namespace
    kubectl label namespace "$NAMESPACE" environment=staging --overwrite
    kubectl label namespace "$NAMESPACE" app.kubernetes.io/part-of=sageinsure --overwrite
}

# Function to create secrets
create_secrets() {
    print_status "Creating secrets in staging namespace..."
    
    # Check if secrets exist in default namespace and copy them
    if kubectl get secret database-secret -n default &> /dev/null; then
        kubectl get secret database-secret -n default -o yaml | \
        sed "s/namespace: default/namespace: $NAMESPACE/" | \
        kubectl apply -f -
        print_success "Copied database-secret to staging"
    else
        print_warning "database-secret not found in default namespace"
    fi
    
    if kubectl get secret azure-secrets -n default &> /dev/null; then
        kubectl get secret azure-secrets -n default -o yaml | \
        sed "s/namespace: default/namespace: $NAMESPACE/" | \
        kubectl apply -f -
        print_success "Copied azure-secrets to staging"
    else
        print_warning "azure-secrets not found in default namespace"
    fi
    
    if kubectl get secret acr-secret -n default &> /dev/null; then
        kubectl get secret acr-secret -n default -o yaml | \
        sed "s/namespace: default/namespace: $NAMESPACE/" | \
        kubectl apply -f -
        print_success "Copied acr-secret to staging"
    else
        print_warning "acr-secret not found in default namespace"
    fi
}

# Function to deploy applications using Helm
deploy_applications() {
    print_status "Deploying applications to staging..."
    
    # Deploy API
    print_status "Deploying SageInsure API..."
    helm upgrade --install sageinsure-api ./helm-charts/sageinsure-api \
        --namespace "$NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set environment="staging" \
        --set replicaCount=2 \
        --set resources.requests.cpu="100m" \
        --set resources.requests.memory="128Mi" \
        --set resources.limits.cpu="500m" \
        --set resources.limits.memory="512Mi" \
        --wait --timeout=300s
    
    if [ $? -eq 0 ]; then
        print_success "SageInsure API deployed successfully"
    else
        print_error "Failed to deploy SageInsure API"
        return 1
    fi
    
    # Deploy Frontend
    print_status "Deploying SageInsure Frontend..."
    helm upgrade --install sageinsure-frontend ./helm-charts/sageinsure-frontend \
        --namespace "$NAMESPACE" \
        --set image.tag="$IMAGE_TAG" \
        --set environment="staging" \
        --set replicaCount=1 \
        --set ingress.hosts[0].host="staging-sageinsure.local" \
        --wait --timeout=300s
    
    if [ $? -eq 0 ]; then
        print_success "SageInsure Frontend deployed successfully"
    else
        print_error "Failed to deploy SageInsure Frontend"
        return 1
    fi
    
    # Deploy Worker (optional)
    if [ -d "./helm-charts/sageinsure-worker" ]; then
        print_status "Deploying SageInsure Worker..."
        helm upgrade --install sageinsure-worker ./helm-charts/sageinsure-worker \
            --namespace "$NAMESPACE" \
            --set image.tag="$IMAGE_TAG" \
            --set environment="staging" \
            --wait --timeout=300s
        
        if [ $? -eq 0 ]; then
            print_success "SageInsure Worker deployed successfully"
        else
            print_warning "Failed to deploy SageInsure Worker (optional)"
        fi
    fi
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for pods to be ready
    print_status "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=sageinsure -n "$NAMESPACE" --timeout=300s
    
    # Check pod status
    print_status "Pod status:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/part-of=sageinsure
    
    # Check services
    print_status "Service status:"
    kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/part-of=sageinsure
    
    # Test API health endpoint
    print_status "Testing API health endpoint..."
    if kubectl run health-test --image=curlimages/curl --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f -m 30 "http://sageinsure-api.$NAMESPACE.svc.cluster.local/health" &> /dev/null; then
        print_success "API health check passed"
    else
        print_warning "API health check failed - this might be expected if the API is still starting"
    fi
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Staging Environment Setup Complete!${NC}"
    echo "========================================"
    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Applications deployed:"
    helm list -n "$NAMESPACE"
    echo ""
    echo "To check the status:"
    echo "  kubectl get all -n $NAMESPACE"
    echo ""
    echo "To access logs:"
    echo "  kubectl logs -l app.kubernetes.io/name=sageinsure-api -n $NAMESPACE"
    echo ""
    echo "To port-forward for local testing:"
    echo "  kubectl port-forward svc/sageinsure-api 8080:80 -n $NAMESPACE"
}

# Main function
main() {
    echo "Configuration:"
    echo "- Namespace: $NAMESPACE"
    echo "- AKS Cluster: $AKS_CLUSTER_NAME"
    echo "- Resource Group: $AKS_RESOURCE_GROUP"
    echo "- Image Tag: $IMAGE_TAG"
    echo ""
    
    check_prerequisites
    connect_to_aks
    create_namespace
    create_secrets
    deploy_applications
    verify_deployment
    show_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --cluster-name)
            AKS_CLUSTER_NAME="$2"
            shift 2
            ;;
        --resource-group)
            AKS_RESOURCE_GROUP="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --namespace NAMESPACE     Kubernetes namespace (default: staging)"
            echo "  --image-tag TAG          Docker image tag (default: latest)"
            echo "  --cluster-name NAME      AKS cluster name (default: sageinsure-aks)"
            echo "  --resource-group RG      Azure resource group (default: sageinsure-rg)"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main