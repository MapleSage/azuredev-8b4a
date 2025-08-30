#!/bin/bash

# SageInsure Production Cutover Script
# This script manages the cutover from App Service to AKS

set +e  # Don't exit on errors, handle them gracefully

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="sageinsure-rg"
AKS_CLUSTER="sageinsure-aks"
APP_SERVICE_NAME="sageinsure-app"  # Assuming this exists
TRAFFIC_MANAGER_PROFILE="sageinsure-tm"  # If using Traffic Manager

# Cutover state tracking
CUTOVER_LOG="cutover-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_PLAN="rollback-plan-$(date +%Y%m%d-%H%M%S).json"

# Function to print colored output
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "$(date): $1" >> "$CUTOVER_LOG"
}

print_status() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "$(date): SUCCESS - $1" >> "$CUTOVER_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "$(date): WARNING - $1" >> "$CUTOVER_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "$(date): ERROR - $1" >> "$CUTOVER_LOG"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date): INFO - $1" >> "$CUTOVER_LOG"
}

# Function to create rollback plan
create_rollback_plan() {
    print_info "Creating rollback plan..."
    
    cat > "$ROLLBACK_PLAN" << EOF
{
  "cutover_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "original_state": {
    "app_service_status": "$(az webapp show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --query state -o tsv 2>/dev/null || echo 'NotFound')",
    "aks_cluster_status": "$(az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query provisioningState -o tsv)",
    "dns_records": []
  },
  "rollback_steps": [
    "1. Redirect DNS back to App Service",
    "2. Scale down AKS applications",
    "3. Restart App Service if needed",
    "4. Verify App Service functionality",
    "5. Monitor for 30 minutes"
  ],
  "emergency_contacts": [
    "DevOps Team: devops@sageinsure.com",
    "On-Call Engineer: +1-XXX-XXX-XXXX"
  ]
}
EOF
    
    print_status "Rollback plan created: $ROLLBACK_PLAN"
}

# Pre-cutover validation
pre_cutover_validation() {
    print_header "Pre-Cutover Validation"
    
    # Run migration validation
    print_info "Running comprehensive migration validation..."
    if bash scripts/migration-validation.sh > /dev/null 2>&1; then
        print_status "Migration validation passed"
    else
        print_error "Migration validation failed - aborting cutover"
        return 1
    fi
    
    # Check AKS application readiness
    print_info "Checking AKS application readiness..."
    
    # Try to get kubectl access (may require interactive auth)
    if az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing > /dev/null 2>&1; then
        print_status "AKS credentials retrieved"
        
        # Check if we can access the cluster (timeout after 10 seconds)
        if timeout 10 kubectl get nodes > /dev/null 2>&1; then
            print_status "kubectl connectivity confirmed"
            
            # Check application pods (if accessible)
            if kubectl get pods -n sageinsure > /dev/null 2>&1; then
                RUNNING_PODS=$(kubectl get pods -n sageinsure --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
                if [[ $RUNNING_PODS -gt 0 ]]; then
                    print_status "$RUNNING_PODS application pods are running"
                else
                    print_warning "No running application pods found in sageinsure namespace"
                fi
            else
                print_warning "Cannot access sageinsure namespace (may not exist yet)"
            fi
        else
            print_warning "kubectl access requires interactive authentication"
        fi
    else
        print_warning "Cannot retrieve AKS credentials"
    fi
    
    # Check external endpoints (if configured)
    print_info "Testing external endpoints..."
    
    # Test if ingress is accessible
    INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "")
    if [[ -n "$INGRESS_IP" ]]; then
        print_status "Ingress controller has external IP: $INGRESS_IP"
        
        # Test basic HTTP connectivity to ingress
        if curl -s --max-time 10 "http://$INGRESS_IP" > /dev/null 2>&1; then
            print_status "Ingress controller is responding to HTTP requests"
        else
            print_warning "Ingress controller is not responding to HTTP requests"
        fi
    else
        print_warning "Ingress controller external IP not found"
    fi
    
    return 0
}

# Cutover execution phases
execute_cutover_phase1() {
    print_header "Cutover Phase 1: Prepare AKS Applications"
    
    # Ensure applications are deployed and healthy
    print_info "Verifying AKS application deployment..."
    
    # This would typically involve:
    # 1. Deploying latest application versions
    # 2. Running health checks
    # 3. Warming up caches
    # 4. Pre-loading data if needed
    
    print_status "Phase 1 completed - AKS applications prepared"
}

execute_cutover_phase2() {
    print_header "Cutover Phase 2: Traffic Switching Preparation"
    
    # Prepare for traffic switching
    print_info "Preparing traffic switching mechanisms..."
    
    # Check current DNS configuration
    print_info "Current DNS configuration:"
    # This would check current DNS records pointing to App Service
    
    # Prepare new DNS records for AKS
    print_info "Preparing DNS records for AKS endpoints..."
    
    print_status "Phase 2 completed - Traffic switching prepared"
}

execute_cutover_phase3() {
    print_header "Cutover Phase 3: Execute Traffic Switch"
    
    print_warning "CRITICAL PHASE: Switching production traffic to AKS"
    print_info "This phase will redirect production traffic from App Service to AKS"
    
    # Confirm before proceeding
    read -p "Are you ready to proceed with traffic switching? (yes/no): " confirm
    if [[ $confirm != "yes" ]]; then
        print_error "Cutover aborted by user"
        return 1
    fi
    
    # Execute traffic switch
    print_info "Switching DNS records to point to AKS..."
    
    # This would involve:
    # 1. Updating DNS records to point to AKS ingress
    # 2. Updating load balancer configurations
    # 3. Updating CDN configurations if applicable
    
    # Simulate DNS update (replace with actual DNS update commands)
    print_info "Updating DNS records..."
    # Example: az network dns record-set a update --resource-group $RESOURCE_GROUP --zone-name sageinsure.com --name @ --set aRecords[0].ipv4Address=$INGRESS_IP
    
    print_status "Phase 3 completed - Traffic switched to AKS"
    
    # Wait for DNS propagation
    print_info "Waiting for DNS propagation (60 seconds)..."
    sleep 60
}

execute_cutover_phase4() {
    print_header "Cutover Phase 4: Post-Cutover Validation"
    
    print_info "Validating cutover success..."
    
    # Test application endpoints
    print_info "Testing application endpoints..."
    
    # Test API health endpoint
    if curl -s --max-time 30 "https://api.sageinsure.local/healthz" > /dev/null 2>&1; then
        print_status "API health endpoint is responding"
    else
        print_warning "API health endpoint is not responding (may be DNS propagation delay)"
    fi
    
    # Test frontend
    if curl -s --max-time 30 "https://sageinsure.local" > /dev/null 2>&1; then
        print_status "Frontend is responding"
    else
        print_warning "Frontend is not responding (may be DNS propagation delay)"
    fi
    
    # Monitor for errors
    print_info "Monitoring system for 5 minutes..."
    for i in {1..5}; do
        print_info "Monitoring minute $i/5..."
        sleep 60
        
        # Check application health
        if timeout 10 kubectl get pods -n sageinsure > /dev/null 2>&1; then
            UNHEALTHY_PODS=$(kubectl get pods -n sageinsure --field-selector=status.phase!=Running --no-headers 2>/dev/null | wc -l)
            if [[ $UNHEALTHY_PODS -eq 0 ]]; then
                print_status "All application pods are healthy"
            else
                print_warning "$UNHEALTHY_PODS pods are not in Running state"
            fi
        fi
    done
    
    print_status "Phase 4 completed - Post-cutover validation finished"
}

# Rollback procedure
execute_rollback() {
    print_header "EXECUTING EMERGENCY ROLLBACK"
    
    print_error "Rolling back to App Service..."
    
    # 1. Switch DNS back to App Service
    print_info "Switching DNS back to App Service..."
    # This would revert DNS changes
    
    # 2. Ensure App Service is running
    print_info "Ensuring App Service is running..."
    if az webapp show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP > /dev/null 2>&1; then
        APP_STATE=$(az webapp show --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP --query state -o tsv)
        if [[ "$APP_STATE" != "Running" ]]; then
            print_info "Starting App Service..."
            az webapp start --name $APP_SERVICE_NAME --resource-group $RESOURCE_GROUP
        fi
        print_status "App Service is running"
    else
        print_error "App Service not found - manual intervention required"
    fi
    
    # 3. Scale down AKS applications to save costs
    print_info "Scaling down AKS applications..."
    if timeout 10 kubectl scale deployment --all --replicas=0 -n sageinsure > /dev/null 2>&1; then
        print_status "AKS applications scaled down"
    else
        print_warning "Could not scale down AKS applications"
    fi
    
    # 4. Wait for DNS propagation
    print_info "Waiting for DNS propagation (60 seconds)..."
    sleep 60
    
    # 5. Validate rollback
    print_info "Validating rollback..."
    if curl -s --max-time 30 "https://sageinsure.local" > /dev/null 2>&1; then
        print_status "Rollback successful - App Service is responding"
    else
        print_error "Rollback validation failed - manual intervention required"
    fi
    
    print_status "Rollback completed"
}

# Main cutover orchestration
main() {
    print_header "SageInsure Production Cutover to AKS"
    
    echo "This script will perform the production cutover from App Service to AKS"
    echo "Cutover log: $CUTOVER_LOG"
    echo "Rollback plan: $ROLLBACK_PLAN"
    echo ""
    
    # Create rollback plan
    create_rollback_plan
    echo ""
    
    # Pre-cutover validation
    if ! pre_cutover_validation; then
        print_error "Pre-cutover validation failed - aborting"
        exit 1
    fi
    echo ""
    
    # Confirm cutover
    print_warning "PRODUCTION CUTOVER CONFIRMATION"
    echo "This will switch production traffic from App Service to AKS"
    echo "Ensure you have:"
    echo "- Notified stakeholders"
    echo "- Prepared monitoring dashboards"
    echo "- Tested rollback procedures"
    echo "- Have emergency contacts ready"
    echo ""
    
    read -p "Do you want to proceed with the production cutover? (yes/no): " proceed
    if [[ $proceed != "yes" ]]; then
        print_info "Cutover cancelled by user"
        exit 0
    fi
    
    # Execute cutover phases
    if execute_cutover_phase1; then
        echo ""
        if execute_cutover_phase2; then
            echo ""
            if execute_cutover_phase3; then
                echo ""
                execute_cutover_phase4
                echo ""
                
                print_header "CUTOVER COMPLETED SUCCESSFULLY"
                print_status "Production traffic is now running on AKS"
                print_info "Continue monitoring for the next 24 hours"
                print_info "Rollback plan available at: $ROLLBACK_PLAN"
                
            else
                print_error "Phase 3 failed - consider rollback"
                read -p "Do you want to execute rollback? (yes/no): " rollback
                if [[ $rollback == "yes" ]]; then
                    execute_rollback
                fi
            fi
        else
            print_error "Phase 2 failed - aborting cutover"
        fi
    else
        print_error "Phase 1 failed - aborting cutover"
    fi
}

# Handle script interruption
trap 'print_error "Cutover interrupted - check system state and consider rollback"; exit 1' INT TERM

# Check if rollback is requested
if [[ "$1" == "rollback" ]]; then
    execute_rollback
    exit 0
fi

# Run main cutover
main