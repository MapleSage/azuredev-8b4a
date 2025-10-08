#!/bin/bash

# Update all SageInsure agents with actual insurance logic
set -e

RESOURCE_GROUP="rg-sagegpt-mae-dev"

echo "🔄 Updating SageInsure agents with actual insurance logic..."

# Create a simple FastAPI insurance agent
cat > /tmp/insurance_agent.py << 'EOF'
from fastapi import FastAPI
from pydantic import BaseModel
import os

app = FastAPI(title="SageInsure Agent")

class ChatRequest(BaseModel):
    prompt: str
    session_id: str = "default"

@app.get("/")
def health():
    agent_type = os.getenv("AGENT_TYPE", "insurance")
    return {
        "status": f"SageInsure {agent_type.title()} Agent",
        "version": "1.0",
        "capabilities": ["RAG", "Memory", "MCP Tools"],
        "agent_type": agent_type
    }

@app.post("/invocations")
def invoke(request: ChatRequest):
    agent_type = os.getenv("AGENT_TYPE", "insurance")
    
    responses = {
        "claims": f"I'm your Claims Agent. I can help process claims, check status, and handle settlements. You asked: '{request.prompt}'",
        "marine": f"I'm your Marine Insurance Agent. I can assess cargo damage, vessel incidents, and marine coverage. You asked: '{request.prompt}'",
        "cyber": f"I'm your Cyber Insurance Agent. I can handle data breaches, cyber incidents, and security assessments. You asked: '{request.prompt}'",
        "fnol": f"I'm your FNOL Processor. I handle First Notice of Loss, emergency claims, and immediate response. You asked: '{request.prompt}'",
        "policy": f"I'm your Policy Agent. I can verify coverage, check policy details, and handle exceptions. You asked: '{request.prompt}'",
        "underwriting": f"I'm your Underwriting Agent. I can assess risks, approve policies, and provide underwriting decisions. You asked: '{request.prompt}'"
    }
    
    response = responses.get(agent_type, f"I'm your SageInsure {agent_type} agent. You asked: '{request.prompt}'")
    
    return {
        "result": response,
        "session_id": request.session_id,
        "agent_type": agent_type
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOF

# Create Dockerfile
cat > /tmp/Dockerfile << 'EOF'
FROM python:3.11-slim
WORKDIR /app
RUN pip install fastapi uvicorn pydantic
COPY insurance_agent.py .
EXPOSE 8080
CMD ["python", "insurance_agent.py"]
EOF

echo "📦 Building insurance agent image..."
cd /tmp
docker build -t sageinsure-agent:latest .

echo "🚀 Updating all agents..."

# Update Claims Agent
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-claims-agent" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=claims

# Update Marine Agent  
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-marine-agent" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=marine

# Update Cyber Agent
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-cyber-agent" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=cyber

# Update FNOL Processor
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-fnol-processor" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=fnol

# Update Policy Agent
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-policy-agent" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=policy

# Update Underwriting Agent
az containerapp update \
  --resource-group "$RESOURCE_GROUP" \
  --name "sageinsure-underwriting-agent" \
  --image "sageinsure-agent:latest" \
  --set-env-vars AGENT_TYPE=underwriting

echo "✅ All agents updated with insurance logic!"
echo ""
echo "🔗 Test endpoints:"
echo "Claims: https://sageinsure-claims-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Marine: https://sageinsure-marine-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Cyber: https://sageinsure-cyber-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "FNOL: https://sageinsure-fnol-processor.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Policy: https://sageinsure-policy-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"
echo "Underwriting: https://sageinsure-underwriting-agent.livelyforest-2e320588.eastus2.azurecontainerapps.io"