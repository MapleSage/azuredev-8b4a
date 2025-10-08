"""
Azure AgentCore-equivalent RAG system for SageInsure
Following .kiro specs with Azure AI services, MCP protocol, and multi-agent architecture
"""
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import os
from datetime import datetime
import logging
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SageInsure Azure AgentCore",
    description="Multi-agent RAG system with MCP protocol",
    version="2.0.0"
)

# Pydantic Models
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None
    agent_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[ChatMessage] = []
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]]
    conversation_id: str
    agent_trace: List[Dict[str, Any]]
    memory_context: Dict[str, Any]

# Azure AgentCore Runtime equivalent
class AzureAgentRuntime:
    def __init__(self):
        self.agents = {}
        self.tools = {}
        self.memory_store = {}
        
    def search_policies(self, query: str) -> List[Dict[str, Any]]:
        """Search using Azure Cognitive Search API"""
        try:
            url = f"{os.getenv('AZURE_SEARCH_ENDPOINT')}/indexes/{os.getenv('AZURE_SEARCH_INDEX', 'policy-index')}/docs/search"
            headers = {
                "api-key": os.getenv("AZURE_SEARCH_API_KEY"),
                "Content-Type": "application/json"
            }
            data = {"search": query, "top": 5}
            
            response = requests.post(f"{url}?api-version=2023-11-01", headers=headers, json=data)
            results = response.json().get("value", [])
            
            return [
                {
                    "id": doc.get("id", "unknown"),
                    "title": doc.get("title", "Untitled"),
                    "content": doc.get("content", "")[:500],
                    "category": doc.get("category", "General"),
                    "effectiveDate": doc.get("effectiveDate", "Unknown")
                }
                for doc in results
            ]
        except Exception as e:
            logger.error(f"Search error: {e}")
            return []
    
    def generate_response(self, query: str, context_docs: List[Dict], memory: Dict) -> str:
        """Generate response using Azure OpenAI API"""
        try:
            context = "\n".join([f"{doc['title']}: {doc['content']}" for doc in context_docs])
            
            messages = [
                {
                    "role": "system", 
                    "content": f"You are an insurance assistant. Use this context: {context}"
                },
                {"role": "user", "content": query}
            ]
            
            url = f"{os.getenv('AZURE_OPENAI_ENDPOINT')}/openai/deployments/{os.getenv('AZURE_OPENAI_DEPLOYMENT')}/chat/completions"
            headers = {
                "api-key": os.getenv("AZURE_OPENAI_API_KEY"),
                "Content-Type": "application/json"
            }
            data = {"messages": messages, "max_tokens": 500}
            
            response = requests.post(f"{url}?api-version=2024-02-15-preview", headers=headers, json=data)
            result = response.json()
            
            return result["choices"][0]["message"]["content"]
            
        except Exception as e:
            logger.error(f"Generation error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Initialize runtime
runtime = AzureAgentRuntime()

# Agent Classes
class PolicySearchAgent:
    def __init__(self):
        self.agent_id = "policy-search-agent"
        self.role = "Policy Document Retrieval"
        
    async def execute(self, query: str, context: Dict) -> Dict[str, Any]:
        logger.info(f"[{self.agent_id}] Searching for: {query}")
        documents = runtime.search_policies(query)
        return {
            "agent_id": self.agent_id,
            "action": "search_policies",
            "documents": documents,
            "count": len(documents)
        }

class RAGAgent:
    def __init__(self):
        self.agent_id = "rag-orchestrator"
        self.role = "Response Generation"
        
    async def execute(self, query: str, documents: List[Dict], memory: Dict) -> Dict[str, Any]:
        logger.info(f"[{self.agent_id}] Generating response")
        answer = runtime.generate_response(query, documents, memory)
        return {
            "agent_id": self.agent_id,
            "action": "generate_response",
            "answer": answer,
            "length": len(answer)
        }

class MemoryAgent:
    def __init__(self):
        self.agent_id = "memory-agent"
        self.role = "Context Management"
        
    async def get_memory(self, session_id: str) -> Dict[str, Any]:
        return runtime.memory_store.get(session_id, {
            "summary": "",
            "conversation_count": 0,
            "topics": []
        })
    
    async def update_memory(self, session_id: str, query: str, response: str) -> Dict[str, Any]:
        memory = await self.get_memory(session_id)
        memory["conversation_count"] += 1
        memory["last_query"] = query[:100]
        memory["last_response"] = response[:100]
        memory["updated"] = datetime.now().isoformat()
        runtime.memory_store[session_id] = memory
        return memory

# Initialize agents
policy_agent = PolicySearchAgent()
rag_agent = RAGAgent()
memory_agent = MemoryAgent()

# API Endpoints
@app.get("/healthz")
async def health_check():
    return {
        "status": "healthy",
        "service": "sageinsure-azure-agentcore",
        "agents": [policy_agent.agent_id, rag_agent.agent_id, memory_agent.agent_id],
        "version": "2.0.0"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Multi-agent RAG chat with MCP protocol"""
    try:
        session_id = request.session_id or f"session-{int(datetime.now().timestamp())}"
        agent_trace = []
        
        # Agent 1: Memory retrieval
        memory_context = await memory_agent.get_memory(session_id)
        agent_trace.append({
            "agent": memory_agent.agent_id,
            "action": "get_memory",
            "result": f"Retrieved session context"
        })
        
        # Agent 2: Policy search
        search_result = await policy_agent.execute(request.message, memory_context)
        documents = search_result["documents"]
        agent_trace.append({
            "agent": policy_agent.agent_id,
            "action": "search_policies",
            "result": f"Found {len(documents)} documents"
        })
        
        # Agent 3: Response generation
        rag_result = await rag_agent.execute(request.message, documents, memory_context)
        answer = rag_result["answer"]
        agent_trace.append({
            "agent": rag_agent.agent_id,
            "action": "generate_response",
            "result": f"Generated {len(answer)} char response"
        })
        
        # Agent 4: Memory update
        updated_memory = await memory_agent.update_memory(session_id, request.message, answer)
        agent_trace.append({
            "agent": memory_agent.agent_id,
            "action": "update_memory",
            "result": f"Updated conversation #{updated_memory['conversation_count']}"
        })
        
        # Format sources
        sources = [
            {
                "id": doc["id"],
                "title": doc["title"],
                "category": doc["category"],
                "snippet": doc["content"]
            }
            for doc in documents
        ]
        
        return ChatResponse(
            answer=answer,
            sources=sources,
            conversation_id=session_id,
            agent_trace=agent_trace,
            memory_context=updated_memory
        )
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/agents")
async def list_agents():
    """List available agents"""
    return {
        "agents": [
            {"id": policy_agent.agent_id, "role": policy_agent.role},
            {"id": rag_agent.agent_id, "role": rag_agent.role},
            {"id": memory_agent.agent_id, "role": memory_agent.role}
        ]
    }

@app.get("/memory/{session_id}")
async def get_session_memory(session_id: str):
    """Get session memory"""
    memory = await memory_agent.get_memory(session_id)
    return {"session_id": session_id, "memory": memory}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)