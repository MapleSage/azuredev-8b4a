from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
import logging
import httpx
import json
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SageInsure AI API", version="3.0.0")

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "https://calm-pond-0b4024e0f-preview.eastus2.1.azurestaticapps.net",
    "https://sageinsure-clean.azurestaticapps.net"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "https://parvinddutta-9607_ai.openai.azure.com/")
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "172068a0b5a348efa948c8339cca0329")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")
API_VERSION = "2024-02-15-preview"

class ChatRequest(BaseModel):
    text: str
    conversationId: str = "session"
    specialist: str = "GENERAL"
    context: List[dict] = []

class ChatResponse(BaseModel):
    response: str
    agent: str
    specialist: str
    confidence: float
    status: str
    conversationId: str
    timestamp: str

class InsuranceAgent:
    def __init__(self):
        self.system_prompts = {
            "GENERAL": """You are SageInsure AI, a knowledgeable insurance assistant. You help customers with:
- Policy information and coverage details
- Claims processing and status updates
- Premium calculations and payment options
- Risk assessment and recommendations
- Insurance product comparisons
- Regulatory compliance questions

Provide accurate, helpful, and professional responses. If you're unsure about specific policy details, recommend contacting their agent.""",
            
            "CLAIMS": """You are a Claims Specialist AI for SageInsure. You specialize in:
- Claims filing procedures and requirements
- Documentation needed for different claim types
- Claims status tracking and updates
- Settlement processes and timelines
- Dispute resolution procedures
- Fraud detection indicators

Be empathetic when dealing with claims, as customers may be stressed. Provide clear, step-by-step guidance.""",
            
            "UNDERWRITING": """You are an Underwriting Specialist AI for SageInsure. You focus on:
- Risk assessment and evaluation
- Policy pricing and premium calculations
- Coverage recommendations based on risk profiles
- Underwriting guidelines and criteria
- Application review processes
- Risk mitigation strategies

Provide detailed analysis while explaining complex underwriting concepts in simple terms.""",
            
            "POLICY": """You are a Policy Specialist AI for SageInsure. You help with:
- Policy terms and conditions explanations
- Coverage limits and deductibles
- Policy modifications and endorsements
- Renewal processes and options
- Beneficiary and coverage changes
- Policy cancellation procedures

Ensure customers understand their policy details and options clearly."""
        }

    async def get_ai_response(self, message: str, specialist: str, context: List[dict] = None) -> Dict[str, Any]:
        try:
            system_prompt = self.system_prompts.get(specialist, self.system_prompts["GENERAL"])
            
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add context if provided
            if context:
                for ctx in context[-5:]:  # Last 5 messages for context
                    if ctx.get("role") and ctx.get("content"):
                        messages.append(ctx)
            
            messages.append({"role": "user", "content": message})
            
            headers = {
                "Content-Type": "application/json",
                "api-key": AZURE_OPENAI_API_KEY
            }
            
            payload = {
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 800,
                "top_p": 0.9,
                "frequency_penalty": 0,
                "presence_penalty": 0
            }
            
            url = f"{AZURE_OPENAI_ENDPOINT}openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={API_VERSION}"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = result["choices"][0]["message"]["content"]
                    
                    return {
                        "response": ai_response,
                        "status": "success",
                        "confidence": 0.95,
                        "usage": result.get("usage", {})
                    }
                else:
                    logger.error(f"Azure OpenAI API error: {response.status_code} - {response.text}")
                    return {
                        "response": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or contact customer service for immediate assistance.",
                        "status": "error",
                        "confidence": 0.5,
                        "error": f"API Error: {response.status_code}"
                    }
                    
        except asyncio.TimeoutError:
            logger.error("Azure OpenAI API timeout")
            return {
                "response": "I'm taking longer than usual to respond. Please try again or contact customer service if you need immediate assistance.",
                "status": "timeout",
                "confidence": 0.5,
                "error": "Request timeout"
            }
        except Exception as e:
            logger.error(f"Error calling Azure OpenAI: {str(e)}")
            return {
                "response": "I'm experiencing technical difficulties right now. Please try again in a moment or contact our customer service team for immediate assistance.",
                "status": "error",
                "confidence": 0.5,
                "error": str(e)
            }

# Initialize the insurance agent
insurance_agent = InsuranceAgent()

@app.get("/")
async def health_check():
    return {
        "status": "SageInsure AI API Running",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "authentication": "MSAL Enabled",
        "azure_openai": "Connected",
        "deployment": AZURE_OPENAI_DEPLOYMENT
    }

@app.get("/health")
async def detailed_health():
    try:
        # Test Azure OpenAI connection
        headers = {
            "Content-Type": "application/json",
            "api-key": AZURE_OPENAI_API_KEY
        }
        
        test_payload = {
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 10
        }
        
        url = f"{AZURE_OPENAI_ENDPOINT}openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version={API_VERSION}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, headers=headers, json=test_payload)
            openai_status = "healthy" if response.status_code == 200 else f"error_{response.status_code}"
    except Exception as e:
        openai_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "healthy",
            "azure_openai": openai_status
        },
        "version": "3.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    logger.info(f"Chat request: {request.text[:100]}... (specialist: {request.specialist})")
    
    try:
        # Get AI response
        ai_result = await insurance_agent.get_ai_response(
            message=request.text,
            specialist=request.specialist,
            context=request.context
        )
        
        response = ChatResponse(
            response=ai_result["response"],
            agent="SageInsure AI",
            specialist=request.specialist,
            confidence=ai_result["confidence"],
            status=ai_result["status"],
            conversationId=request.conversationId,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Response generated successfully (status: {ai_result['status']})")
        return response
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return ChatResponse(
            response="I apologize for the technical difficulty. Please try again or contact our customer service team.",
            agent="SageInsure AI",
            specialist=request.specialist,
            confidence=0.3,
            status="error",
            conversationId=request.conversationId,
            timestamp=datetime.now().isoformat()
        )

@app.post("/specialist-chat")
async def specialist_chat(request: ChatRequest):
    """Enhanced chat endpoint with specialist routing"""
    
    # Route to appropriate specialist based on content
    if not request.specialist or request.specialist == "GENERAL":
        text_lower = request.text.lower()
        if any(word in text_lower for word in ["claim", "accident", "damage", "file claim", "settlement"]):
            request.specialist = "CLAIMS"
        elif any(word in text_lower for word in ["premium", "price", "cost", "quote", "underwrite"]):
            request.specialist = "UNDERWRITING"
        elif any(word in text_lower for word in ["policy", "coverage", "deductible", "terms", "conditions"]):
            request.specialist = "POLICY"
    
    return await chat_endpoint(request)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)