from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json
import os

app = FastAPI()

class ChatRequest(BaseModel):
    message: str
    conversation_history: list = []

class ChatResponse(BaseModel):
    answer: str
    sources: list

@app.get("/healthz")
def health():
    return {"status": "healthy"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        # Step 1: Search
        search_url = "https://sageinsure-search.search.windows.net/indexes/policy-index/docs/search?api-version=2023-11-01"
        search_headers = {
            "api-key": "DYvM0ODN7nEkVxoBy7KtHsCKYcxH6DtUvfg3fQzlO8AzSeBsKgjX",
            "Content-Type": "application/json"
        }
        search_data = {"search": request.message, "top": 3}
        
        search_response = requests.post(search_url, headers=search_headers, json=search_data)
        search_results = search_response.json().get("value", [])
        
        # Step 2: Generate context
        context = "\n".join([doc.get("content", "") for doc in search_results])
        
        # Step 3: OpenAI
        openai_url = "https://eastus.api.cognitive.microsoft.com/openai/deployments/gpt4o-deployment/chat/completions?api-version=2024-02-15-preview"
        openai_headers = {
            "api-key": "172068a0b5a348efa948c8339cca0329",
            "Content-Type": "application/json"
        }
        
        messages = [
            {"role": "system", "content": f"You are an insurance assistant. Use this context: {context}"},
            {"role": "user", "content": request.message}
        ]
        
        openai_data = {"messages": messages, "max_tokens": 500}
        
        openai_response = requests.post(openai_url, headers=openai_headers, json=openai_data)
        openai_result = openai_response.json()
        
        answer = openai_result["choices"][0]["message"]["content"]
        
        sources = [{"title": doc.get("title", ""), "category": doc.get("category", "")} for doc in search_results]
        
        return ChatResponse(answer=answer, sources=sources)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)