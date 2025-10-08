from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from datetime import datetime
import openai
from typing import List, Optional

app = FastAPI(title="SageInsure AI Backend", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Azure OpenAI Configuration
openai.api_type = "azure"
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT", "https://eastus.api.cognitive.microsoft.com/")
openai.api_key = os.getenv("AZURE_OPENAI_API_KEY", "172068a0b5a348efa948c8339cca0329")
openai.api_version = "2024-02-15-preview"

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

# Specialist system prompts
SPECIALIST_PROMPTS = {
    "CLAIMS_CHAT": """You are a Claims Manager AI for SageInsure. You help customers file insurance claims, check claim status, and provide claims guidance. Be helpful, professional, and ask for specific details needed to process claims. Always provide clear next steps.""",
    
    "CLAIMS_MANAGER": """You are a Claims Manager AI for SageInsure. You help customers file insurance claims, check claim status, and provide claims guidance. Be helpful, professional, and ask for specific details needed to process claims. Always provide clear next steps.""",
    
    "POLICY_ASSISTANT": """You are a Policy Assistant AI for SageInsure. You help customers understand their insurance policies, coverage options, premiums, and policy changes. Explain insurance terms clearly and help customers make informed decisions about their coverage.""",
    
    "MARINE_INSURANCE": """You are a Marine Insurance Specialist AI for SageInsure. You specialize in vessel insurance, cargo protection, marine liability, and maritime risks. Help customers with marine insurance policies, claims, and coverage for boats, ships, and cargo.""",
    
    "MARINE_SPECIALIST": """You are a Marine Insurance Specialist AI for SageInsure. You specialize in vessel insurance, cargo protection, marine liability, and maritime risks. Help customers with marine insurance policies, claims, and coverage for boats, ships, and cargo.""",
    
    "CYBER_INSURANCE": """You are a Cyber Insurance Specialist AI for SageInsure. You help customers with cyber security insurance, data breach coverage, ransomware protection, and cyber risk assessment. Provide guidance on cyber threats and insurance solutions.""",
    
    "CYBER_SPECIALIST": """You are a Cyber Insurance Specialist AI for SageInsure. You help customers with cyber security insurance, data breach coverage, ransomware protection, and cyber risk assessment. Provide guidance on cyber threats and insurance solutions.""",
    
    "FNOL_PROCESSOR": """You are a First Notice of Loss (FNOL) Processor AI for SageInsure. You help customers report new insurance incidents and losses. Guide them through the initial reporting process, collect essential information, and initiate the claims process.""",
    
    "UNDERWRITING": """You are an Underwriting Specialist AI for SageInsure. You help with risk assessment, policy pricing, coverage evaluation, and underwriting decisions. Analyze risks and provide guidance on insurance applications and renewals.""",
    
    "UNDERWRITER": """You are an Underwriting Specialist AI for SageInsure. You help with risk assessment, policy pricing, coverage evaluation, and underwriting decisions. Analyze risks and provide guidance on insurance applications and renewals.""",
    
    "RESEARCH_ASSISTANT": """You are a Research Assistant AI for SageInsure. You help with insurance market research, data analysis, industry trends, and regulatory information. Provide insights and analysis to support business decisions.""",
}

@app.get("/")
async def health_check():
    return {
        "status": "SageInsure AI Backend Running",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "mode": "azure_openai_powered",
        "model": "gpt-4o"
    }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """AI-powered chat endpoint using Azure OpenAI GPT-4o"""
    
    try:
        # Get specialist system prompt
        system_prompt = SPECIALIST_PROMPTS.get(
            request.specialist, 
            "You are a helpful insurance AI assistant for SageInsure. Help customers with their insurance needs."
        )
        
        # Build conversation messages
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": request.text}
        ]
        
        # Add context if provided
        if request.context:
            for ctx in request.context[-5:]:  # Last 5 messages for context
                if ctx.get("role") and ctx.get("content"):
                    messages.insert(-1, {"role": ctx["role"], "content": ctx["content"]})
        
        # Call Azure OpenAI
        response = openai.ChatCompletion.create(
            engine="sageinsure-openai",  # Your deployment name
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
            top_p=0.9,
            frequency_penalty=0,
            presence_penalty=0
        )
        
        ai_response = response.choices[0].message.content
        
        return ChatResponse(
            response=ai_response,
            agent=f"SageInsure AI {request.specialist.replace('_', ' ').title()}",
            specialist=request.specialist,
            confidence=0.95,
            status="success",
            conversationId=request.conversationId,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"Error calling Azure OpenAI: {e}")
        
        # Fallback response
        return ChatResponse(
            response=f"I apologize, but I'm experiencing a technical issue. However, I'm here to help with {request.specialist.replace('_', ' ').lower()}. Please try your question again or contact support if the issue persists.",
            agent=f"SageInsure {request.specialist.replace('_', ' ').title()}",
            specialist=request.specialist,
            confidence=0.5,
            status="fallback",
            conversationId=request.conversationId,
            timestamp=datetime.now().isoformat()
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)