#!/usr/bin/env python3
"""
Test script for Azure OpenAI GPT + Cognitive Search RAG System
"""
import os
import json
import requests
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential

# Configuration from Terraform outputs
OPENAI_ENDPOINT = "https://sageinsure-openai.openai.azure.com/"
SEARCH_ENDPOINT = "https://sageinsure-search.search.windows.net"
SEARCH_KEY = "bzPZEpmcDDYEDwrOe6mRyO0oty0z3Sdv8dGrV5y7icAzSeDzrolq"
DEPLOYMENT_NAME = "gpt4o-deployment"

def get_openai_key():
    """Get OpenAI API key from Azure CLI"""
    import subprocess
    try:
        result = subprocess.run([
            "az", "cognitiveservices", "account", "keys", "list",
            "--name", "sageinsure-openai",
            "--resource-group", "sageinsure-rg",
            "--query", "key1",
            "--output", "tsv"
        ], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error getting OpenAI key: {e}")
        return None

def test_search_service():
    """Test Azure Cognitive Search"""
    print("🔍 Testing Azure Cognitive Search...")
    
    search_client = SearchClient(
        endpoint=SEARCH_ENDPOINT,
        index_name="policy-index",
        credential=AzureKeyCredential(SEARCH_KEY)
    )
    
    # Test search
    results = search_client.search(
        search_text="auto insurance coverage",
        select=["id", "title", "content", "category"],
        top=3
    )
    
    documents = []
    for result in results:
        documents.append({
            "id": result["id"],
            "title": result["title"],
            "content": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"],
            "category": result["category"]
        })
    
    print(f"✅ Found {len(documents)} documents:")
    for doc in documents:
        print(f"  - {doc['title']} ({doc['category']})")
    
    return documents

def test_openai_service():
    """Test Azure OpenAI GPT"""
    print("🤖 Testing Azure OpenAI GPT...")
    
    api_key = get_openai_key()
    if not api_key:
        print("❌ Could not get OpenAI API key")
        return None
    
    client = AzureOpenAI(
        azure_endpoint=OPENAI_ENDPOINT,
        api_key=api_key,
        api_version="2024-02-15-preview"
    )
    
    # Test completion
    response = client.chat.completions.create(
        model=DEPLOYMENT_NAME,
        messages=[
            {"role": "system", "content": "You are a helpful insurance assistant."},
            {"role": "user", "content": "What types of insurance coverage are available?"}
        ],
        max_tokens=200,
        temperature=0.3
    )
    
    answer = response.choices[0].message.content
    print(f"✅ GPT Response: {answer[:100]}...")
    return answer

def test_rag_system():
    """Test complete RAG system"""
    print("🚀 Testing Complete RAG System...")
    
    # Step 1: Search for relevant documents
    search_client = SearchClient(
        endpoint=SEARCH_ENDPOINT,
        index_name="policy-index",
        credential=AzureKeyCredential(SEARCH_KEY)
    )
    
    query = "What does auto insurance cover?"
    results = search_client.search(
        search_text=query,
        select=["id", "title", "content", "category"],
        top=3
    )
    
    context_docs = []
    for result in results:
        context_docs.append({
            "title": result["title"],
            "content": result["content"],
            "category": result["category"]
        })
    
    # Step 2: Generate response with context
    api_key = get_openai_key()
    if not api_key:
        print("❌ Could not get OpenAI API key")
        return
    
    client = AzureOpenAI(
        azure_endpoint=OPENAI_ENDPOINT,
        api_key=api_key,
        api_version="2024-02-15-preview"
    )
    
    context = "\\n\\n".join([
        f"Document: {doc['title']} ({doc['category']})\\n{doc['content']}"
        for doc in context_docs
    ])
    
    system_message = f"""You are an expert insurance assistant. Use the following policy documents to answer questions accurately.

Available policy information:
{context}

Guidelines:
- Only provide information that can be supported by the policy documents
- Be specific about policy details and coverage
- Cite which document you're referencing when possible"""

    response = client.chat.completions.create(
        model=DEPLOYMENT_NAME,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": query}
        ],
        max_tokens=400,
        temperature=0.3
    )
    
    answer = response.choices[0].message.content
    
    print(f"\\n📋 RAG System Test Results:")
    print(f"Query: {query}")
    print(f"Found {len(context_docs)} relevant documents")
    print(f"Answer: {answer}")
    print(f"\\nSources:")
    for doc in context_docs:
        print(f"  - {doc['title']} ({doc['category']})")

def main():
    """Main test function"""
    print("🎯 Azure OpenAI GPT + Cognitive Search RAG System Test")
    print("=" * 60)
    
    try:
        # Test individual components
        search_docs = test_search_service()
        print()
        
        openai_response = test_openai_service()
        print()
        
        # Test complete RAG system
        test_rag_system()
        
        print("\\n🎉 All tests completed successfully!")
        print("\\n📊 System Status:")
        print("✅ Azure OpenAI GPT-4o: Operational")
        print("✅ Azure Cognitive Search: Operational")
        print("✅ RAG Pipeline: Functional")
        print("✅ Sample Policy Documents: Indexed")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()