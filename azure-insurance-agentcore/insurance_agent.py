from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import os
import json

app = FastAPI(title="SageInsure Azure Agent")

class InvokeRequest(BaseModel):
    prompt: str

@app.get("/")
def health():
    return {"status": "SageInsure Azure Agent Core Running", "version": "1.0"}

@app.post("/invocations")
def invoke(request: InvokeRequest):
    """Insurance AI agent function"""
    user_message = request.prompt or "Hello! How can I help with your insurance policy?"
    
    # Mock insurance response (replace with actual Azure OpenAI when configured)
    response = f"I'm your SageInsure AI assistant. You asked: '{user_message}'. I can help with auto, home, life, and health insurance policies. What specific coverage information do you need?"
    
    return {"result": response}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)