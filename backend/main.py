from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import httpx
from typing import Optional, List, Dict

app = FastAPI(title="SageInsure AI Backend")

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict]] = []
    session_id: Optional[str] = None
    specialist: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    handled_by: str
    session_id: str

# Agent routing configuration
AGENT_ROUTES = {
    "CLAIMS_CHAT": "claims-manager-service",
    "UNDERWRITING": "underwriter-agent-service", 
    "RESEARCH_ASSISTANT": "research-assistant-service",
    "MARINE_INSURANCE": "marine-specialist-service",
    "CYBER_INSURANCE": "cyber-insurance-service",
    "FNOL_PROCESSOR": "fnol-processor-service",
    "POLICY_ASSISTANT": "policy-assistant-service"
}

@app.get("/")
def health():
    return {"status": "SageInsure AI Backend", "version": "1.0", "agents": len(AGENT_ROUTES)}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Route to appropriate agent service
        service_name = AGENT_ROUTES.get(request.specialist, "claims-manager-service")
        
        # For now, return a mock AI response since the agents are placeholders
        specialist_name = request.specialist or "CLAIMS_CHAT"
        
        response_text = f"Hello! I'm your {specialist_name.replace('_', ' ').title()} assistant. I received your message: '{request.message}'. How can I help you with your insurance needs today?"
        
        return ChatResponse(
            response=response_text,
            handled_by=specialist_name,
            session_id=request.session_id or "default-session"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents")
def list_agents():
    return {"agents": list(AGENT_ROUTES.keys())}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)