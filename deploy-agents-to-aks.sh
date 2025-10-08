#!/bin/bash

# Deploy SageInsure Agents to AKS
set -e

echo "🚀 Deploying SageInsure Agents to AKS"

# Configuration
ACR_NAME="sageinsureacreedfa81f"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"
RESOURCE_GROUP="sageinsure-rg"
AKS_CLUSTER="sageinsure-aks"

# Login to ACR
echo "🔐 Logging into ACR..."
az acr login --name $ACR_NAME

# Build and push a simple agent image based on the agentcore
echo "🏗️ Building agent images..."

# Create a simple Dockerfile for the agents
cat > Dockerfile.agent << 'EOF'
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy agent code
COPY agent_app.py .

# Expose port
EXPOSE 8080

# Run the agent
CMD ["uvicorn", "agent_app:app", "--host", "0.0.0.0", "--port", "8080"]
EOF

# Create requirements.txt
cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
requests==2.31.0
python-multipart==0.0.6
EOF

# Copy the agent app
cp azure-agentcore/agent_app.py .

# Build and push images for each agent
AGENTS=("claims-manager" "marine-specialist" "underwriter-agent" "research-assistant" "cyber-insurance" "fnol-processor" "policy-assistant")

for agent in "${AGENTS[@]}"; do
    echo "📦 Building and pushing $agent..."
    
    # Build the image
    docker build -f Dockerfile.agent -t $ACR_LOGIN_SERVER/$agent:latest .
    
    # Push to ACR
    docker push $ACR_LOGIN_SERVER/$agent:latest
    
    echo "✅ $agent image pushed successfully"
done

# Clean up temporary files
rm -f Dockerfile.agent requirements.txt agent_app.py

echo "🎯 All agent images built and pushed to ACR"

# Deploy to Kubernetes
echo "☸️ Deploying agents to AKS..."

# Apply the deployment
kubectl apply -f k8s-manifests/agents-deployment.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment --all -n sageinsure-agents

# Check deployment status
echo "📊 Deployment Status:"
kubectl get pods -n sageinsure-agents
kubectl get services -n sageinsure-agents

# Create ingress for external access
echo "🌐 Creating ingress for external access..."

cat > agents-ingress.yaml << 'EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sageinsure-agents-ingress
  namespace: sageinsure-agents
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: sageinsure-agents.eastus.cloudapp.azure.com
    http:
      paths:
      - path: /claims(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: claims-manager-service
            port:
              number: 80
      - path: /marine(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: marine-specialist-service
            port:
              number: 80
      - path: /underwriter(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: underwriter-agent-service
            port:
              number: 80
      - path: /research(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: research-assistant-service
            port:
              number: 80
      - path: /cyber(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: cyber-insurance-service
            port:
              number: 80
      - path: /fnol(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: fnol-processor-service
            port:
              number: 80
      - path: /policy(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: policy-assistant-service
            port:
              number: 80
EOF

# Install nginx ingress controller if not present
if ! kubectl get pods -n ingress-nginx | grep -q nginx-controller; then
    echo "📥 Installing NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
    
    # Wait for ingress controller to be ready
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=120s
fi

# Apply the ingress
kubectl apply -f agents-ingress.yaml

# Get ingress IP
echo "🔍 Getting ingress external IP..."
kubectl get ingress -n sageinsure-agents

echo "✅ SageInsure Agents deployed successfully to AKS!"
echo ""
echo "🎯 Agent Endpoints (once ingress IP is available):"
echo "   Claims Manager: http://<INGRESS-IP>/claims/"
echo "   Marine Specialist: http://<INGRESS-IP>/marine/"
echo "   Underwriter Agent: http://<INGRESS-IP>/underwriter/"
echo "   Research Assistant: http://<INGRESS-IP>/research/"
echo "   Cyber Insurance: http://<INGRESS-IP>/cyber/"
echo "   FNOL Processor: http://<INGRESS-IP>/fnol/"
echo "   Policy Assistant: http://<INGRESS-IP>/policy/"
echo ""
echo "📝 To get the ingress IP:"
echo "   kubectl get ingress -n sageinsure-agents"

# Clean up
rm -f agents-ingress.yaml

echo "🎉 Deployment complete!"