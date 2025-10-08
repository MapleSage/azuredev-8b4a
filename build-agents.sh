#!/bin/bash

# Build and push all agent images to ACR
ACR_NAME="sageinsureacr1758906383"
ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

echo "Logging into ACR..."
az acr login --name $ACR_NAME

# Create missing agent directories and files
AGENTS_DIR="/Volumes/Macintosh HD Ext./Developer/azure-insurance/agents"
mkdir -p $AGENTS_DIR

# Create base agent template
create_agent() {
    local agent_name=$1
    local agent_title=$2
    local agent_dir="$AGENTS_DIR/$agent_name"
    
    mkdir -p $agent_dir
    
    cat > $agent_dir/app.py << EOF
from fastapi import FastAPI
from pydantic import BaseModel
import os

app = FastAPI(title="$agent_title")

class AgentRequest(BaseModel):
    query: str
    context: str = None

@app.get("/")
def health():
    return {"status": "$agent_title", "version": "1.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "$agent_title"}

@app.post("/chat")
def chat(request: AgentRequest):
    return {
        "response": f"Hello from $agent_title! Processing: {request.query}",
        "agent": "$agent_name",
        "status": "success"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
EOF

    cat > $agent_dir/requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
EOF

    cat > $agent_dir/Dockerfile << EOF
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

EXPOSE 8080

CMD ["python", "app.py"]
EOF
}

# Create all missing agents
create_agent "underwriter-agent" "SageInsure Underwriter Agent"
create_agent "research-assistant" "SageInsure Research Assistant"
create_agent "cyber-insurance" "SageInsure Cyber Insurance Agent"
create_agent "fnol-processor" "SageInsure FNOL Processor"
create_agent "policy-assistant" "SageInsure Policy Assistant"

# Copy existing agents
cp -r /Volumes/Macintosh\ HD\ Ext./Developer/azure-insurance/azure-sageinsure-complete/claims-agent $AGENTS_DIR/
cp -r /Volumes/Macintosh\ HD\ Ext./Developer/azure-insurance/azure-sageinsure-complete/marine-agent $AGENTS_DIR/
mv $AGENTS_DIR/marine-agent $AGENTS_DIR/marine-specialist

# Build and push all agents
AGENTS=("claims-manager" "marine-specialist" "underwriter-agent" "research-assistant" "cyber-insurance" "fnol-processor" "policy-assistant")

for agent in "${AGENTS[@]}"; do
    echo "Building $agent..."
    
    if [ "$agent" == "claims-manager" ]; then
        agent_dir="$AGENTS_DIR/claims-agent"
    else
        agent_dir="$AGENTS_DIR/$agent"
    fi
    
    if [ -d "$agent_dir" ]; then
        cd "$agent_dir"
        
        # Build image
        docker build -t $ACR_LOGIN_SERVER/$agent:latest .
        
        # Push image
        docker push $ACR_LOGIN_SERVER/$agent:latest
        
        echo "✅ $agent built and pushed successfully"
    else
        echo "❌ Directory not found: $agent_dir"
    fi
done

echo "🎉 All agent images built and pushed to ACR!"