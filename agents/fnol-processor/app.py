from fastapi import FastAPI
from pydantic import BaseModel
import os

app = FastAPI(title="SageInsure Underwriter Agent")

class UnderwritingRequest(BaseModel):
    query: str
    context: str = None

@app.get("/")
def health():
    return {"status": "SageInsure Underwriter Agent", "version": "1.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "underwriter-agent"}

@app.post("/chat")
def chat(request: UnderwritingRequest):
    return {
        "response": f"Underwriting analysis: {request.query}",
        "agent": "underwriter-agent",
        "status": "success"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)