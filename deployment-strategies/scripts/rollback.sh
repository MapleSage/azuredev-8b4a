#!/bin/bash
# SageInsure Rollback Script
# Provides automated rollback capabilities for all deployment strategies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_STRATEGY=${DEPLOYMENT_STRATEGY:-"rolling"}
NAMESPACE=${NAMESPACE:-"default"}
APP_NAME="sageinsure-api"
ROLLBACK_REVISION=${ROLLBACK_REVISION:-""}
FORCE_ROLLBACK=${FORCE_ROLLBACK:-false}
TIMEOUT=${TIMEOUT:-"600s"}
DRY_RUN=${DRY_RUN:-false}

echo -e "${RED}🔄 SageInsure Rollback Script${NC}"
echo "=============================="

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
            print_error "Argo Rollouts CRD not found. Cannot rollback $DEPLOYMENT_STRATEGY deployments"
            exit 1
        fi
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to show rollout history
show_history() {
    print_status "Showing deployment history..."
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            if kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" &> /dev/null; then
                echo "Deployment history:"
                kubectl rollout history deployment/$APP_NAME-rolling -n "$NAMESPACE"
            else
                print_error "Rolling deployment not found"
                exit 1
            fi
            ;;
        "blue-green")
            if kubectl get rollout $APP_NAME-blue-green -n "$NAMESPACE" &> /dev/null; then
                echo "Rollout history:"
                kubectl argo rollouts list rollouts -n "$NAMESPACE"
                kubectl argo rollouts get rollout $APP_NAME-blue-green -n "$NAMESPACE"
            else
                print_error "Blue-green rollout not found"
                exit 1
            fi
            ;;
        "canary")
            if kubectl get rollout $APP_NAME-canary -n "$NAMESPACE" &> /dev/null; then
                echo "Rollout history:"
                kubectl argo rollouts list rollouts -n "$NAMESPACE"
                kubectl argo rollouts get rollout $APP_NAME-canary -n "$NAMESPACE"
            else
                print_error "Canary rollout not found"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac
}

# Function to get current deployment status
get_current_status() {
    print_status "Getting current deployment status..."
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            if kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" &> /dev/null; then
                local current_revision
                current_revision=$(kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}')
                local current_image
                current_image=$(kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
                
                echo "Current deployment:"
                echo "  Revision: $current_revision"
                echo "  Image: $current_image"
                echo "  Status: $(kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Progressing")].status}')"
                
                return 0
            else
                print_error "Rolling deployment not found"
                return 1
            fi
            ;;
        "blue-green")
            if kubectl get rollout $APP_NAME-blue-green -n "$NAMESPACE" &> /dev/null; then
                kubectl argo rollouts get rollout $APP_NAME-blue-green -n "$NAMESPACE" --no-color
                return 0
            else
                print_error "Blue-green rollout not found"
                return 1
            fi
            ;;
        "canary")
            if kubectl get rollout $APP_NAME-canary -n "$NAMESPACE" &> /dev/null; then
                kubectl argo rollouts get rollout $APP_NAME-canary -n "$NAMESPACE" --no-color
                return 0
            else
                print_error "Canary rollout not found"
                return 1
            fi
            ;;
    esac
}

# Function to validate rollback revision
validate_rollback_revision() {
    if [[ -z "$ROLLBACK_REVISION" ]]; then
        print_status "No specific revision provided, will rollback to previous version"
        return 0
    fi
    
    print_status "Validating rollback revision: $ROLLBACK_REVISION"
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            # Check if revision exists in deployment history
            if kubectl rollout history deployment/$APP_NAME-rolling -n "$NAMESPACE" --revision="$ROLLBACK_REVISION" &> /dev/null; then
                print_success "Revision $ROLLBACK_REVISION found in deployment history"
                return 0
            else
                print_error "Revision $ROLLBACK_REVISION not found in deployment history"
                return 1
            fi
            ;;
        "blue-green"|"canary")
            # For Argo Rollouts, we'll validate during the actual rollback
            print_status "Revision validation will be performed during rollback"
            return 0
            ;;
    esac
}

# Function to create backup before rollback
create_backup() {
    print_status "Creating backup of current deployment state..."
    
    local backup_dir="/tmp/sageinsure-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            kubectl get deployment $APP_NAME-rolling -n "$NAMESPACE" -o yaml > "$backup_dir/deployment.yaml"
            ;;
        "blue-green")
            kubectl get rollout $APP_NAME-blue-green -n "$NAMESPACE" -o yaml > "$backup_dir/rollout.yaml"
            ;;
        "canary")
            kubectl get rollout $APP_NAME-canary -n "$NAMESPACE" -o yaml > "$backup_dir/rollout.yaml"
            ;;
    esac
    
    # Backup services and configmaps
    kubectl get services -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api -o yaml > "$backup_dir/services.yaml"
    kubectl get configmaps -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api -o yaml > "$backup_dir/configmaps.yaml" || true
    
    print_success "Backup created at: $backup_dir"
    echo "BACKUP_DIR=$backup_dir"
}

# Function to perform rollback
perform_rollback() {
    print_status "Performing rollback for $DEPLOYMENT_STRATEGY deployment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "DRY RUN: Would perform rollback with the following configuration:"
        echo "  Strategy: $DEPLOYMENT_STRATEGY"
        echo "  Namespace: $NAMESPACE"
        echo "  Revision: ${ROLLBACK_REVISION:-"previous"}"
        return 0
    fi
    
    case $DEPLOYMENT_STRATEGY in
        "rolling")
            print_status "Rolling back deployment..."
            if [[ -n "$ROLLBACK_REVISION" ]]; then
                kubectl rollout undo deployment/$APP_NAME-rolling -n "$NAMESPACE" --to-revision="$ROLLBACK_REVISION"
            else
                kubectl rollout undo deployment/$APP_NAME-rolling -n "$NAMESPACE"
            fi
            
            print_status "Waiting for rollback to complete..."
            kubectl rollout status deployment/$APP_NAME-rolling -n "$NAMESPACE" --timeout="$TIMEOUT"
            ;;
        "blue-green")
            print_status "Aborting current blue-green rollout..."
            kubectl argo rollouts abort $APP_NAME-blue-green -n "$NAMESPACE" || true
            
            print_status "Rolling back blue-green deployment..."
            if [[ -n "$ROLLBACK_REVISION" ]]; then
                kubectl argo rollouts undo $APP_NAME-blue-green -n "$NAMESPACE" --to-revision="$ROLLBACK_REVISION"
            else
                kubectl argo rollouts undo $APP_NAME-blue-green -n "$NAMESPACE"
            fi
            ;;
        "canary")
            print_status "Aborting current canary rollout..."
            kubectl argo rollouts abort $APP_NAME-canary -n "$NAMESPACE" || true
            
            print_status "Rolling back canary deployment..."
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
}

# Function to verify rollback
verify_rollback() {
    print_status "Verifying rollback..."
    
    # Wait a moment for pods to stabilize
    sleep 10
    
    # Check pod status
    local pods
    pods=$(kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api --no-headers)
    
    if [[ -z "$pods" ]]; then
        print_error "No pods found after rollback"
        return 1
    fi
    
    # Check if all pods are running
    local running_pods
    running_pods=$(echo "$pods" | grep -c "Running" || true)
    local total_pods
    total_pods=$(echo "$pods" | wc -l)
    
    print_status "Pod status after rollback: $running_pods/$total_pods running"
    
    if [[ "$running_pods" -eq "$total_pods" ]]; then
        print_success "All pods are running after rollback"
    else
        print_warning "Not all pods are running after rollback"
        kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=sageinsure-api
        return 1
    fi
    
    # Test service connectivity
    print_status "Testing service connectivity after rollback..."
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
    if kubectl run rollback-test --image=curlimages/curl --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f -m 10 "http://$service_name.$NAMESPACE.svc.cluster.local/health" &> /dev/null; then
        print_success "Service connectivity test passed after rollback"
        return 0
    else
        print_error "Service connectivity test failed after rollback"
        return 1
    fi
}

# Function to send notification
send_notification() {
    local status=$1
    local message="🔄 SageInsure API rollback $status for strategy: $DEPLOYMENT_STRATEGY"
    
    # Send to webhook if configured
    if [[ -n "${WEBHOOK_URL:-}" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$message\"}" || true
    fi
    
    # Log to syslog
    logger "SageInsure: $message"
    
    print_status "Notification sent: $message"
}

# Main rollback function
main() {
    echo "Rollback Configuration:"
    echo "- Strategy: $DEPLOYMENT_STRATEGY"
    echo "- Namespace: $NAMESPACE"
    echo "- Revision: ${ROLLBACK_REVISION:-"previous"}"
    echo "- Force: $FORCE_ROLLBACK"
    echo "- Timeout: $TIMEOUT"
    echo "- Dry Run: $DRY_RUN"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Get current status
    if ! get_current_status; then
        print_error "Cannot get current deployment status"
        exit 1
    fi
    
    # Validate rollback revision if provided
    if ! validate_rollback_revision; then
        print_error "Rollback revision validation failed"
        exit 1
    fi
    
    # Confirm rollback unless forced
    if [[ "$FORCE_ROLLBACK" != "true" && "$DRY_RUN" != "true" ]]; then
        echo ""
        read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Create backup
    create_backup
    
    # Perform rollback
    perform_rollback
    
    # Verify rollback (skip for dry run)
    if [[ "$DRY_RUN" != "true" ]]; then
        if verify_rollback; then
            print_success "Rollback completed successfully! 🎉"
            send_notification "completed"
        else
            print_error "Rollback verification failed"
            send_notification "failed"
            exit 1
        fi
    else
        print_success "Dry run completed successfully!"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --strategy)
            DEPLOYMENT_STRATEGY="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --revision)
            ROLLBACK_REVISION="$2"
            shift 2
            ;;
        --force)
            FORCE_ROLLBACK=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --history)
            show_history
            exit 0
            ;;
        --status)
            get_current_status
            exit 0
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --strategy STRATEGY       Deployment strategy (rolling|blue-green|canary)"
            echo "  --namespace NAMESPACE     Kubernetes namespace"
            echo "  --revision REVISION       Specific revision to rollback to"
            echo "  --force                   Skip confirmation prompt"
            echo "  --timeout TIMEOUT        Rollback timeout (default: 600s)"
            echo "  --dry-run                 Show what would be rolled back without executing"
            echo "  --history                 Show deployment history"
            echo "  --status                  Show current deployment status"
            echo "  --help                    Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DEPLOYMENT_STRATEGY       Deployment strategy (default: rolling)"
            echo "  NAMESPACE                Kubernetes namespace (default: default)"
            echo "  ROLLBACK_REVISION        Specific revision to rollback to"
            echo "  FORCE_ROLLBACK           Skip confirmation (default: false)"
            echo "  TIMEOUT                  Rollback timeout (default: 600s)"
            echo "  DRY_RUN                  Dry run mode (default: false)"
            echo "  WEBHOOK_URL              Webhook URL for notifications"
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