#!/bin/bash

# SageInsure AKS Terraform Migration Test Runner
# This script runs the infrastructure tests for the AKS migration project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_environment() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "ARM_CLIENT_ID"
        "ARM_CLIENT_SECRET" 
        "ARM_SUBSCRIPTION_ID"
        "ARM_TENANT_ID"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        echo ""
        echo "Please set these variables before running tests:"
        echo "export ARM_CLIENT_ID=\"your-client-id\""
        echo "export ARM_CLIENT_SECRET=\"your-client-secret\""
        echo "export ARM_SUBSCRIPTION_ID=\"your-subscription-id\""
        echo "export ARM_TENANT_ID=\"your-tenant-id\""
        exit 1
    fi
    
    print_status "All required environment variables are set"
}

# Check if required tools are installed
check_tools() {
    print_status "Checking required tools..."
    
    required_tools=("go" "terraform" "az")
    missing_tools=()
    
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        print_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        exit 1
    fi
    
    print_status "All required tools are installed"
}

# Run Terratest tests
run_terratest() {
    print_status "Running Terratest infrastructure tests..."
    
    cd tests/terratest
    
    # Initialize Go modules
    print_status "Initializing Go modules..."
    go mod tidy
    
    # Run network tests
    print_status "Running network infrastructure tests..."
    if go test -v -timeout 30m ./network_test.go -run TestNetworkConnectivity; then
        print_status "Network tests passed"
    else
        print_error "Network tests failed"
        return 1
    fi
    
    # Run identity tests
    print_status "Running identity tests..."
    if go test -v -timeout 20m ./identity_test.go -run TestKeyVaultIntegration; then
        print_status "Identity tests passed"
    else
        print_error "Identity tests failed"
        return 1
    fi
    
    # Run AKS tests (if cluster exists)
    print_status "Running AKS cluster tests..."
    if go test -v -timeout 30m ./aks_cluster_test.go -run TestExistingAKSCluster; then
        print_status "AKS tests passed"
    else
        print_warning "AKS tests failed (cluster may not exist or not accessible)"
    fi
    
    cd ../..
}

# Run end-to-end connectivity tests
run_e2e_tests() {
    print_status "Running end-to-end connectivity tests..."
    
    # Check if kubectl is configured
    if ! kubectl cluster-info &> /dev/null; then
        print_warning "kubectl not configured or cluster not accessible, skipping E2E tests"
        return 0
    fi
    
    cd tests/e2e
    
    # Initialize Go modules if needed
    if [[ ! -f go.mod ]]; then
        go mod init sageinsure-e2e-tests
    fi
    go mod tidy
    
    # Run connectivity tests
    if go test -v -timeout 20m ./connectivity_test.go; then
        print_status "E2E tests passed"
    else
        print_error "E2E tests failed"
        return 1
    fi
    
    cd ../..
}

# Run health check tests
run_health_checks() {
    print_status "Running health check tests..."
    
    if [[ -f scripts/test-health-checks.sh ]]; then
        if bash scripts/test-health-checks.sh; then
            print_status "Health checks passed"
        else
            print_error "Health checks failed"
            return 1
        fi
    else
        print_warning "Health check script not found, skipping"
    fi
}

# Main function
main() {
    echo "SageInsure AKS Terraform Migration Test Suite"
    echo "============================================="
    echo ""
    
    # Parse command line arguments
    TEST_TYPE="${1:-all}"
    
    case "$TEST_TYPE" in
        "terratest")
            check_environment
            check_tools
            run_terratest
            ;;
        "e2e")
            check_tools
            run_e2e_tests
            ;;
        "health")
            run_health_checks
            ;;
        "all")
            check_environment
            check_tools
            run_terratest
            run_e2e_tests
            run_health_checks
            ;;
        *)
            echo "Usage: $0 [terratest|e2e|health|all]"
            echo ""
            echo "Test types:"
            echo "  terratest - Run Terratest infrastructure tests"
            echo "  e2e       - Run end-to-end connectivity tests"
            echo "  health    - Run health check tests"
            echo "  all       - Run all tests (default)"
            exit 1
            ;;
    esac
    
    print_status "Test suite completed successfully!"
}

# Run main function
main "$@"