#!/bin/bash
# Blue-Green Deployment Script for SageInsure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-default}"
APP_NAME="${APP_NAME:-sageinsure-api}"
NEW_IMAGE="${NEW_IMAGE}"
TIMEOUT="${TIMEOUT:-300}"
VERIFICATION_TIMEOUT="${VERIFICATION_TIMEOUT:-120}"

# Deployment configuration
BLUE_DEPLOYMENT="${APP_NAME}-blue"
GREEN_DEPLOYMENT="${APP_NAME}-green"
ACTIVE_SERVICE="${APP_NAME}-active"

echo -e "${BLUE}🔄 Starting Blue-Green Deployment for ${APP_NAME}${NC}"
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
    
    if [ -z "$NEW_IMAGE" ]; then
        print_error "NEW_IMAGE environment variable is required"
        echo "Usage: NEW_IMAGE=sageinsureacr.azurecr.io/sageinsure-api:v1.2.3 $0"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to get current active color
get_active_color() {
    local active_color
    active_color=$(kubectl get service "$ACTIVE_SERVICE" -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.sageinsure\.io/active-color}' 2>/dev/null || echo "blue")
    echo "$active_color"
}

# Function to get inactive color
get_inactive_color() {
    local active_color="$1"
    if [ "$active_color" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Function to wait for deployment rollout
wait_for_rollout() {
    local deployment="$1"
    local timeout="$2"
    
    print_status "Waiting for deployment $deployment to be ready..."
    
    if kubectl rollout status deployment "$deployment" -n "$NAMESPACE" --timeout="${timeout}s"; then
        print_success "Deployment $deployment is ready"
        return 0
    else
        print_error "Deployment $deployment failed to become ready within ${timeout}s"
        return 1
    fi
}

# Function to run health checks
run_health_checks() {
    local service="$1"
    local max_attempts=10
    local attempt=1
    
    print_status "Running health checks for service $service..."
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Health check attempt $attempt/$max_attempts"
        
        # Run health check using a temporary pod
        if kubectl run health-check-$$-$attempt \
            --image=curlimages/curl \
            --rm -i --restart=Never \
            --timeout=30s \
            -n "$NAMESPACE" \
            -- curl -f -m 10 "http://$service.$NAMESPACE.svc.cluster.local/health" &> /dev/null; then
            
            print_success "Health check passed for $service"
            return 0
        fi
        
        print_warning "Health check failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    print_error "Health checks failed after $max_attempts attempts"
    return 1
}

# Function to run verification tests
run_verification_tests() {
    local service="$1"
    
    print_status "Running verification tests for service $service..."
    
    # Test 1: Basic health check
    if ! run_health_checks "$service"; then
        return 1
    fi
    
    # Test 2: API functionality test
    print_status "Testing API functionality..."
    if kubectl run api-test-$$-func \
        --image=curlimages/curl \
        --rm -i --restart=Never \
        --timeout=60s \
        -n "$NAMESPACE" \
        -- curl -f -m 30 -X POST \
        -H "Content-Type: application/json" \
        -d '{"test": true}' \
        "http://$service.$NAMESPACE.svc.cluster.local/health" &> /dev/null; then
        
        print_success "API functionality test passed"
    else
        print_warning "API functionality test failed (may be expected for health endpoint)"
    fi
    
    # Test 3: Database connectivity test
    print_status "Testing database connectivity..."
    if kubectl run db-test-$$-conn \
        --image=curlimages/curl \
        --rm -i --restart=Never \
        --timeout=30s \
        -n "$NAMESPACE" \
        -- curl -f -m 10 "http://$service.$NAMESPACE.svc.cluster.local/health/database" &> /dev/null; then
        
        print_success "Database connectivity test passed"
    else
        print_warning "Database connectivity test failed"
    fi
    
    print_success "Verification tests completed"
    return 0
}

# Function to switch traffic
switch_traffic() {
    local new_active_color="$1"
    local old_active_color="$2"
    
    print_status "Switching traffic from $old_active_color to $new_active_color..."
    
    # Update the active service selector
    kubectl patch service "$ACTIVE_SERVICE" -n "$NAMESPACE" \
        -p "{\"spec\":{\"selector\":{\"deployment-color\":\"$new_active_color\"}}}"
    
    # Update the active color annotation
    kubectl annotate service "$ACTIVE_SERVICE" -n "$NAMESPACE" \
        "deployment.sageinsure.io/active-color=$new_active_color" --overwrite
    
    # Update the last switch timestamp
    kubectl annotate service "$ACTIVE_SERVICE" -n "$NAMESPACE" \
        "deployment.sageinsure.io/last-switch=$(date -u +%Y-%m-%dT%H:%M:%SZ)" --overwrite
    
    print_success "Traffic switched to $new_active_color environment"
}

# Function to rollback deployment
rollback_deployment() {
    local rollback_color="$1"
    local failed_color="$2"
    
    print_error "Deployment verification failed, initiating rollback..."
    
    # Switch traffic back
    switch_traffic "$rollback_color" "$failed_color"
    
    # Scale down the failed deployment
    kubectl scale deployment "${APP_NAME}-${failed_color}" -n "$NAMESPACE" --replicas=0
    
    print_success "Rollback completed - traffic restored to $rollback_color environment"
}

# Function to cleanup old deployment
cleanup_old_deployment() {
    local old_color="$1"
    
    print_status "Scaling down old $old_color deployment..."
    kubectl scale deployment "${APP_NAME}-${old_color}" -n "$NAMESPACE" --replicas=0
    
    print_success "Old $old_color deployment scaled down"
}

# Function to create deployment event
create_deployment_event() {
    local event_type="$1"
    local message="$2"
    
    kubectl create event \
        --namespace="$NAMESPACE" \
        --type="$event_type" \
        --reason="BlueGreenDeployment" \
        --message="$message" \
        --source="blue-green-deploy.sh" \
        --field-selector="involvedObject.name=$APP_NAME" || true
}

# Main deployment function
main() {
    echo "Blue-Green Deployment Configuration:"
    echo "- Namespace: $NAMESPACE"
    echo "- Application: $APP_NAME"
    echo "- New Image: $NEW_IMAGE"
    echo "- Timeout: ${TIMEOUT}s"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Get current active environment
    local active_color
    active_color=$(get_active_color)
    local inactive_color
    inactive_color=$(get_inactive_color "$active_color")
    
    print_status "Current active environment: $active_color"
    print_status "Deploying to inactive environment: $inactive_color"
    
    # Create deployment start event
    create_deployment_event "Normal" "Starting blue-green deployment to $inactive_color environment with image $NEW_IMAGE"
    
    # Update the inactive deployment with new image
    print_status "Updating $inactive_color deployment with new image..."
    kubectl set image deployment "${APP_NAME}-${inactive_color}" \
        api="$NEW_IMAGE" -n "$NAMESPACE"
    
    # Scale up the inactive deployment
    print_status "Scaling up $inactive_color deployment..."
    kubectl scale deployment "${APP_NAME}-${inactive_color}" -n "$NAMESPACE" --replicas=3
    
    # Wait for deployment to be ready
    if ! wait_for_rollout "${APP_NAME}-${inactive_color}" "$TIMEOUT"; then
        print_error "Deployment failed to become ready"
        create_deployment_event "Warning" "Deployment to $inactive_color environment failed - rollout timeout"
        exit 1
    fi
    
    # Run verification tests
    if ! timeout "$VERIFICATION_TIMEOUT" bash -c "run_verification_tests '${APP_NAME}-${inactive_color}'"; then
        print_error "Verification tests failed"
        create_deployment_event "Warning" "Deployment to $inactive_color environment failed - verification tests failed"
        
        # Scale down failed deployment
        kubectl scale deployment "${APP_NAME}-${inactive_color}" -n "$NAMESPACE" --replicas=0
        exit 1
    fi
    
    # Switch traffic to new deployment
    switch_traffic "$inactive_color" "$active_color"
    
    # Wait a moment and verify the switch worked
    sleep 10
    if ! run_health_checks "$ACTIVE_SERVICE"; then
        print_error "Health checks failed after traffic switch"
        rollback_deployment "$active_color" "$inactive_color"
        create_deployment_event "Warning" "Deployment failed - automatic rollback completed"
        exit 1
    fi
    
    # Cleanup old deployment
    cleanup_old_deployment "$active_color"
    
    # Create success event
    create_deployment_event "Normal" "Blue-green deployment completed successfully - active environment is now $inactive_color"
    
    print_success "Blue-Green deployment completed successfully! 🎉"
    print_success "Active environment is now: $inactive_color"
    print_success "New image deployed: $NEW_IMAGE"
}

# Handle script interruption
cleanup_on_exit() {
    print_warning "Script interrupted, cleaning up..."
    # Kill any background health check pods
    kubectl delete pods -l "run=health-check-$$" -n "$NAMESPACE" --ignore-not-found=true &> /dev/null || true
    kubectl delete pods -l "run=api-test-$$" -n "$NAMESPACE" --ignore-not-found=true &> /dev/null || true
    kubectl delete pods -l "run=db-test-$$" -n "$NAMESPACE" --ignore-not-found=true &> /dev/null || true
}

trap cleanup_on_exit EXIT

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            NEW_IMAGE="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --app)
            APP_NAME="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --image IMAGE      New container image to deploy (required)"
            echo "  --namespace NS     Kubernetes namespace (default: default)"
            echo "  --app APP          Application name (default: sageinsure-api)"
            echo "  --timeout SECONDS  Deployment timeout (default: 300)"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  NEW_IMAGE          New container image to deploy"
            echo "  NAMESPACE          Kubernetes namespace"
            echo "  APP_NAME           Application name"
            echo "  TIMEOUT            Deployment timeout in seconds"
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