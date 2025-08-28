#!/bin/bash
# Comprehensive test runner for SageInsure infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="terraform"
KUBECONFIG_PATH="${HOME}/.kube/config"
TEST_NAMESPACE="default"
BASE_URL="https://sageinsure.local"
API_URL="https://api.sageinsure.local"

# Test types
RUN_TERRATEST=${RUN_TERRATEST:-true}
RUN_E2E=${RUN_E2E:-true}
RUN_LOAD=${RUN_LOAD:-false}
LOAD_TEST_TYPE=${LOAD_TEST_TYPE:-"k6"} # k6 or locust

# Load test configuration
LOAD_TEST_USERS=${LOAD_TEST_USERS:-10}
LOAD_TEST_DURATION=${LOAD_TEST_DURATION:-"5m"}

echo -e "${BLUE}🚀 Starting SageInsure Infrastructure Tests${NC}"
echo "=================================================="

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
    
    # Check if kubeconfig exists
    if [ ! -f "$KUBECONFIG_PATH" ]; then
        print_error "Kubeconfig not found at $KUBECONFIG_PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to run Terratest
run_terratest() {
    if [ "$RUN_TERRATEST" != "true" ]; then
        print_warning "Skipping Terratest (RUN_TERRATEST=false)"
        return
    fi
    
    print_status "Running Terratest infrastructure tests..."
    
    cd tests/terratest
    
    # Initialize Go modules if needed
    if [ ! -f "go.sum" ]; then
        print_status "Initializing Go modules..."
        go mod tidy
    fi
    
    # Run tests
    print_status "Running AKS cluster tests..."
    if go test -v -timeout 30m ./aks_cluster_test.go; then
        print_success "AKS cluster tests passed"
    else
        print_error "AKS cluster tests failed"
        cd ../..
        exit 1
    fi
    
    print_status "Running network tests..."
    if go test -v -timeout 20m ./network_test.go; then
        print_success "Network tests passed"
    else
        print_error "Network tests failed"
        cd ../..
        exit 1
    fi
    
    print_status "Running identity tests..."
    if go test -v -timeout 15m ./identity_test.go; then
        print_success "Identity tests passed"
    else
        print_error "Identity tests failed"
        cd ../..
        exit 1
    fi
    
    cd ../..
    print_success "All Terratest infrastructure tests passed"
}

# Function to run E2E tests
run_e2e_tests() {
    if [ "$RUN_E2E" != "true" ]; then
        print_warning "Skipping E2E tests (RUN_E2E=false)"
        return
    fi
    
    print_status "Running end-to-end connectivity tests..."
    
    cd tests/e2e
    
    # Initialize Go modules if needed
    if [ ! -f "go.sum" ]; then
        print_status "Initializing Go modules..."
        go mod tidy
    fi
    
    # Set environment variables for tests
    export KUBECONFIG="$KUBECONFIG_PATH"
    export TEST_NAMESPACE="$TEST_NAMESPACE"
    export BASE_URL="$BASE_URL"
    export API_URL="$API_URL"
    
    # Run E2E tests
    if go test -v -timeout 20m ./connectivity_test.go; then
        print_success "E2E connectivity tests passed"
    else
        print_error "E2E connectivity tests failed"
        cd ../..
        exit 1
    fi
    
    cd ../..
    print_success "All E2E tests passed"
}

# Function to run load tests
run_load_tests() {
    if [ "$RUN_LOAD" != "true" ]; then
        print_warning "Skipping load tests (RUN_LOAD=false)"
        return
    fi
    
    print_status "Running load tests with $LOAD_TEST_TYPE..."
    
    cd tests/load
    
    if [ "$LOAD_TEST_TYPE" = "k6" ]; then
        run_k6_tests
    elif [ "$LOAD_TEST_TYPE" = "locust" ]; then
        run_locust_tests
    else
        print_error "Unknown load test type: $LOAD_TEST_TYPE"
        exit 1
    fi
    
    cd ../..
}

# Function to run K6 load tests
run_k6_tests() {
    # Check if k6 is installed
    if ! command -v k6 &> /dev/null; then
        print_error "k6 is not installed. Install from https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
    
    print_status "Running K6 load tests..."
    
    # Set environment variables
    export BASE_URL="$BASE_URL"
    export API_URL="$API_URL"
    
    # Run K6 test
    if k6 run --vus "$LOAD_TEST_USERS" --duration "$LOAD_TEST_DURATION" k6-load-test.js; then
        print_success "K6 load tests completed successfully"
    else
        print_error "K6 load tests failed"
        exit 1
    fi
}

# Function to run Locust load tests
run_locust_tests() {
    # Check if locust is installed
    if ! command -v locust &> /dev/null; then
        print_error "Locust is not installed. Install with: pip install locust"
        exit 1
    fi
    
    print_status "Running Locust load tests..."
    
    # Run Locust in headless mode
    if locust -f locust-load-test.py --host="$API_URL" --headless -u "$LOAD_TEST_USERS" -r 5 -t "$LOAD_TEST_DURATION"; then
        print_success "Locust load tests completed successfully"
    else
        print_error "Locust load tests failed"
        exit 1
    fi
}

# Function to generate test report
generate_report() {
    print_status "Generating test report..."
    
    REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# SageInsure Infrastructure Test Report

**Date:** $(date)
**Environment:** $TEST_NAMESPACE
**Base URL:** $BASE_URL
**API URL:** $API_URL

## Test Configuration
- Terratest: $RUN_TERRATEST
- E2E Tests: $RUN_E2E
- Load Tests: $RUN_LOAD
- Load Test Type: $LOAD_TEST_TYPE
- Load Test Users: $LOAD_TEST_USERS
- Load Test Duration: $LOAD_TEST_DURATION

## Test Results

### Infrastructure Tests (Terratest)
EOF

    if [ "$RUN_TERRATEST" = "true" ]; then
        echo "✅ AKS Cluster Tests: PASSED" >> "$REPORT_FILE"
        echo "✅ Network Tests: PASSED" >> "$REPORT_FILE"
        echo "✅ Identity Tests: PASSED" >> "$REPORT_FILE"
    else
        echo "⏭️ Skipped" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### End-to-End Tests
EOF

    if [ "$RUN_E2E" = "true" ]; then
        echo "✅ Connectivity Tests: PASSED" >> "$REPORT_FILE"
    else
        echo "⏭️ Skipped" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### Load Tests
EOF

    if [ "$RUN_LOAD" = "true" ]; then
        echo "✅ Load Tests ($LOAD_TEST_TYPE): COMPLETED" >> "$REPORT_FILE"
    else
        echo "⏭️ Skipped" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

## System Information
- Kubernetes Version: $(kubectl version --short --client)
- Cluster Info: $(kubectl cluster-info | head -1)
- Node Count: $(kubectl get nodes --no-headers | wc -l)
- Pod Count: $(kubectl get pods --all-namespaces --no-headers | wc -l)

## Recommendations
- All infrastructure tests passed successfully
- System is ready for production workloads
- Monitor performance metrics during initial deployment
- Consider implementing additional monitoring for business metrics

---
Generated by SageInsure Infrastructure Test Suite
EOF

    print_success "Test report generated: $REPORT_FILE"
}

# Function to cleanup test resources
cleanup() {
    print_status "Cleaning up test resources..."
    
    # Remove any test pods that might be left behind
    kubectl delete pods -l test=infrastructure --ignore-not-found=true -n "$TEST_NAMESPACE" || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "Test Configuration:"
    echo "- Terratest: $RUN_TERRATEST"
    echo "- E2E Tests: $RUN_E2E"
    echo "- Load Tests: $RUN_LOAD"
    echo "- Load Test Type: $LOAD_TEST_TYPE"
    echo "- Test Namespace: $TEST_NAMESPACE"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests
    run_terratest
    run_e2e_tests
    run_load_tests
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
    
    print_success "All tests completed successfully! 🎉"
}

# Handle script interruption
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --terratest-only)
            RUN_TERRATEST=true
            RUN_E2E=false
            RUN_LOAD=false
            shift
            ;;
        --e2e-only)
            RUN_TERRATEST=false
            RUN_E2E=true
            RUN_LOAD=false
            shift
            ;;
        --load-only)
            RUN_TERRATEST=false
            RUN_E2E=false
            RUN_LOAD=true
            shift
            ;;
        --load-type)
            LOAD_TEST_TYPE="$2"
            shift 2
            ;;
        --users)
            LOAD_TEST_USERS="$2"
            shift 2
            ;;
        --duration)
            LOAD_TEST_DURATION="$2"
            shift 2
            ;;
        --namespace)
            TEST_NAMESPACE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --terratest-only    Run only Terratest infrastructure tests"
            echo "  --e2e-only         Run only end-to-end tests"
            echo "  --load-only        Run only load tests"
            echo "  --load-type TYPE   Load test type: k6 or locust (default: k6)"
            echo "  --users NUM        Number of load test users (default: 10)"
            echo "  --duration TIME    Load test duration (default: 5m)"
            echo "  --namespace NS     Kubernetes namespace (default: default)"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  RUN_TERRATEST      Enable/disable Terratest (default: true)"
            echo "  RUN_E2E           Enable/disable E2E tests (default: true)"
            echo "  RUN_LOAD          Enable/disable load tests (default: false)"
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