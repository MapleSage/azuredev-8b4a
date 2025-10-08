#!/bin/bash
set -e

echo "🔍 Checking Azure OpenAI GPT + Cognitive Search Deployment Status"
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Configuration
RESOURCE_GROUP="sageinsure-rg"
TERRAFORM_DIR="./terraform"

print_status "Checking Azure resources..."

# Check if resource group exists
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    print_success "Resource group '$RESOURCE_GROUP' exists"
else
    print_error "Resource group '$RESOURCE_GROUP' not found"
    exit 1
fi

# Check Azure OpenAI
print_status "Checking Azure OpenAI service..."
OPENAI_NAME=$(az cognitiveservices account list --resource-group $RESOURCE_GROUP --query "[?kind=='OpenAI'].name" -o tsv)
if [ ! -z "$OPENAI_NAME" ]; then
    print_success "Azure OpenAI account found: $OPENAI_NAME"
    
    # Check deployment
    DEPLOYMENT_COUNT=$(az cognitiveservices account deployment list --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query "length(@)" -o tsv)
    if [ "$DEPLOYMENT_COUNT" -gt 0 ]; then
        print_success "OpenAI model deployments found: $DEPLOYMENT_COUNT"
        az cognitiveservices account deployment list --name $OPENAI_NAME --resource-group $RESOURCE_GROUP --query "[].{Name:name,Model:properties.model.name,Version:properties.model.version}" -o table
    else
        print_warning "No OpenAI model deployments found"
    fi
else
    print_error "Azure OpenAI account not found"
fi

# Check Cognitive Search
print_status "Checking Azure Cognitive Search service..."
SEARCH_NAME=$(az search service list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv)
if [ ! -z "$SEARCH_NAME" ]; then
    print_success "Azure Cognitive Search service found: $SEARCH_NAME"
    
    # Check search index
    SEARCH_KEY=$(az search admin-key show --resource-group $RESOURCE_GROUP --service-name $SEARCH_NAME --query "primaryKey" -o tsv)
    INDEX_CHECK=$(curl -s -H "api-key: $SEARCH_KEY" "https://$SEARCH_NAME.search.windows.net/indexes?api-version=2023-11-01" | jq -r '.value[] | select(.name=="policy-index") | .name' 2>/dev/null || echo "")
    
    if [ "$INDEX_CHECK" = "policy-index" ]; then
        print_success "Search index 'policy-index' exists"
    else
        print_warning "Search index 'policy-index' not found"
    fi
else
    print_error "Azure Cognitive Search service not found"
fi

# Check AKS cluster
print_status "Checking AKS cluster..."
AKS_NAME=$(az aks list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv)
if [ ! -z "$AKS_NAME" ]; then
    print_success "AKS cluster found: $AKS_NAME"
    
    # Get cluster credentials
    az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME --overwrite-existing &> /dev/null
    
    # Check if application is deployed
    if kubectl get namespace sageinsure &> /dev/null; then
        print_success "Application namespace 'sageinsure' exists"
        
        # Check pods
        POD_COUNT=$(kubectl get pods -n sageinsure --no-headers 2>/dev/null | wc -l)
        if [ "$POD_COUNT" -gt 0 ]; then
            print_success "Application pods running: $POD_COUNT"
            kubectl get pods -n sageinsure
        else
            print_warning "No application pods found"
        fi
        
        # Check services
        SVC_COUNT=$(kubectl get svc -n sageinsure --no-headers 2>/dev/null | wc -l)
        if [ "$SVC_COUNT" -gt 0 ]; then
            print_success "Services found: $SVC_COUNT"
            kubectl get svc -n sageinsure
        else
            print_warning "No services found"
        fi
        
        # Check ingress
        INGRESS_COUNT=$(kubectl get ingress -n sageinsure --no-headers 2>/dev/null | wc -l)
        if [ "$INGRESS_COUNT" -gt 0 ]; then
            print_success "Ingress resources found: $INGRESS_COUNT"
            kubectl get ingress -n sageinsure
        else
            print_warning "No ingress resources found"
        fi
    else
        print_warning "Application namespace 'sageinsure' not found"
    fi
else
    print_error "AKS cluster not found"
fi

# Check Key Vault
print_status "Checking Key Vault..."
KV_NAME=$(az keyvault list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv)
if [ ! -z "$KV_NAME" ]; then
    print_success "Key Vault found: $KV_NAME"
    
    # Check secrets
    SECRET_COUNT=$(az keyvault secret list --vault-name $KV_NAME --query "length(@)" -o tsv 2>/dev/null || echo "0")
    print_status "Secrets in Key Vault: $SECRET_COUNT"
else
    print_warning "Key Vault not found"
fi

# Check Storage Account
print_status "Checking Storage Account..."
STORAGE_NAME=$(az storage account list --resource-group $RESOURCE_GROUP --query "[?contains(name, 'policydocs')].name" -o tsv)
if [ ! -z "$STORAGE_NAME" ]; then
    print_success "Storage account found: $STORAGE_NAME"
else
    print_warning "Storage account not found"
fi

echo ""
print_status "🎯 Deployment Status Summary:"

if [ ! -z "$OPENAI_NAME" ] && [ ! -z "$SEARCH_NAME" ] && [ ! -z "$AKS_NAME" ]; then
    print_success "✅ Core infrastructure is deployed"
    
    if [ "$POD_COUNT" -gt 0 ]; then
        print_success "✅ Application is running on AKS"
        echo ""
        echo "🚀 Your Azure OpenAI GPT + Cognitive Search RAG system is operational!"
        echo ""
        echo "📋 Service Endpoints:"
        echo "- OpenAI: https://$OPENAI_NAME.openai.azure.com"
        echo "- Search: https://$SEARCH_NAME.search.windows.net"
        echo "- API: Check ingress for external endpoint"
    else
        print_warning "⚠️  Infrastructure exists but application is not running"
        echo ""
        echo "🔧 To deploy the application, run:"
        echo "   ./deploy-rag-system.sh"
    fi
else
    print_error "❌ Core infrastructure is missing"
    echo ""
    echo "🔧 To deploy the full system, run:"
    echo "   ./deploy-rag-system.sh"
fi