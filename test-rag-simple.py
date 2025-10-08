#!/usr/bin/env python3
"""
Simple test script for Azure OpenAI GPT + Cognitive Search RAG System
"""
import subprocess
import json

def test_search_service():
    """Test Azure Cognitive Search with curl"""
    print("🔍 Testing Azure Cognitive Search...")
    
    # Test search with curl
    cmd = [
        "curl", "-s",
        "-H", "api-key: bzPZEpmcDDYEDwrOe6mRyO0oty0z3Sdv8dGrV5y7icAzSeDzrolq",
        "https://sageinsure-search.search.windows.net/indexes/policy-index/docs?api-version=2023-11-01&search=auto%20insurance&$top=3&$select=id,title,category"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        documents = data.get('value', [])
        
        print(f"✅ Found {len(documents)} documents:")
        for doc in documents:
            print(f"  - {doc.get('title', 'N/A')} ({doc.get('category', 'N/A')})")
        
        return documents
    except Exception as e:
        print(f"❌ Search test failed: {e}")
        return []

def test_openai_service():
    """Test Azure OpenAI GPT with curl"""
    print("🤖 Testing Azure OpenAI GPT...")
    
    # Get API key
    try:
        result = subprocess.run([
            "az", "cognitiveservices", "account", "keys", "list",
            "--name", "sageinsure-openai",
            "--resource-group", "sageinsure-rg",
            "--query", "key1",
            "--output", "tsv"
        ], capture_output=True, text=True, check=True)
        api_key = result.stdout.strip()
    except Exception as e:
        print(f"❌ Could not get OpenAI API key: {e}")
        return None
    
    # Test completion with curl
    payload = {
        "messages": [
            {"role": "system", "content": "You are a helpful insurance assistant."},
            {"role": "user", "content": "What is auto insurance?"}
        ],
        "max_tokens": 100,
        "temperature": 0.3
    }
    
    cmd = [
        "curl", "-s",
        "-H", "Content-Type: application/json",
        "-H", f"api-key: {api_key}",
        "-d", json.dumps(payload),
        "https://sageinsure-openai.openai.azure.com/openai/deployments/gpt4o-deployment/chat/completions?api-version=2024-02-15-preview"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        
        if 'choices' in data and len(data['choices']) > 0:
            answer = data['choices'][0]['message']['content']
            print(f"✅ GPT Response: {answer[:100]}...")
            return answer
        else:
            print(f"❌ Unexpected response: {data}")
            return None
    except Exception as e:
        print(f"❌ OpenAI test failed: {e}")
        return None

def main():
    """Main test function"""
    print("🎯 Azure OpenAI GPT + Cognitive Search RAG System Test")
    print("=" * 60)
    
    # Test search service
    search_docs = test_search_service()
    print()
    
    # Test OpenAI service
    openai_response = test_openai_service()
    print()
    
    # Summary
    print("📊 System Status:")
    if search_docs:
        print("✅ Azure Cognitive Search: Operational")
        print(f"✅ Policy Documents Indexed: {len(search_docs)}")
    else:
        print("❌ Azure Cognitive Search: Issues detected")
    
    if openai_response:
        print("✅ Azure OpenAI GPT-4o: Operational")
    else:
        print("❌ Azure OpenAI GPT-4o: Issues detected")
    
    if search_docs and openai_response:
        print("🎉 RAG System: Ready for deployment!")
        print()
        print("🚀 Next Steps:")
        print("1. Deploy application to AKS cluster")
        print("2. Configure ingress and SSL certificates")
        print("3. Set up monitoring and alerting")
        print("4. Load additional policy documents")
    else:
        print("⚠️  RAG System: Needs attention")

if __name__ == "__main__":
    main()