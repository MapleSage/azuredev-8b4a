#!/bin/bash

# SageInsure AKS Migration Validation Script
# This script performs comprehensive validation before production cutover

# Enable error handling but don't exit on first error
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
KEY_VAULT="kv-eedfa81f"
STORAGE_ACCOUNT="policydocseedfa81f"
OPENAI_SERVICE="sageinsure-openai"
SEARCH_SERVICE="sageinsure-search"

# Validation results
VALIDATION_RESULTS=()
FAILED_VALIDATIONS=0
TOTAL_VALIDATIONS=0

# Function to print colored output
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_status() {
    echo -e "${GREEN}[PASS]${NC} $1"
    VALIDATION_RESULTS+=("PASS: $1")
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    VALIDATION_RESULTS+=("WARN: $1")
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    VALIDATION_RESULTS+=("FAIL: $1")
    ((FAILED_VALIDATIONS++))
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to run validation and track results
run_validation() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_VALIDATIONS++))
    print_info "Running: $test_name"
    
    if eval "$test_command" &> /dev/null; then
        print_status "$test_name"
        return 0
    else
        print_error "$test_name"
        return 1
    fi
}

# Validation 1: Infrastructure Health Checks
validate_infrastructure() {
    print_header "Infrastructure Health Validation"
    
    # Azure CLI Authentication
    run_validation "Azure CLI Authentication" "az account show"
    
    # Resource Group
    run_validation "Resource Group Exists" "az group show --name $RESOURCE_GROUP"
    
    # AKS Cluster
    run_validation "AKS Cluster Exists" "az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER"
    
    # Check AKS cluster state
    CLUSTER_STATE=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query provisioningState -o tsv)
    if [[ "$CLUSTER_STATE" == "Succeeded" ]]; then
        print_status "AKS Cluster is in 'Succeeded' state"
    else
        print_error "AKS Cluster is in '$CLUSTER_STATE' state (expected: Succeeded)"
        ((FAILED_VALIDATIONS++))
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Virtual Network
    run_validation "Virtual Network Exists" "az network vnet show --name sageinsure-vnet --resource-group $RESOURCE_GROUP"
    
    # Key Vault
    run_validation "Key Vault Accessible" "az keyvault show --name $KEY_VAULT --resource-group $RESOURCE_GROUP"
    
    # Storage Account
    run_validation "Storage Account Exists" "az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP"
    
    # Azure OpenAI
    run_validation "Azure OpenAI Service Exists" "az cognitiveservices account show --name $OPENAI_SERVICE --resource-group $RESOURCE_GROUP"
    
    # Azure Cognitive Search
    run_validation "Azure Cognitive Search Exists" "az search service show --name $SEARCH_SERVICE --resource-group $RESOURCE_GROUP"
}

# Validation 2: Network and Connectivity
validate_networking() {
    print_header "Network and Connectivity Validation"
    
    # Check subnets
    SUBNET_COUNT=$(az network vnet subnet list --vnet-name sageinsure-vnet --resource-group $RESOURCE_GROUP --query "length(@)" -o tsv)
    if [[ $SUBNET_COUNT -ge 3 ]]; then
        print_status "Virtual Network has $SUBNET_COUNT subnets (minimum 3 required)"
    else
        print_error "Virtual Network has only $SUBNET_COUNT subnets (minimum 3 required)"
        ((FAILED_VALIDATIONS++))
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Check NSGs
    run_validation "Network Security Groups Exist" "az network nsg list --resource-group $RESOURCE_GROUP --query '[0].name'"
    
    # Internet connectivity test
    if curl -s --max-time 10 https://httpbin.org/status/200 > /dev/null; then
        print_status "Internet connectivity test passed"
    else
        print_error "Internet connectivity test failed"
        ((FAILED_VALIDATIONS++))
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Azure service endpoints connectivity
    if curl -s --max-time 10 https://management.azure.com > /dev/null; then
        print_status "Azure Management API connectivity test passed"
    else
        print_error "Azure Management API connectivity test failed"
        ((FAILED_VALIDATIONS++))
    fi
    ((TOTAL_VALIDATIONS++))
}

# Validation 3: Security and Identity
validate_security() {
    print_header "Security and Identity Validation"
    
    # Key Vault secrets
    SECRET_COUNT=$(az keyvault secret list --vault-name $KEY_VAULT --query "length(@)" -o tsv 2>/dev/null || echo "0")
    if [[ $SECRET_COUNT -gt 0 ]]; then
        print_status "Key Vault contains $SECRET_COUNT secrets"
    else
        print_warning "Key Vault secrets not accessible (may require additional permissions)"
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Check for required secrets
    REQUIRED_SECRETS=("openai-api-key" "search-api-key")
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if az keyvault secret show --vault-name $KEY_VAULT --name $secret &> /dev/null; then
            print_status "Required secret '$secret' exists in Key Vault"
        else
            print_warning "Required secret '$secret' not found or not accessible in Key Vault"
        fi
        ((TOTAL_VALIDATIONS++))
    done
    
    # Check managed identities
    IDENTITY_COUNT=$(az identity list --resource-group $RESOURCE_GROUP --query "length(@)" -o tsv)
    if [[ $IDENTITY_COUNT -gt 0 ]]; then
        print_status "Found $IDENTITY_COUNT managed identities"
    else
        print_warning "No managed identities found"
    fi
    ((TOTAL_VALIDATIONS++))
}

# Validation 4: AKS Cluster Detailed Checks
validate_aks_cluster() {
    print_header "AKS Cluster Detailed Validation"
    
    # Node pools
    NODE_POOL_COUNT=$(az aks nodepool list --cluster-name $AKS_CLUSTER --resource-group $RESOURCE_GROUP --query "length(@)" -o tsv)
    if [[ $NODE_POOL_COUNT -ge 1 ]]; then
        print_status "AKS cluster has $NODE_POOL_COUNT node pool(s)"
    else
        print_error "AKS cluster has no node pools"
        ((FAILED_VALIDATIONS++))
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Check node pool status
    NODE_POOLS=$(az aks nodepool list --cluster-name $AKS_CLUSTER --resource-group $RESOURCE_GROUP --query "[].{name:name,provisioningState:provisioningState,count:count}" -o tsv)
    while IFS=$'\t' read -r name state count; do
        if [[ "$state" == "Succeeded" ]]; then
            print_status "Node pool '$name' is healthy with $count nodes"
        else
            print_error "Node pool '$name' is in '$state' state"
            ((FAILED_VALIDATIONS++))
        fi
        ((TOTAL_VALIDATIONS++))
    done <<< "$NODE_POOLS"
    
    # Kubernetes version
    K8S_VERSION=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query kubernetesVersion -o tsv)
    print_status "Kubernetes version: $K8S_VERSION"
    ((TOTAL_VALIDATIONS++))
    
    # AAD integration
    AAD_ENABLED=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query "aadProfile.managed" -o tsv)
    if [[ "$AAD_ENABLED" == "true" ]]; then
        print_status "Azure AD integration is enabled"
    else
        print_warning "Azure AD integration is not enabled"
    fi
    ((TOTAL_VALIDATIONS++))
}

# Validation 5: Monitoring and Observability
validate_monitoring() {
    print_header "Monitoring and Observability Validation"
    
    # Azure Monitor integration
    MONITORING_ENABLED=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query "addonProfiles.omsAgent.enabled" -o tsv)
    if [[ "$MONITORING_ENABLED" == "true" ]]; then
        print_status "Azure Monitor integration is enabled"
    else
        print_warning "Azure Monitor integration is not enabled"
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Log Analytics workspace
    if az monitor log-analytics workspace list --resource-group $RESOURCE_GROUP --query "[0].name" -o tsv &> /dev/null; then
        print_status "Log Analytics workspace exists"
    else
        print_warning "Log Analytics workspace not found"
    fi
    ((TOTAL_VALIDATIONS++))
}

# Validation 6: Application Readiness (if kubectl is accessible)
validate_applications() {
    print_header "Application Readiness Validation"
    
    # Try to get AKS credentials
    if az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing &> /dev/null; then
        print_status "AKS credentials retrieved successfully"
        
        # Test kubectl connectivity (may require interactive auth)
        if timeout 10 kubectl cluster-info &> /dev/null; then
            print_status "kubectl connectivity to AKS cluster successful"
            
            # Check nodes
            NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l || echo "0")
            READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
            if [[ $READY_NODES -gt 0 ]]; then
                print_status "AKS cluster has $READY_NODES/$NODE_COUNT nodes ready"
            else
                print_warning "No ready nodes found in AKS cluster"
            fi
            
            # Check system pods
            SYSTEM_PODS=$(kubectl get pods -n kube-system --no-headers 2>/dev/null | wc -l || echo "0")
            if [[ $SYSTEM_PODS -gt 0 ]]; then
                print_status "Found $SYSTEM_PODS system pods in kube-system namespace"
            else
                print_warning "No system pods found in kube-system namespace"
            fi
            
        else
            print_warning "kubectl cannot connect to AKS cluster (may require interactive authentication)"
        fi
    else
        print_warning "Cannot retrieve AKS credentials"
    fi
    
    # These are informational, not counted as failures
    ((TOTAL_VALIDATIONS += 4))
}

# Validation 7: Performance and Scalability
validate_performance() {
    print_header "Performance and Scalability Validation"
    
    # Check autoscaler configuration
    AUTOSCALER_ENABLED=$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query "autoScalerProfile" -o tsv)
    if [[ "$AUTOSCALER_ENABLED" != "null" && "$AUTOSCALER_ENABLED" != "" ]]; then
        print_status "Cluster autoscaler is configured"
    else
        print_warning "Cluster autoscaler is not configured"
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Check node pool scaling configuration
    SCALABLE_POOLS=$(az aks nodepool list --cluster-name $AKS_CLUSTER --resource-group $RESOURCE_GROUP --query "[?enableAutoScaling==\`true\`].name" -o tsv | wc -l)
    if [[ $SCALABLE_POOLS -gt 0 ]]; then
        print_status "$SCALABLE_POOLS node pool(s) have autoscaling enabled"
    else
        print_warning "No node pools have autoscaling enabled"
    fi
    ((TOTAL_VALIDATIONS++))
}

# Validation 8: Backup and Disaster Recovery
validate_backup_dr() {
    print_header "Backup and Disaster Recovery Validation"
    
    # Check if backup is configured for storage account
    BACKUP_ENABLED=$(az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query "enableHttpsTrafficOnly" -o tsv)
    if [[ "$BACKUP_ENABLED" == "true" ]]; then
        print_status "Storage account has HTTPS-only traffic enabled (security best practice)"
    else
        print_warning "Storage account does not have HTTPS-only traffic enabled"
    fi
    ((TOTAL_VALIDATIONS++))
    
    # Check geo-replication
    REPLICATION_TYPE=$(az storage account show --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query "sku.name" -o tsv)
    if [[ "$REPLICATION_TYPE" == *"GRS"* || "$REPLICATION_TYPE" == *"RAGRS"* ]]; then
        print_status "Storage account has geo-redundant replication ($REPLICATION_TYPE)"
    else
        print_warning "Storage account does not have geo-redundant replication ($REPLICATION_TYPE)"
    fi
    ((TOTAL_VALIDATIONS++))
}

# Generate validation report
generate_report() {
    print_header "Migration Validation Report"
    
    echo ""
    echo "Validation Summary:"
    echo "=================="
    echo "Total Validations: $TOTAL_VALIDATIONS"
    echo "Failed Validations: $FAILED_VALIDATIONS"
    echo "Success Rate: $(( (TOTAL_VALIDATIONS - FAILED_VALIDATIONS) * 100 / TOTAL_VALIDATIONS ))%"
    echo ""
    
    echo "Detailed Results:"
    echo "================"
    for result in "${VALIDATION_RESULTS[@]}"; do
        if [[ $result == PASS:* ]]; then
            echo -e "${GREEN}✓${NC} ${result#PASS: }"
        elif [[ $result == WARN:* ]]; then
            echo -e "${YELLOW}⚠${NC} ${result#WARN: }"
        elif [[ $result == FAIL:* ]]; then
            echo -e "${RED}✗${NC} ${result#FAIL: }"
        fi
    done
    
    echo ""
    echo "Migration Readiness Assessment:"
    echo "=============================="
    
    if [[ $FAILED_VALIDATIONS -eq 0 ]]; then
        print_status "✅ MIGRATION READY: All critical validations passed!"
        echo ""
        echo "Recommendations:"
        echo "- Proceed with production cutover"
        echo "- Monitor system closely during cutover"
        echo "- Have rollback plan ready"
        return 0
    elif [[ $FAILED_VALIDATIONS -le 2 ]]; then
        print_warning "⚠️  MIGRATION READY WITH CAUTION: Minor issues detected"
        echo ""
        echo "Recommendations:"
        echo "- Review and address failed validations if possible"
        echo "- Proceed with caution and enhanced monitoring"
        echo "- Ensure rollback plan is tested and ready"
        return 1
    else
        print_error "❌ MIGRATION NOT READY: Critical issues detected"
        echo ""
        echo "Recommendations:"
        echo "- Address all failed validations before proceeding"
        echo "- Re-run validation after fixes"
        echo "- Do not proceed with production cutover"
        return 2
    fi
}

# Main execution
main() {
    echo "SageInsure AKS Migration Validation"
    echo "=================================="
    echo "Starting comprehensive validation..."
    echo ""
    
    validate_infrastructure
    echo ""
    
    validate_networking
    echo ""
    
    validate_security
    echo ""
    
    validate_aks_cluster
    echo ""
    
    validate_monitoring
    echo ""
    
    validate_applications
    echo ""
    
    validate_performance
    echo ""
    
    validate_backup_dr
    echo ""
    
    generate_report
}

# Run main function
main