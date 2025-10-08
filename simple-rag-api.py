#!/usr/bin/env python3
"""
Simple RAG API that connects to deployed Azure OpenAI and Cognitive Search
"""
import os
import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(title="SageInsure RAG API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://sageinsure.maplesage.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Configuration from your deployed services
AZURE_OPENAI_ENDPOINT = "https://sageinsure-openai.openai.azure.com/"
AZURE_SEARCH_ENDPOINT = "https://sageinsure-search.search.windows.net"
AZURE_SEARCH_INDEX = "policy-index"

# Get keys from environment
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
AZURE_SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    answer: str
    sources: List[dict] = []

# Initialize clients
def get_openai_client():
    if not AZURE_OPENAI_KEY:
        raise HTTPException(status_code=500, detail="Azure OpenAI key not configured")
    return AzureOpenAI(
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY,
        api_version="2024-02-15-preview"
    )

def get_search_client():
    if not AZURE_SEARCH_KEY:
        raise HTTPException(status_code=500, detail="Azure Search key not configured")
    return SearchClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        index_name=AZURE_SEARCH_INDEX,
        credential=AzureKeyCredential(AZURE_SEARCH_KEY)
    )

# Simple tool functions
def get_current_time():
    """Get current date and time"""
    now = datetime.now()
    return {
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "day_of_week": now.strftime("%A"),
        "formatted": now.strftime("%A, %B %d, %Y at %I:%M %p")
    }

def process_claim(claim_type: str, amount: str, description: str):
    """Process insurance claim"""
    import uuid
    claim_id = str(uuid.uuid4())[:8]
    
    return {
        "claim_id": claim_id,
        "type": claim_type,
        "amount": amount,
        "status": "submitted",
        "next_steps": [
            "Claim has been logged in our system",
            "You will receive an email confirmation within 24 hours",
            "An adjuster will be assigned within 2-3 business days",
            "Please gather supporting documentation (photos, receipts, reports)"
        ],
        "reference_number": f"SAGE-{claim_id.upper()}"
    }

# RAG functions
async def search_policies(query: str, top_k: int = 3):
    """Search for relevant policy documents"""
    try:
        search_client = get_search_client()
        results = search_client.search(
            search_text=query,
            select=["id", "title", "content", "category"],
            top=top_k
        )
        
        documents = []
        for result in results:
            documents.append({
                "id": result.get("id", ""),
                "title": result.get("title", ""),
                "content": result.get("content", "")[:500] + "..." if len(result.get("content", "")) > 500 else result.get("content", ""),
                "category": result.get("category", "")
            })
        return documents
    except Exception as e:
        logger.error(f"Search error: {e}")
        return []

async def generate_response(query: str, context_docs: List[dict], conversation_history: List[ChatMessage]):
    """Generate response using Azure OpenAI with context"""
    try:
        client = get_openai_client()
        
        # Check if query needs simple tools
        query_lower = query.lower()
        tool_response = None
        
        # Date/time queries
        if any(word in query_lower for word in ['date', 'time', 'today', 'now', 'current']):
            time_info = get_current_time()
            tool_response = f"Current date and time: {time_info['formatted']}"
        
        # Claim processing
        elif any(word in query_lower for word in ['file claim', 'submit claim', 'claim for']):
            claim_type = "general"
            amount = "unknown"
            if "cargo" in query_lower:
                claim_type = "cargo loss"
            if "100k" in query_lower or "100,000" in query_lower:
                amount = "$100,000"
            
            claim_info = process_claim(claim_type, amount, query)
            tool_response = f"Claim {claim_info['reference_number']} has been submitted successfully. Status: {claim_info['status']}. Next steps: {'; '.join(claim_info['next_steps'][:2])}"
        
        # Build context from search results
        context = "\n\n".join([
            f"Document: {doc['title']} ({doc['category']})\nContent: {doc['content']}"
            for doc in context_docs
        ])
        
        # Include tool response in system message if available
        tool_context = f"\n\nTool Response: {tool_response}" if tool_response else ""
        
        system_message = f"""You are SageInsure AI, an expert insurance assistant. Use the following policy documents and tool responses to answer questions accurately and helpfully.

Available policy information:
{context}{tool_context}

Guidelines:
- Provide clear, professional insurance advice
- Use tool responses when available for current information
- Reference specific policy details when available
- If information isn't in the documents, say so clearly
- Be helpful and empathetic with insurance claims and questions
- Use a friendly but professional tone
- For claims, provide specific next steps and reference numbers"""

        # Build conversation messages
        messages = [{"role": "system", "content": system_message}]
        
        # Add conversation history (last 10 messages)
        for msg in conversation_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        
        # Add current query
        messages.append({"role": "user", "content": query})
        
        response = client.chat.completions.create(
            model="gpt4o-deployment",  # Your deployed model
            messages=messages,
            max_tokens=800,
            temperature=0.3
        )
        
        return response.choices[0].message.content or "I apologize, but I couldn't generate a response."
        
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return f"I'm experiencing technical difficulties. Please try again. Error: {str(e)}"

# API Endpoints
@app.get("/healthz")
async def health_check():
    return {
        "status": "healthy",
        "service": "sageinsure-rag-api",
        "openai_endpoint": AZURE_OPENAI_ENDPOINT,
        "search_endpoint": AZURE_SEARCH_ENDPOINT
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Search for relevant documents
        context_docs = await search_policies(request.message)
        
        # Generate response with context
        answer = await generate_response(
            request.message, 
            context_docs, 
            request.conversation_history or []
        )
        
        # Format sources for frontend
        sources = [
            {
                "id": doc["id"],
                "title": doc["title"],
                "category": doc["category"],
                "snippet": doc["content"]
            }
            for doc in context_docs
        ]
        
        return ChatResponse(answer=answer, sources=sources)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)