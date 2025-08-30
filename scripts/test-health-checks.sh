#!/bin/bash

# Health Check Test Script for SageInsure AKS Migration
# This script performs basic health checks on the infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if Azure CLI is authenticated
check_azure_auth() {
    echo "Checking Azure CLI authentication..."
    
    if az account show &> /dev/null; then
        SUBSCRIPTION=$(az account show --query name -o tsv)
        print_status "Azure CLI authenticated (Subscription: $SUBSCRIPTION)"
        return 0
    else
        print_error "Azure CLI not authenticated"
        return 1
    fi
}

# Check if resource group exists
check_resource_group() {
    echo "Checking resource group..."
    
    RG_NAME="sageinsure-rg"
    
    if az group show --name "$RG_NAME" &> /dev/null; then
        print_status "Resource group '$RG_NAME' exists"
        return 0
    else
        print_error "Resource group '$RG_NAME' not found"
        return 1
    fi
}

# Check Key Vault
check_key_vault() {
    echo "Checking Key Vault..."
    
    KV_NAME="kv-eedfa81f"
    RG_NAME="sageinsure-rg"
    
    if az keyvault show --name "$KV_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "Key Vault '$KV_NAME' exists and is accessible"
        
        # Check if we can list secrets (requires permissions)
        if az keyvault secret list --vault-name "$KV_NAME" &> /dev/null; then
            SECRET_COUNT=$(az keyvault secret list --vault-name "$KV_NAME" --query "length(@)" -o tsv)
            print_status "Key Vault contains $SECRET_COUNT secrets"
        else
            print_warning "Key Vault exists but secrets are not accessible (permissions may be limited)"
        fi
        return 0
    else
        print_error "Key Vault '$KV_NAME' not found or not accessible"
        return 1
    fi
}

# Check Azure OpenAI
check_azure_openai() {
    echo "Checking Azure OpenAI..."
    
    OPENAI_NAME="sageinsure-openai"
    RG_NAME="sageinsure-rg"
    
    if az cognitiveservices account show --name "$OPENAI_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "Azure OpenAI service '$OPENAI_NAME' exists"
        return 0
    else
        print_error "Azure OpenAI service '$OPENAI_NAME' not found"
        return 1
    fi
}

# Check Azure Cognitive Search
check_azure_search() {
    echo "Checking Azure Cognitive Search..."
    
    SEARCH_NAME="sageinsure-search"
    RG_NAME="sageinsure-rg"
    
    if az search service show --name "$SEARCH_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "Azure Cognitive Search service '$SEARCH_NAME' exists"
        return 0
    else
        print_error "Azure Cognitive Search service '$SEARCH_NAME' not found"
        return 1
    fi
}

# Check Storage Account
check_storage_account() {
    echo "Checking Storage Account..."
    
    STORAGE_NAME="policydocseedfa81f"
    RG_NAME="sageinsure-rg"
    
    if az storage account show --name "$STORAGE_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "Storage Account '$STORAGE_NAME' exists"
        return 0
    else
        print_error "Storage Account '$STORAGE_NAME' not found"
        return 1
    fi
}

# Check AKS Cluster
check_aks_cluster() {
    echo "Checking AKS Cluster..."
    
    AKS_NAME="sageinsure-aks"
    RG_NAME="sageinsure-rg"
    
    if az aks show --name "$AKS_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "AKS Cluster '$AKS_NAME' exists"
        
        # Check cluster status
        CLUSTER_STATE=$(az aks show --name "$AKS_NAME" --resource-group "$RG_NAME" --query "provisioningState" -o tsv)
        if [[ "$CLUSTER_STATE" == "Succeeded" ]]; then
            print_status "AKS Cluster is in 'Succeeded' state"
        else
            print_warning "AKS Cluster is in '$CLUSTER_STATE' state"
        fi
        
        # Check if we can get credentials
        if az aks get-credentials --name "$AKS_NAME" --resource-group "$RG_NAME" --overwrite-existing &> /dev/null; then
            print_status "AKS credentials retrieved successfully"
            
            # Check if kubectl works
            if kubectl cluster-info &> /dev/null; then
                print_status "kubectl connectivity to AKS cluster successful"
                
                # Check node status
                NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
                READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || true)
                print_status "AKS cluster has $READY_NODES/$NODE_COUNT nodes ready"
            else
                print_warning "kubectl cannot connect to AKS cluster"
            fi
        else
            print_warning "Cannot retrieve AKS credentials (may require additional permissions)"
        fi
        
        return 0
    else
        print_warning "AKS Cluster '$AKS_NAME' not found (may not be deployed yet)"
        return 1
    fi
}

# Check Virtual Network
check_virtual_network() {
    echo "Checking Virtual Network..."
    
    VNET_NAME="sageinsure-vnet"
    RG_NAME="sageinsure-rg"
    
    if az network vnet show --name "$VNET_NAME" --resource-group "$RG_NAME" &> /dev/null; then
        print_status "Virtual Network '$VNET_NAME' exists"
        
        # Check subnets
        SUBNET_COUNT=$(az network vnet subnet list --vnet-name "$VNET_NAME" --resource-group "$RG_NAME" --query "length(@)" -o tsv)
        print_status "Virtual Network has $SUBNET_COUNT subnets"
        
        return 0
    else
        print_warning "Virtual Network '$VNET_NAME' not found (may not be deployed yet)"
        return 1
    fi
}

# Main health check function
main() {
    echo "SageInsure Infrastructure Health Check"
    echo "====================================="
    echo ""
    
    FAILED_CHECKS=0
    
    # Run all health checks
    check_azure_auth || ((FAILED_CHECKS++))
    echo ""
    
    check_resource_group || ((FAILED_CHECKS++))
    echo ""
    
    check_key_vault || ((FAILED_CHECKS++))
    echo ""
    
    check_azure_openai || ((FAILED_CHECKS++))
    echo ""
    
    check_azure_search || ((FAILED_CHECKS++))
    echo ""
    
    check_storage_account || ((FAILED_CHECKS++))
    echo ""
    
    check_virtual_network || ((FAILED_CHECKS++))
    echo ""
    
    check_aks_cluster || ((FAILED_CHECKS++))
    echo ""
    
    # Summary
    echo "Health Check Summary"
    echo "==================="
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        print_status "All health checks passed!"
        exit 0
    else
        print_error "$FAILED_CHECKS health check(s) failed"
        exit 1
    fi
}

# Run main function
main