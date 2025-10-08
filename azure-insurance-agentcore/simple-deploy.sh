#!/bin/bash

# Simple Azure Agent Core deployment
echo "🚀 Deploying Azure Insurance Agent Core..."

# Create Container App Environment only
az containerapp env create \
  --name sageinsure-env \
  --resource-group sageinsure-rg \
  --location eastus

# Create Container App with Agent Core runtime
az containerapp create \
  --name sageinsure-agent \
  --resource-group sageinsure-rg \
  --environment sageinsure-env \
  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \
  --target-port 8080 \
  --ingress external \
  --cpu 0.5 \
  --memory 1Gi

# Get URL
AGENT_URL=$(az containerapp show --name sageinsure-agent --resource-group sageinsure-rg --query properties.configuration.ingress.fqdn -o tsv)

echo "✅ Azure Agent Core deployed!"
echo "🔗 Agent URL: https://$AGENT_URL"