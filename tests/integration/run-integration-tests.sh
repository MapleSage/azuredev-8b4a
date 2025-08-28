#!/bin/bash
# Integration Test Runner for SageInsure Application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KUBECONFIG_PATH="${HOME}/.kube/config"
TEST_NAMESPACE="${TEST_NAMESPACE:-default}"
API_BASE_URL="${API_BASE_URL:-http://sageinsure-api.default.svc.cluster.local}"
FRONTEND_URL="${FRONTEND_URL:-http://sageinsure-frontend.default.svc.cluster.local}"
EXTERNAL_API_URL="${EXTERNAL_API_URL:-https://api.sageinsure.local}"

# Test configuration
RUN_SERVICE_TESTS=${RUN_SERVICE_TESTS:-true}
RUN_CONTRACT_TESTS=${RUN_CONTRACT_TESTS:-true}
RUN_API_TESTS=${RUN_API_TESTS:-true}
RUN_CHAOS_TESTS=${RUN_CHAOS_TESTS:-false}

# Test timeouts
TEST_TIMEOUT=${TEST_TIMEOUT:-30m}

echo -e "${BLUE}🧪 Starting SageInsure Integration Tests${NC}"
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
    
    # Check if Go is available
    if ! command -v go &> /dev/null; then
        print_error "Go is not installed or not in PATH"
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

# Function to verify application deployment
verify_deployment() {
    print_status "Verifying application deployment..."
    
    # Check if SageInsure pods are running
    api_pods=$(kubectl get pods -n "$TEST_NAMESPACE" -l app.kubernetes.io/name=sageinsure-api --no-headers 2>/dev/null | wc -l)
    frontend_pods=$(kubectl get pods -n "$TEST_NAMESPACE" -l app.kubernetes.io/name=sageinsure-frontend --no-headers 2>/dev/null | wc -l)
    
    if [ "$api_pods" -eq 0 ]; then
        print_warning "No API pods found in namespace $TEST_NAMESPACE"
    else
        print_status "Found $api_pods API pod(s)"
    fi
    
    if [ "$frontend_pods" -eq 0 ]; then
        print_warning "No frontend pods found in namespace $TEST_NAMESPACE"
    else
        print_status "Found $frontend_pods frontend pod(s)"
    fi
    
    # Check if services are accessible
    print_status "Testing service connectivity..."
    
    # Test API health endpoint
    if kubectl run connectivity-test --image=curlimages/curl --rm -i --restart=Never -n "$TEST_NAMESPACE" -- \
        curl -f -m 10 "$API_BASE_URL/health" &> /dev/null; then
        print_success "API service is accessible"
    else
        print_warning "API service may not be accessible at $API_BASE_URL"
    fi
    
    print_success "Deployment verification completed"
}

# Function to initialize Go modules
initialize_go_modules() {
    print_status "Initializing Go modules for integration tests..."
    
    # Initialize modules for each test package
    test_packages=("service-to-service" "contract" "chaos" "api")
    
    for package in "${test_packages[@]}"; do
        if [ -d "$package" ]; then
            cd "$package"
            
            if [ ! -f "go.mod" ]; then
                print_status "Initializing Go module for $package tests..."
                go mod init "sageinsure-integration-$package" || true
            fi
            
            # Add required dependencies
            go mod tidy
            
            cd ..
        fi
    done
    
    print_success "Go modules initialized"
}

# Function to run service-to-service communication tests
run_service_tests() {
    if [ "$RUN_SERVICE_TESTS" != "true" ]; then
        print_warning "Skipping service-to-service tests (RUN_SERVICE_TESTS=false)"
        return
    fi
    
    print_status "Running service-to-service communication tests..."
    
    cd service-to-service
    
    # Set environment variables for tests
    export KUBECONFIG="$KUBECONFIG_PATH"
    export TEST_NAMESPACE="$TEST_NAMESPACE"
    export API_BASE_URL="$API_BASE_URL"
    export FRONTEND_URL="$FRONTEND_URL"
    
    if go test -v -timeout "$TEST_TIMEOUT" ./communication_test.go; then
        print_success "Service-to-service communication tests passed"
    else
        print_error "Service-to-service communication tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to run contract tests
run_contract_tests() {
    if [ "$RUN_CONTRACT_TESTS" != "true" ]; then
        print_warning "Skipping contract tests (RUN_CONTRACT_TESTS=false)"
        return
    fi
    
    print_status "Running API contract tests..."
    
    cd contract
    
    # Set environment variables for tests
    export API_BASE_URL="$API_BASE_URL"
    
    if go test -v -timeout "$TEST_TIMEOUT" ./api_contract_test.go; then
        print_success "API contract tests passed"
    else
        print_error "API contract tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to run API integration tests
run_api_tests() {
    if [ "$RUN_API_TESTS" != "true" ]; then
        print_warning "Skipping API integration tests (RUN_API_TESTS=false)"
        return
    fi
    
    print_status "Running API integration tests..."
    
    cd api
    
    # Set environment variables for tests
    export API_BASE_URL="$API_BASE_URL"
    
    if go test -v -timeout "$TEST_TIMEOUT" ./api_integration_test.go; then
        print_success "API integration tests passed"
    else
        print_error "API integration tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to run chaos engineering tests
run_chaos_tests() {
    if [ "$RUN_CHAOS_TESTS" != "true" ]; then
        print_warning "Skipping chaos engineering tests (RUN_CHAOS_TESTS=false)"
        return
    fi
    
    print_status "Running chaos engineering tests..."
    print_warning "Chaos tests may cause temporary service disruption"
    
    cd chaos
    
    # Set environment variables for tests
    export KUBECONFIG="$KUBECONFIG_PATH"
    export TEST_NAMESPACE="$TEST_NAMESPACE"
    export API_BASE_URL="$EXTERNAL_API_URL"
    
    if go test -v -timeout "$TEST_TIMEOUT" ./chaos_engineering_test.go; then
        print_success "Chaos engineering tests passed"
    else
        print_error "Chaos engineering tests failed"
        cd ..
        exit 1
    fi
    
    cd ..
}

# Function to generate test report
generate_report() {
    print_status "Generating integration test report..."
    
    REPORT_FILE="integration-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# SageInsure Integration Test Report

**Date:** $(date)
**Environment:** $TEST_NAMESPACE
**API Base URL:** $API_BASE_URL
**Frontend URL:** $FRONTEND_URL

## Test Configuration
- Service-to-Service Tests: $RUN_SERVICE_TESTS
- Contract Tests: $RUN_CONTRACT_TESTS
- API Integration Tests: $RUN_API_TESTS
- Chaos Engineering Tests: $RUN_CHAOS_TESTS
- Test Timeout: $TEST_TIMEOUT

## Test Results

### Service-to-Service Communication Tests
EOF

    if [ "$RUN_SERVICE_TESTS" = "true" ]; then
        echo "✅ PASSED - All service communication tests completed successfully" >> "$REPORT_FILE"
    else
        echo "⏭️ SKIPPED" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### API Contract Tests
EOF

    if [ "$RUN_CONTRACT_TESTS" = "true" ]; then
        echo "✅ PASSED - All API contract tests completed successfully" >> "$REPORT_FILE"
    else
        echo "⏭️ SKIPPED" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### API Integration Tests
EOF

    if [ "$RUN_API_TESTS" = "true" ]; then
        echo "✅ PASSED - All API integration tests completed successfully" >> "$REPORT_FILE"
    else
        echo "⏭️ SKIPPED" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

### Chaos Engineering Tests
EOF

    if [ "$RUN_CHAOS_TESTS" = "true" ]; then
        echo "✅ PASSED - All chaos engineering tests completed successfully" >> "$REPORT_FILE"
    else
        echo "⏭️ SKIPPED" >> "$REPORT_FILE"
    fi

    cat >> "$REPORT_FILE" << EOF

## System Information
- Kubernetes Version: $(kubectl version --short --client 2>/dev/null || echo "Unknown")
- Cluster Info: $(kubectl cluster-info 2>/dev/null | head -1 || echo "Unknown")
- Namespace: $TEST_NAMESPACE
- API Pods: $(kubectl get pods -n "$TEST_NAMESPACE" -l app.kubernetes.io/name=sageinsure-api --no-headers 2>/dev/null | wc -l)
- Frontend Pods: $(kubectl get pods -n "$TEST_NAMESPACE" -l app.kubernetes.io/name=sageinsure-frontend --no-headers 2>/dev/null | wc -l)

## Summary
All enabled integration tests completed successfully. The application demonstrates:
- Reliable service-to-service communication
- Stable API contracts
- Comprehensive business workflow functionality
- Resilience under failure conditions (if chaos tests were run)

## Recommendations
- Continue monitoring service communication patterns
- Regularly validate API contracts during development
- Consider running chaos tests in staging environment
- Implement additional business workflow tests as features evolve

---
Generated by SageInsure Integration Test Suite
EOF

    print_success "Integration test report generated: $REPORT_FILE"
}

# Function to cleanup test resources
cleanup() {
    print_status "Cleaning up test resources..."
    
    # Remove any test pods that might be left behind
    kubectl delete pods -l test=integration --ignore-not-found=true -n "$TEST_NAMESPACE" &> /dev/null || true
    kubectl delete pods -l chaos-test --ignore-not-found=true -n "$TEST_NAMESPACE" &> /dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "Integration Test Configuration:"
    echo "- Namespace: $TEST_NAMESPACE"
    echo "- API Base URL: $API_BASE_URL"
    echo "- Frontend URL: $FRONTEND_URL"
    echo "- Service Tests: $RUN_SERVICE_TESTS"
    echo "- Contract Tests: $RUN_CONTRACT_TESTS"
    echo "- API Tests: $RUN_API_TESTS"
    echo "- Chaos Tests: $RUN_CHAOS_TESTS"
    echo "- Test Timeout: $TEST_TIMEOUT"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Verify deployment
    verify_deployment
    
    # Initialize Go modules
    initialize_go_modules
    
    # Run tests
    run_service_tests
    run_contract_tests
    run_api_tests
    run_chaos_tests
    
    # Generate report
    generate_report
    
    # Cleanup
    cleanup
    
    print_success "All integration tests completed successfully! 🎉"
}

# Handle script interruption
trap cleanup EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --service-only)
            RUN_SERVICE_TESTS=true
            RUN_CONTRACT_TESTS=false
            RUN_API_TESTS=false
            RUN_CHAOS_TESTS=false
            shift
            ;;
        --contract-only)
            RUN_SERVICE_TESTS=false
            RUN_CONTRACT_TESTS=true
            RUN_API_TESTS=false
            RUN_CHAOS_TESTS=false
            shift
            ;;
        --api-only)
            RUN_SERVICE_TESTS=false
            RUN_CONTRACT_TESTS=false
            RUN_API_TESTS=true
            RUN_CHAOS_TESTS=false
            shift
            ;;
        --chaos-only)
            RUN_SERVICE_TESTS=false
            RUN_CONTRACT_TESTS=false
            RUN_API_TESTS=false
            RUN_CHAOS_TESTS=true
            shift
            ;;
        --enable-chaos)
            RUN_CHAOS_TESTS=true
            shift
            ;;
        --namespace)
            TEST_NAMESPACE="$2"
            shift 2
            ;;
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --service-only     Run only service-to-service tests"
            echo "  --contract-only    Run only contract tests"
            echo "  --api-only         Run only API integration tests"
            echo "  --chaos-only       Run only chaos engineering tests"
            echo "  --enable-chaos     Enable chaos engineering tests"
            echo "  --namespace NS     Kubernetes namespace (default: default)"
            echo "  --api-url URL      API base URL"
            echo "  --timeout TIME     Test timeout (default: 30m)"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  RUN_SERVICE_TESTS   Enable/disable service tests (default: true)"
            echo "  RUN_CONTRACT_TESTS  Enable/disable contract tests (default: true)"
            echo "  RUN_API_TESTS      Enable/disable API tests (default: true)"
            echo "  RUN_CHAOS_TESTS    Enable/disable chaos tests (default: false)"
            echo "  TEST_NAMESPACE     Kubernetes namespace"
            echo "  API_BASE_URL       API base URL"
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