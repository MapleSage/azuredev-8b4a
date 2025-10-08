#!/bin/bash

# Deploy SageInsure agents to AI Foundry environment
set -e

RESOURCE_GROUP="rg-sagegpt-mae-dev"
ENVIRONMENT="cae-sagegptmaedevlkci5"
REGISTRY="sageinsureacreedfa81f"

echo "🏥 Deploying SageInsure Agents to AI Foundry"
echo "Resource Group: $RESOURCE_GROUP"
echo "Environment: $ENVIRONMENT"

# Deploy Claims Agent
echo "📋 Deploying Claims Agent..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-claims-agent" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

# Deploy Marine Agent  
echo "🚢 Deploying Marine Agent..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-marine-agent" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

# Deploy Cyber Agent
echo "🔒 Deploying Cyber Agent..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-cyber-agent" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

# Deploy FNOL Processor
echo "📝 Deploying FNOL Processor..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-fnol-processor" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

# Deploy Policy Agent
echo "📄 Deploying Policy Agent..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-policy-agent" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

# Deploy Underwriting Agent
echo "📊 Deploying Underwriting Agent..."
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --name "sageinsure-underwriting-agent" \
  --image "mcr.microsoft.com/azuredocs/containerapps-helloworld:latest" \
  --target-port 8080 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1Gi

echo "✅ All SageInsure agents deployed!"
echo ""
echo "🔗 Agent Endpoints:"
echo "Claims: https://sageinsure-claims-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Marine: https://sageinsure-marine-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Cyber: https://sageinsure-cyber-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "FNOL: https://sageinsure-fnol-processor.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Policy: https://sageinsure-policy-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Underwriting: https://sageinsure-underwriting-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"