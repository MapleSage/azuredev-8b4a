from dotenv import load_dotenv
import os
import json
import logging
from typing import List, Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import AzureOpenAI
from openai.types.chat import ChatCompletionMessageParam
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from azure.storage.blob import BlobServiceClient

# Load environment variables
load_dotenv()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Azure Insurance Chat API",
    description="Backend API for insurance policy chat application",
    version="1.0.0"
)

# -------------------------------
# CORS Middleware
# -------------------------------
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:3001,https://sageinsure.maplesage.com"
)
cors_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------------
# Pydantic Models
# -------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    answer: str
    sources: List[dict]
    conversation_id: Optional[str] = None

class UploadResponse(BaseModel):
    message: str
    document_id: str

# -------------------------------
# Azure Client Helpers
# -------------------------------
def get_openai_client():
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    if not endpoint or not api_key:
        raise HTTPException(status_code=500, detail="Azure OpenAI not configured")
    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version="2024-02-15-preview"
    )

def get_search_client():
    endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    api_key = os.getenv("AZURE_SEARCH_KEY")
    index_name = os.getenv("AZURE_SEARCH_INDEX", "policy-index")
    if not endpoint or not api_key:
        raise HTTPException(status_code=500, detail="Azure Search not configured")
    return SearchClient(endpoint=endpoint, index_name=index_name, credential=AzureKeyCredential(api_key))

def get_storage_client():
    account_name = os.getenv("AZURE_STORAGE_ACCOUNT")
    account_key = os.getenv("STORAGE_ACCOUNT_KEY")
    container_name = os.getenv("POLICY_DOCS_CONTAINER", "policy-docs")
    if not account_name or not account_key:
        raise HTTPException(status_code=500, detail="Azure Storage not configured")
    return BlobServiceClient(account_url=f"https://{account_name}.blob.core.windows.net", credential=account_key), container_name

# -------------------------------
# Config helpers
# -------------------------------
def is_openai_configured() -> bool:
    return bool(os.getenv("AZURE_OPENAI_ENDPOINT")) and bool(os.getenv("AZURE_OPENAI_API_KEY"))

def is_search_configured() -> bool:
    return bool(os.getenv("AZURE_SEARCH_ENDPOINT")) and bool(os.getenv("AZURE_SEARCH_KEY"))

# -------------------------------
# RAG pipeline functions
# -------------------------------
async def search_policies(query: str, top_k: int = 5):
    if not is_search_configured():
        logger.warning("Azure Search not configured; returning no context")
        return []
    try:
        search_client = get_search_client()
        results = search_client.search(
            search_text=query,
            select=["id", "title", "content", "category", "effectiveDate"],
            top=top_k,
            query_type="semantic",
            query_language="en-us"
        )
        documents = []
        for result in results:
            documents.append({
                "id": result["id"],
                "title": result["title"],
                "content": result["content"][:500] + "..." if len(result["content"]) > 500 else result["content"],
                "category": result["category"],
                "effectiveDate": result["effectiveDate"]
            })
        return documents
    except Exception as e:
        logger.error(f"Search error: {e}")
        return []

async def generate_response(query: str, context_docs: List[dict], conversation_history: Optional[List[ChatMessage]]):
    conversation_history = conversation_history or []
    if not is_openai_configured():
        logger.warning("Azure OpenAI not configured; returning fallback answer")
        fallback = (
            "Developer mode: Azure OpenAI is not configured. "
            "Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT.\n\n"
            f"Your question: {query}\n"
            + ("\nNo policy context available." if not context_docs else "")
        )
        return fallback
    try:
        client = get_openai_client()
        context = "\n\n".join([
            f"Document {i+1} ({doc['category']}): {doc['content']}"
            for i, doc in enumerate(context_docs)
        ])
        system_message = f"""You are an expert insurance assistant. Use the following policy documents to answer questions accurately and helpfully.

Available policy information:
{context}

Guidelines:
- Only provide information that can be supported by the policy documents
- If information is not available in the documents, say so clearly
- Be specific about policy details, coverage, and requirements
- Use clear, professional language
- Cite which document(s) you're referencing when possible"""
        messages: List[ChatCompletionMessageParam] = [
            ChatCompletionMessageParam(role="system", content=system_message)
        ] + [
            ChatCompletionMessageParam(role=msg.role, content=msg.content)
            for msg in conversation_history[-10:]
        ] + [
            ChatCompletionMessageParam(role="user", content=query)
        ]
        response = client.chat.completions.create(
            model=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4"),
            messages=messages,
            max_tokens=800,
            temperature=0.3,
            top_p=0.95
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate response")

# -------------------------------
# API Endpoints
# -------------------------------
@app.get("/healthz")
async def health_check():
    return {
        "status": "healthy",
        "service": "azure-insurance-chat-api",
        "openai_configured": is_openai_configured(),
        "search_configured": is_search_configured(),
        "cors_origins": cors_origins
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        context_docs = await search_policies(request.message)
        answer = await generate_response(request.message, context_docs, request.conversation_history)
        sources = [
            {"id": doc["id"], "title": doc["title"], "category": doc["category"], "snippet": doc["content"]}
            for doc in context_docs
        ]
        return ChatResponse(answer=answer or "", sources=sources, conversation_id=None)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to process chat request")

@app.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...), category: str = Form(...), title: str = Form(...)):
    try:
        if not (file.filename or "").endswith(".json"):
            raise HTTPException(status_code=400, detail="Only JSON files are supported")
        content = await file.read()
        try:
            policy_data = json.loads(content.decode('utf-8'))
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON content")
        policy_data.update({"category": category, "title": title, "uploadDate": "2024-01-01T00:00:00Z"})
        storage_client, container_name = get_storage_client()
        container_client = storage_client.get_container_client(container_name)
        doc_id = f"{category}_{title.replace(' ', '_')}_{file.filename}"
        blob_client = container_client.get_blob_client(doc_id)
        blob_client.upload_blob(json.dumps(policy_data, indent=2), overwrite=True)
        logger.info(f"Document uploaded: {doc_id}")
        return UploadResponse(message="Document uploaded successfully", document_id=doc_id)
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@app.get("/documents")
async def list_documents():
    try:
        search_client = get_search_client()
        results = search_client.search(search_text="*", select=["id", "title", "category", "effectiveDate"], top=100)
        documents = [{"id": r["id"], "title": r["title"], "category": r["category"], "effectiveDate": r["effectiveDate"]} for r in results]
        return {"documents": documents, "count": len(documents)}
    except Exception as e:
        logger.error(f"List documents error: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")

# -------------------------------
# Run locally
# -------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
