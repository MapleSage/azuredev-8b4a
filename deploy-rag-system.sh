#!/bin/bash
set -e

echo "🚀 Deploying Azure OpenAI GPT + Cognitive Search for SageInsure RAG System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="sageinsure-rg"
LOCATION="East US"
TERRAFORM_DIR="./terraform"

# Function to print colored output
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

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v az &> /dev/null; then
    print_error "Azure CLI not found. Please install it first."
    exit 1
fi

if ! command -v terraform &> /dev/null; then
    print_error "Terraform not found. Please install it first."
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    print_error "kubectl not found. Please install it first."
    exit 1
fi

if ! command -v helm &> /dev/null; then
    print_error "Helm not found. Please install it first."
    exit 1
fi

# Login check
print_status "Checking Azure login status..."
if ! az account show &> /dev/null; then
    print_warning "Not logged into Azure. Please run 'az login' first."
    exit 1
fi

print_success "Prerequisites check passed!"

# Deploy Terraform infrastructure
print_status "Deploying Terraform infrastructure..."
cd $TERRAFORM_DIR

# Initialize Terraform
print_status "Initializing Terraform..."
terraform init

# Plan deployment
print_status "Planning Terraform deployment..."
terraform plan -out=tfplan

# Apply deployment
print_status "Applying Terraform deployment..."
terraform apply tfplan

# Get outputs
print_status "Getting Terraform outputs..."
OPENAI_ENDPOINT=$(terraform output -raw openai_endpoint 2>/dev/null || echo "")
SEARCH_ENDPOINT=$(terraform output -raw search_endpoint 2>/dev/null || echo "")
AKS_CLUSTER_NAME=$(terraform output -raw aks_cluster_name 2>/dev/null || echo "sageinsure-aks")
KEY_VAULT_NAME=$(terraform output -raw key_vault_name 2>/dev/null || echo "")

cd ..

print_success "Terraform deployment completed!"

# Configure kubectl for AKS
print_status "Configuring kubectl for AKS cluster..."
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing

# Deploy Helm charts
print_status "Deploying application via Helm..."

# Update Helm values with actual endpoints
if [ ! -z "$OPENAI_ENDPOINT" ] && [ ! -z "$SEARCH_ENDPOINT" ]; then
    print_status "Updating Helm values with actual service endpoints..."
    
    # Create temporary values file
    cat > values-deployment.yaml << EOF
env:
  - name: AZURE_SEARCH_ENDPOINT
    value: "$SEARCH_ENDPOINT"
  - name: AZURE_OPENAI_ENDPOINT
    value: "$OPENAI_ENDPOINT"
  - name: AZURE_OPENAI_DEPLOYMENT
    value: "gpt4o-deployment"
  - name: AZURE_SEARCH_INDEX
    value: "policy-index"

keyVault:
  enabled: true
  name: "$KEY_VAULT_NAME"
EOF

    # Deploy with updated values
    helm upgrade --install sageinsure-api ./helm-charts/sageinsure-api \
        --namespace sageinsure \
        --create-namespace \
        --values ./helm-charts/sageinsure-api/values.yaml \
        --values values-deployment.yaml \
        --wait --timeout=10m

    # Clean up temporary file
    rm values-deployment.yaml
else
    print_warning "Could not get service endpoints from Terraform. Deploying with default values..."
    helm upgrade --install sageinsure-api ./helm-charts/sageinsure-api \
        --namespace sageinsure \
        --create-namespace \
        --wait --timeout=10m
fi

print_success "Helm deployment completed!"

# Verify deployment
print_status "Verifying deployment..."

# Check pod status
kubectl get pods -n sageinsure

# Check service endpoints
kubectl get svc -n sageinsure

# Check ingress
kubectl get ingress -n sageinsure

# Test health endpoint
print_status "Testing application health..."
sleep 30  # Wait for pods to be ready

POD_NAME=$(kubectl get pods -n sageinsure -l app.kubernetes.io/name=sageinsure-api -o jsonpath='{.items[0].metadata.name}')
if [ ! -z "$POD_NAME" ]; then
    print_status "Testing health endpoint on pod $POD_NAME..."
    kubectl exec -n sageinsure $POD_NAME -- curl -s http://localhost:8000/healthz || print_warning "Health check failed"
fi

print_success "🎉 Deployment completed successfully!"
print_status "Your Azure OpenAI GPT + Cognitive Search RAG system is now running on AKS!"

echo ""
echo "📋 Summary:"
echo "- Resource Group: $RESOURCE_GROUP"
echo "- AKS Cluster: $AKS_CLUSTER_NAME"
echo "- OpenAI Endpoint: $OPENAI_ENDPOINT"
echo "- Search Endpoint: $SEARCH_ENDPOINT"
echo "- Namespace: sageinsure"
echo ""
echo "🔧 Next Steps:"
echo "1. Configure your domain DNS to point to the ingress controller"
echo "2. Upload policy documents via the /upload endpoint"
echo "3. Test the chat functionality via the /chat endpoint"
echo ""
echo "📖 Access your application:"
echo "- API: https://api-staging.maplesage.com"
echo "- Health: https://api-staging.maplesage.com/healthz"
echo "- Docs: https://api-staging.maplesage.com/docs"