#!/bin/bash
# Deploy SageInsure to Staging Environment
# This script creates secrets from Key Vault and deploys applications

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="staging"
KEY_VAULT_NAME="kv-eedfa81f"
REGISTRY="sageinsureacr.azurecr.io"
IMAGE_TAG=${IMAGE_TAG:-"latest"}

echo -e "${BLUE}🚀 Deploying SageInsure to Staging${NC}"
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

# Function to create namespace
create_namespace() {
    print_status "Creating staging namespace..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        print_warning "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace "$NAMESPACE"
        print_success "Created namespace: $NAMESPACE"
    fi
    
    # Label the namespace
    kubectl label namespace "$NAMESPACE" environment=staging --overwrite
    kubectl label namespace "$NAMESPACE" app.kubernetes.io/part-of=sageinsure --overwrite
}

# Function to create secrets from Key Vault
create_secrets_from_keyvault() {
    print_status "Creating secrets from Key Vault..."
    
    # Get secrets from Key Vault
    local openai_key=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "OPENAI-API-KEY" --query value -o tsv)
    local search_key=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "AZURE-SEARCH-KEY" --query value -o tsv)
    local storage_connection=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "STORAGE-CONNECTION-STRING" --query value -o tsv)
    
    # Create azure-secrets
    kubectl create secret generic azure-secrets \
        --from-literal=openai-api-key="$openai_key" \
        --from-literal=search-api-key="$search_key" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Created azure-secrets"
    
    # Create database-secret (using storage connection for now)
    kubectl create secret generic database-secret \
        --from-literal=connection-string="$storage_connection" \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_success "Created database-secret"
    
    # Create ACR secret (if we have registry credentials)
    # For now, we'll create a placeholder
    kubectl create secret generic acr-secret \
        --from-literal=.dockerconfigjson='{}' \
        --type=kubernetes.io/dockerconfigjson \
        --namespace="$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f - || print_warning "ACR secret creation skipped"
}

# Function to create basic manifests for staging
create_staging_manifests() {
    print_status "Creating staging application manifests..."
    
    # Create API deployment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sageinsure-api
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: sageinsure-api
    app.kubernetes.io/part-of: sageinsure
    environment: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: sageinsure-api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: sageinsure-api
        app.kubernetes.io/part-of: sageinsure
        environment: staging
    spec:
      containers:
      - name: api
        image: python:3.11-slim
        command: ["/bin/sh"]
        args: ["-c", "echo 'SageInsure API Staging' && python -m http.server 8080"]
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: ENVIRONMENT
          value: "staging"
        - name: PORT
          value: "8080"
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: sageinsure-api
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: sageinsure-api
    app.kubernetes.io/part-of: sageinsure
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app.kubernetes.io/name: sageinsure-api
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sageinsure-frontend
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: sageinsure-frontend
    app.kubernetes.io/part-of: sageinsure
    environment: staging
spec:
  replicas: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: sageinsure-frontend
  template:
    metadata:
      labels:
        app.kubernetes.io/name: sageinsure-frontend
        app.kubernetes.io/part-of: sageinsure
        environment: staging
    spec:
      containers:
      - name: frontend
        image: nginx:alpine
        ports:
        - containerPort: 80
          name: http
        env:
        - name: ENVIRONMENT
          value: "staging"
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: sageinsure-frontend
  namespace: $NAMESPACE
  labels:
    app.kubernetes.io/name: sageinsure-frontend
    app.kubernetes.io/part-of: sageinsure
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app.kubernetes.io/name: sageinsure-frontend
EOF

    print_success "Created staging application manifests"
}

# Function to create health endpoint for API
create_health_endpoint() {
    print_status "Setting up health endpoint..."
    
    # Create a simple health endpoint
    kubectl exec -n "$NAMESPACE" deployment/sageinsure-api -- /bin/sh -c "
        mkdir -p /tmp/health
        echo 'OK' > /tmp/health/index.html
        cd /tmp/health && python -m http.server 8080 &
    " || print_warning "Health endpoint setup may need manual configuration"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Wait for deployments to be ready
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available deployment/sageinsure-api -n "$NAMESPACE" --timeout=300s
    kubectl wait --for=condition=available deployment/sageinsure-frontend -n "$NAMESPACE" --timeout=300s
    
    # Check pod status
    print_status "Pod status:"
    kubectl get pods -n "$NAMESPACE"
    
    # Check services
    print_status "Service status:"
    kubectl get services -n "$NAMESPACE"
    
    # Test API connectivity
    print_status "Testing API connectivity..."
    if kubectl run connectivity-test --image=curlimages/curl --rm -i --restart=Never -n "$NAMESPACE" -- \
        curl -f -m 10 "http://sageinsure-api.$NAMESPACE.svc.cluster.local/" &> /dev/null; then
        print_success "API connectivity test passed"
    else
        print_warning "API connectivity test failed - service may still be starting"
    fi
}

# Function to create ingress for staging
create_ingress() {
    print_status "Creating ingress for staging..."
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sageinsure-staging-ingress
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - host: staging-api.sageinsure.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sageinsure-api
            port:
              number: 80
  - host: staging.sageinsure.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: sageinsure-frontend
            port:
              number: 80
EOF

    print_success "Created staging ingress"
}

# Function to show deployment summary
show_summary() {
    echo ""
    echo -e "${GREEN}🎉 Staging Deployment Complete!${NC}"
    echo "================================="
    echo ""
    echo "Namespace: $NAMESPACE"
    echo ""
    echo "Applications:"
    kubectl get deployments -n "$NAMESPACE"
    echo ""
    echo "Services:"
    kubectl get services -n "$NAMESPACE"
    echo ""
    echo "Ingress:"
    kubectl get ingress -n "$NAMESPACE"
    echo ""
    echo "To check logs:"
    echo "  kubectl logs -l app.kubernetes.io/name=sageinsure-api -n $NAMESPACE"
    echo ""
    echo "To access staging:"
    echo "  kubectl port-forward svc/sageinsure-api 8080:80 -n $NAMESPACE"
    echo "  curl http://localhost:8080"
}

# Main function
main() {
    echo "Configuration:"
    echo "- Namespace: $NAMESPACE"
    echo "- Key Vault: $KEY_VAULT_NAME"
    echo "- Image Tag: $IMAGE_TAG"
    echo ""
    
    create_namespace
    create_secrets_from_keyvault
    create_staging_manifests
    verify_deployment
    create_ingress
    show_summary
}

# Run main function
main