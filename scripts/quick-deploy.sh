#!/bin/bash

# Quick deployment script - simpler approach
set -e

echo "🚀 Quick deployment to Azure..."

# Use existing resources
RESOURCE_GROUP="rg-sageinsure-multi-agent-prod"
BACKEND_APP_NAME="sageinsure-backend-simple"

# Create a simple web app
echo "📦 Creating simple backend app..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan sageinsure-plan \
    --name $BACKEND_APP_NAME \
    --runtime "PYTHON|3.11" \
    --deployment-local-git

# Set essential environment variables only
echo "⚙️ Setting environment variables..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --settings \
        AZURE_OPENAI_ENDPOINT=https://parvinddutta-9607_ai.openai.azure.com/ \
        AZURE_OPENAI_API_KEY=172068a0b5a348efa948c8339cca0329 \
        AZURE_OPENAI_DEPLOYMENT=gpt-4o \
        PORT=8000

# Create minimal app.py for deployment
cd backend
cat > simple_app.py << 'EOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import openai
from pydantic import BaseModel

app = FastAPI(title="SageInsure API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure OpenAI
openai.api_type = "azure"
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
openai.api_key = os.getenv("AZURE_OPENAI_API_KEY")
openai.api_version = "2024-02-15-preview"

class ChatRequest(BaseModel):
    text: str
    specialist: str = "GENERAL"

@app.get("/")
def health():
    return {"status": "SageInsure API Running", "version": "1.0.0"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        response = openai.ChatCompletion.create(
            engine="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful insurance assistant."},
                {"role": "user", "content": request.text}
            ],
            temperature=0.7,
            max_toke