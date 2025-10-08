#!/bin/bash

# Full Terraform + Kubernetes deployment for SageInsure agents
set -e

echo "🚀 Starting full SageInsure deployment..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Deploy infrastructure with Terraform
echo -e "${BLUE}📦 Deploying Azure infrastructure with Terraform...${NC}"
cd terraform
terraform init
terraform plan -out=tfplan
terraform apply tfplan

# Get outputs
AKS_CLUSTER_NAME=$(terraform output -raw aks_cluster_name)
ACR_LOGIN_SERVER=$(terraform output -raw acr_login_server)
RESOURCE_GROUP=$(terraform output -raw resource_group_name)

echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
echo -e "${GREEN}🏗️ AKS Cluster: $AKS_CLUSTER_NAME${NC}"
echo -e "${GREEN}📦 ACR Server: $ACR_LOGIN_SERVER${NC}"

# Step 2: Configure kubectl
echo -e "${BLUE}⚙️ Configuring kubectl...${NC}"
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME --overwrite-existing

# Step 3: Install NGINX Ingress Controller
echo -e "${BLUE}🌐 Installing NGINX Ingress Controller...${NC}"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

# Step 4: Install cert-manager
echo -e "${BLUE}🔐 Installing cert-manager...${NC}"
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Step 5: Build and push agent images
echo -e "${BLUE}🐳 Building and pushing agent images...${NC}"
cd ../

# Login to ACR
az acr login --name ${ACR_LOGIN_SERVER%.*}

# Build agent images
agents=("claims-manager" "marine-specialist" "underwriter-agent" "research-assistant" "cyber-insurance" "fnol-processor" "policy-assistant")

for agent in "${agents[@]}"; do
  echo -e "${BLUE}Building $agent...${NC}"
  docker build -t $ACR_LOGIN_SERVER/$agent:latest -f docker/$agent/Dockerfile .
  docker push $ACR_LOGIN_SERVER/$agent:latest
done

# Build MCP server images
mcp_servers=("arxiv" "pubmed" "calculator" "memory" "weather")

for server in "${mcp_servers[@]}"; do
  echo -e "${BLUE}Building mcp-$server...${NC}"
  docker build -t $ACR_LOGIN_SERVER/mcp-$server:latest -f docker/mcp-$server/Dockerfile .
  docker push $ACR_LOGIN_SERVER/mcp-$server:latest
done

# Build frontend
echo -e "${BLUE}Building frontend...${NC}"
docker build -t $ACR_LOGIN_SERVER/frontend:latest -f azure-azins-frontend/Dockerfile azure-azins-frontend/
docker push $ACR_LOGIN_SERVER/frontend:latest

# Step 6: Deploy Kubernetes manifests
echo -e "${BLUE}☸️ Deploying to Kubernetes...${NC}"

# Update image references in manifests
sed -i "s|sageinsureacr.azurecr.io|$ACR_LOGIN_SERVER|g" k8s-manifests/*.yaml

# Apply manifests
kubectl apply -f k8s-manifests/agents-deployment.yaml
kubectl apply -f k8s-manifests/mcp-servers.yaml
kubectl apply -f k8s-manifests/ingress.yaml

# Step 7: Wait for deployments
echo -e "${BLUE}⏳ Waiting for deployments to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment --all -n sageinsure-agents

# Step 8: Get external IP
echo -e "${BLUE}🌐 Getting external IP...${NC}"
EXTERNAL_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${GREEN}📊 Access your agents at:${NC}"
echo -e "${GREEN}   • Claims Manager: https://$EXTERNAL_IP/claims${NC}"
echo -e "${GREEN}   • Marine Specialist: https://$EXTERNAL_IP/marine${NC}"
echo -e "${GREEN}   • Underwriter: https://$EXTERNAL_IP/underwriter${NC}"
echo -e "${GREEN}   • Research Assistant: https://$EXTERNAL_IP/research${NC}"
echo -e "${GREEN}   • Cyber Insurance: https://$EXTERNAL_IP/cyber${NC}"
echo -e "${GREEN}   • FNOL Processor: https://$EXTERNAL_IP/fnol${NC}"
echo -e "${GREEN}   • Policy Assistant: https://$EXTERNAL_IP/policy${NC}"
echo -e "${GREEN}   • Frontend: https://$EXTERNAL_IP/frontend${NC}"

echo -e "${BLUE}💡 Next steps:${NC}"
echo -e "${BLUE}   1. Configure DNS to point agents.sageinsure.com to $EXTERNAL_IP${NC}"
echo -e "${BLUE}   2. SSL certificates will be automatically provisioned${NC}"
echo -e "${BLUE}   3. Monitor deployments: kubectl get pods -n sageinsure-agents${NC}"
echo -e "${BLUE}   4. View logs: kubectl logs -f deployment/claims-manager -n sageinsure-agents${NC}"