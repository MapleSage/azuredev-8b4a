#!/bin/bash
# SageInsure Deployment Script
# Supports multiple deployment strategies: rolling, blue-green, canary

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_STRATEGY=${DEPLOYMENT_STRATEGY:-"rolling"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
NAMESPACE=${NAMESPACE:-"default"}
APP_NAME="sageinsure-api"
REGISTRY="sageinsureacr.azurecr.io"
TIMEOUT=${TIMEOUT:-"600s"}
DRY_RUN=${DRY_RUN:-false}
AUTO_PROMOTE=${AUTO_PROMOTE:-false}

# Rollback configuration
ROLLBACK=${ROLLBACK:-false}
ROLLBACK_REVISION=${ROLLBACK_REVISION:-""}

echo -e "${BLUE}🚀 SageInsure Deployment Script${NC}"
echo "=================================="

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
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if Argo Rollouts is available for advanced strategies
    if [[ "$DEPLOYMENT_STRATEGY" == "blue-green" || "$DEPLOYMENT_STRATEGY" == "canary" ]]; then
        if ! kubectl get crd rollouts.argoproj.io &> /dev/null; then
            print_error "Argo Rollouts CRD not found. Please install Argo Rollouts for $DEPLOYMENT_STRATEGY deployments"
            exit 1
        fi
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace $NAMESPACE does not exist, creating it..."
        kubectl create namespace "$NAMESPACE"
    fi
    
    print_success "Prerequisites check passed"
}

# Function to validate image
validate_image() {
    print_status "Validating image: $REGISTRY/$APP_NAME:$IMAGE_TAG"
    
    # Check if image exists in registry (this would require registry access)
    # For now, we'll just validate the tag format
    if [[ "$IMAGE_TAG" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        print_success "Image tag validation passed"
    else
        print_error "Invalid image tag format: $IMAGE_TAG"
        exit 1
    fi
}

# Function to perform rollback
perform_rollback() {
    print_status "Performing rollback for $DEPLOYMENT_STRATEGY deployment..."
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            if [[ -n "$ROLLBACK_REVISION" ]]; then
                kubectl rollout undo deployment/$APP_NAME-rolling -n "$NAMESPACE" --to-revision="$ROLLBACK_REVISION"
            else
                kubectl rollout undo deployment/$APP_NAME-rolling -n "$NAMESPACE"
            fi
            kubectl rollout status deployment/$APP_NAME-rolling -n "$NAMESPACE" --timeout="$TIMEOUT"
            ;;
        "blue-green")
            kubectl argo rollouts abort $APP_NAME-blue-green -n "$NAMESPACE" || true
            if [[ -n "$ROLLBACK_REVISION" ]]; then
                kubectl argo rollouts undo $APP_NAME-blue-green -n "$NAMESPACE" --to-revision="$ROLLBACK_REVISION"
            else
                kubectl argo rollouts undo $APP_NAME-blue-green -n "$NAMESPACE"
            fi
            ;;
        "canary")
            kubectl argo rollouts abort $APP_NAME-canary -n "$NAMESPACE" || true
            if [[ -n "$ROLLBACK_REVISION" ]]; then
                kubectl argo rollouts undo $APP_NAME-canary -n "$NAMESPACE" --to-revision="$ROLLBACK_REVISION"
            else
                kubectl argo rollouts undo $APP_NAME-canary -n "$NAMESPACE"
            fi
            ;;
        *)
            print_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
    
    print_success "Rollback completed"
}

# Function to deploy using rolling strategy
deploy_rolling() {
    print_status "Deploying using rolling update strategy..."
    
    # Update the deployment manifest with new image
    local manifest_file="../rolling/rolling-deployment.yaml"
    local temp_manifest="/tmp/rolling-deployment-${IMAGE_TAG}.yaml"
    
    # Replace image tag in manifest
    sed "s|image: sageinsureacr.azurecr.io/sageinsure-api:latest|image: $REGISTRY/$APP_NAME:$IMAGE_TAG|g" "$manifest_file" > "$temp_manifest"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Dry run mode - showing what would be applied:"
        kubectl apply -f "$temp_manifest" -n "$NAMESPACE" --dry-run=client
        return
    fi
    
    # Apply the deployment
    kubectl apply -f "$temp_manifest" -n "$NAMESPACE"
    
    # Wait for rollout to complete
    print_status "Waiting for rollout to complete..."
    kubectl rollout status deployment/$APP_NAME-rolling -n "$NAMESPACE" --timeout="$TIMEOUT"
    
    # Verify deployment
    verify_deployment "$APP_NAME-rolling" "deployment"
    
    # Cleanup temp file
    rm -f "$temp_manifest"
}

# Function to deploy using blue-green strategy
deploy_blue_green() {
    print_status "Deploying using blue-green strategy..."
    
    # Update the rollout manifest with new image
    local manifest_file="../blue-green/blue-green-deployment.yaml"
    local temp_manifest="/tmp/blue-green-deployment-${IMAGE_TAG}.yaml"
    
    # Replace image tag in manifest
    sed "s|image: sageinsureacr.azurecr.io/sageinsure-api:latest|image: $REGISTRY/$APP_NAME:$IMAGE_TAG|g" "$manifest_file" > "$temp_manifest"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Dry run mode - showing what would be applied:"
        kubectl apply -f "$temp_manifest" -n "$NAMESPACE" --dry-run=client
        return
    fi
    
    # Apply the rollout
    kubectl apply -f "$temp_manifest" -n "$NAMESPACE"
    
    # Wait for rollout to reach the promotion point
    print_status "Waiting for blue-green deployment to be ready for promotion..."
    kubectl argo rollouts get rollout $APP_NAME-blue-green -n "$NAMESPACE" --watch
    
    # Auto-promote if enabled
    if [[ "$AUTO_PROMOTE" == "true" ]]; then
        print_status "Auto-promoting blue-green deployment..."
        kubectl argo rollouts promote $APP_NAME-blue-green -n "$NAMESPACE"
    else
        print_warning "Blue-green deployment is ready for manual promotion"
        print_status "To promote: kubectl argo rollouts promote $APP_NAME-blue-green -n $NAMESPACE"
    fi
    
    # Verify deployment
    verify_deployment "$APP_NAME-blue-green" "rollout"
    
    # Cleanup temp file
    rm -f "$temp_manifest"
}

# Function to deploy using canary strategy
deploy_canary() {
    print_status "Deploying using canary strategy..."
    
    # Update the rollout manifest with new image
    local manifest_file="../canary/canary-deployment.yaml"
    local temp_manifest="/tmp/canary-deployment-${IMAGE_TAG}.yaml"
    
    # Replace image tag in manifest
    sed "s|image: sageinsureacr.azurecr.io/sageinsure-api:latest|image: $REGISTRY/$APP_NAME:$IMAGE_TAG|g" "$manifest_file" > "$temp_manifest"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Dry run mode - showing what would be applied:"
        kubectl apply -f "$temp_manifest" -n "$NAMESPACE" --dry-run=client
        return
    fi
    
    # Apply the rollout
    kubectl apply -f "$temp_manifest" -n "$NAMESPACE"
    
    # Watch the canary deployment progress
    print_status "Watching canary deployment progress..."
    kubectl argo rollouts get rollout $APP_NAME-canary -n "$NAMESPACE" --watch
    
    # Verify deployment
    verify_deployment "$APP_NAME-canary" "rollout"
    
    # Cleanup temp file
    rm -f "$temp_manifest"
}

# Function to verify deployment
verify_deployment() {
    local resource_name=$1
    local resource_type=$2
    
    print_status "Verifying deployment: $resource_name"
    
    # Check pod status
    local pods
    if [[ "$resource_type" == "deployment" ]]; then
        pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api,deployment.strategy=rolling --no-headers)
    else
        pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api --no-headers)
    fi
    
    if [[ -z "$pods" ]]; then
        print_error "No pods found for $resource_name"
        exit 1
    fi
    
    # Check if all pods are running
    local running_pods
    running_pods=$(echo "$pods" | grep -c "Running" || true)
    local total_pods
    total_pods=$(echo "$pods" | wc -l)
    
    print_status "Pod status: $running_pods/$total_pods running"
    
    if [[ "$running_pods" -eq "$total_pods" ]]; then
        print_success "All pods are running"
    else
        print_warning "Not all pods are running yet"
        kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api
    fi
    
    # Test service connectivity
    print_status "Testing service connectivity..."
    local service_name
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            service_name="$APP_NAME-rolling"
            ;;
        "blue-green")
            service_name="$APP_NAME-active"
            ;;
        "canary")
            service_name="$APP_NAME-stable"
            ;;
    esac
    
    # Test internal connectivity
    if kubectl run connectivity-test --image=curlimages/curl --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f -m 10 "http://$service_name.$NAMESPACE.svc.cluster.local/health" &> /dev/null; then
        print_success "Service connectivity test passed"
    else
        print_warning "Service connectivity test failed or service not ready yet"
    fi
}

# Function to show deployment status
show_status() {
    print_status "Current deployment status:"
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" -o wide
            kubectl rollout history deployment/$APP_NAME-rolling -n "$NAMESPACE"
            ;;
        "blue-green")
            kubectl argo rollouts get rollout $APP_NAME-blue-green -n "$NAMESPACE"
            ;;
        "canary")
            kubectl argo rollouts get rollout $APP_NAME-canary -n "$NAMESPACE"
            ;;
    esac
    
    print_status "Pod status:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api
    
    print_status "Service status:"
    kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api
}

# Main deployment function
main() {
    echo "Deployment Configuration:"
    echo "- Strategy: $DEPLOYMENT_STRATEGY"
    echo "- Image Tag: $IMAGE_TAG"
    echo "- Namespace: $NAMESPACE"
    echo "- Registry: $REGISTRY"
    echo "- Timeout: $TIMEOUT"
    echo "- Dry Run: $DRY_RUN"
    echo "- Auto Promote: $AUTO_PROMOTE"
    echo "- Rollback: $ROLLBACK"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Handle rollback
    if [[ "$ROLLBACK" == "true" ]]; then
        perform_rollback
        return
    fi
    
    # Validate image
    validate_image
    
    # Deploy based on strategy
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            deploy_rolling
            ;;
        "blue-green")
            deploy_blue_green
            ;;
        "canary")
            deploy_canary
            ;;
        *)
            print_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
    
    # Show final status
    show_status
    
    print_success "Deployment completed successfully! 🎉"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strategy)
            DEPLOYMENT_STRATEGY="$2"
            shift 2
            ;;
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --auto-promote)
            AUTO_PROMOTE=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --rollback-revision)
            ROLLBACK_REVISION="$2"
            shift 2
            ;;
        --status)
            show_status
            exit 0
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --strategy STRATEGY        Deployment strategy (rolling|blue-green|canary)"
            echo "  --image-tag TAG           Docker image tag to deploy"
            echo "  --namespace NAMESPACE     Kubernetes namespace"
            echo "  --timeout TIMEOUT        Deployment timeout (default: 600s)"
            echo "  --dry-run                 Show what would be deployed without applying"
            echo "  --auto-promote            Auto-promote blue-green/canary deployments"
            echo "  --rollback                Perform rollback instead of deployment"
            echo "  --rollback-revision REV   Rollback to specific revision"
            echo "  --status                  Show current deployment status"
            echo "  --help                    Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEPLOYMENT_STRATEGY       Deployment strategy (default: rolling)"
            echo "  IMAGE_TAG                Docker image tag (default: latest)"
            echo "  NAMESPACE                Kubernetes namespace (default: default)"
            echo "  TIMEOUT                  Deployment timeout (default: 600s)"
            echo "  DRY_RUN                  Dry run mode (default: false)"
            echo "  AUTO_PROMOTE             Auto-promote deployments (default: false)"
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