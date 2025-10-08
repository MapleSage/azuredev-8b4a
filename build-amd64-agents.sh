#!/bin/bash

ACR_LOGIN_SERVER="sageinsureacr1758906383.azurecr.io"
AGENTS=("marine-specialist" "underwriter-agent" "research-assistant" "cyber-insurance" "fnol-processor" "policy-assistant")

for agent in "${AGENTS[@]}"; do
    echo "Building $agent for AMD64..."
    cd "/Volumes/Macintosh HD Ext./Developer/azure-insurance/agents/$agent"
    
    # Build image for AMD64
    docker build --platform linux/amd64 -t $ACR_LOGIN_SERVER/$agent:latest .
    
    # Push image
    docker push $ACR_LOGIN_SERVER/$agent:latest
    
    echo "✅ $agent completed"
done

echo "🎉 All AMD64 agent images built and pushed!"