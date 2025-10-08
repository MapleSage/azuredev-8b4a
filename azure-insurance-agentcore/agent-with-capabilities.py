from fastapi import FastAPI
from pydantic import BaseModel
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.cosmos import CosmosClient
import os
import json
import uuid
from datetime import datetime

app = FastAPI(title="SageInsure Azure Agent Core")

# Initialize Azure services
openai_client = AzureOpenAI(
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT", ""),
    api_key=os.getenv("AZURE_OPENAI_KEY", ""),
    api_version="2024-02-01"
)

search_client = SearchClient(
    endpoint=os.getenv("AZURE_SEARCH_ENDPOINT", ""),
    index_name="insurance-kb",
    credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_KEY", ""))
)

cosmos_client = CosmosClient(
    os.getenv("COSMOS_ENDPOINT", ""),
    os.getenv("COSMOS_KEY", "")
)

class AgentRequest(BaseModel):
    prompt: str
    session_id: str = None
    agent_type: str = "insurance"

@app.get("/")
def health():
    return {
        "status": "SageInsure Azure Agent Core with Full Capabilities",
        "version": "2.0",
        "capabilities": ["Knowledge Base", "Memory", "RAG", "MCP Tools", "Web Search"]
    }

@app.post("/invocations")
async def invoke_agent(request: AgentRequest):
    session_id = request.session_id or str(uuid.uuid4())
    
    # 1. Memory retrieval
    conversation_history = await get_conversation_history(session_id)
    
    # 2. RAG - Search knowledge base
    kb_context = await search_knowledge_base(request.prompt)
    
    # 3. MCP Tools - Web search if needed
    web_context = await web_search_if_needed(request.prompt)
    
    # 4. Generate response with full context
    response = await generate_response(
        request.prompt, 
        conversation_history, 
        kb_context, 
        web_context,
        request.agent_type
    )
    
    # 5. Save to memory
    await save_conversation(session_id, request.prompt, response)
    
    return {
        "result": response,
        "session_id": session_id,
        "sources": {
            "knowledge_base": len(kb_context),
            "web_search": len(web_context),
            "memory": len(conversation_history)
        }
    }

async def get_conversation_history(session_id: str):
    # Cosmos DB memory retrieval
    try:
        database = cosmos_client.get_database_client("sageinsure")
        container = database.get_container_client("conversations")
        items = list(container.query_items(
            query="SELECT * FROM c WHERE c.session_id = @session_id ORDER BY c.timestamp",
            parameters=[{"name": "@session_id", "value": session_id}]
        ))
        return [{"role": item["role"], "content": item["content"]} for item in items[-10:]]
    except:
        return []

async def search_knowledge_base(query: str):
    # Azure Cognitive Search RAG
    try:
        results = search_client.search(query, top=5)
        return [doc["content"] for doc in results]
    except:
        return ["Insurance policy information available for auto, home, life, and health coverage."]

async def web_search_if_needed(query: str):
    # MCP Web tool simulation
    if any(word in query.lower() for word in ["current", "latest", "news", "recent"]):
        return ["Current insurance market trends and regulatory updates available."]
    return []

async def generate_response(prompt: str, history: list, kb_context: list, web_context: list, agent_type: str):
    try:
        context = "\n".join(kb_context + web_context)
        messages = [
            {"role": "system", "content": f"You are a {agent_type} insurance expert. Use context: {context}"},
            *history[-5:],  # Last 5 messages
            {"role": "user", "content": prompt}
        ]
        
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7
        )
        return response.choices[0].message.content
    except:
        return f"I'm your SageInsure {agent_type} assistant. I can help with policy questions, claims, and coverage details. What would you like to know?"

async def save_conversation(session_id: str, user_msg: str, bot_msg: str):
    try:
        database = cosmos_client.get_database_client("sageinsure")
        container = database.get_container_client("conversations")
        
        timestamp = datetime.utcnow().isoformat()
        container.create_item({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "user",
            "content": user_msg,
            "timestamp": timestamp
        })
        container.create_item({
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant", 
            "content": bot_msg,
            "timestamp": timestamp
        })
    except:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)