#!/usr/bin/env python3
"""
Test the frontend-backend integration
"""
import requests
import json
import time

def test_backend_api():
    """Test the backend API endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Backend API Integration")
    print("=" * 40)
    
    # Test health check
    print("1. Testing health check...")
    try:
        response = requests.get(f"{base_url}/healthz", timeout=5)
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ Health check passed")
            print(f"   📊 Status: {health_data.get('status')}")
            print(f"   🔗 OpenAI: {health_data.get('openai_endpoint')}")
            print(f"   🔍 Search: {health_data.get('search_endpoint')}")
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Health check failed: {e}")
        return False
    
    print()
    
    # Test chat endpoint
    print("2. Testing chat endpoint...")
    try:
        chat_request = {
            "message": "What types of insurance policies do you have?",
            "conversation_history": []
        }
        
        response = requests.post(
            f"{base_url}/chat", 
            json=chat_request,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            chat_data = response.json()
            print(f"   ✅ Chat endpoint working")
            print(f"   💬 Response: {chat_data.get('answer', '')[:100]}...")
            print(f"   📚 Sources found: {len(chat_data.get('sources', []))}")
            
            # Show sources
            for i, source in enumerate(chat_data.get('sources', [])[:2]):
                print(f"      Source {i+1}: {source.get('title')} ({source.get('category')})")
        else:
            print(f"   ❌ Chat endpoint failed: {response.status_code}")
            print(f"   📝 Response: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Chat endpoint failed: {e}")
        return False
    
    print()
    print("🎉 Backend API integration test completed successfully!")
    return True

def test_frontend_connection():
    """Test if frontend can connect to backend"""
    print("\n🎨 Testing Frontend Connection")
    print("=" * 40)
    
    # Check if frontend is running
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print("   ✅ Frontend is accessible at http://localhost:3000")
        else:
            print(f"   ⚠️  Frontend returned status: {response.status_code}")
    except requests.exceptions.RequestException:
        print("   ❌ Frontend is not running at http://localhost:3000")
        print("   💡 Start it with: ./start-frontend.sh")
        return False
    
    return True

if __name__ == "__main__":
    print("🏢 SageInsure Frontend-Backend Integration Test")
    print("=" * 50)
    print()
    
    # Test backend
    backend_ok = test_backend_api()
    
    if backend_ok:
        # Test frontend connection
        frontend_ok = test_frontend_connection()
        
        if frontend_ok:
            print("\n🎉 Complete Integration Test PASSED!")
            print("\n📍 Next Steps:")
            print("   1. Open http://localhost:3000 in your browser")
            print("   2. Use demo login: demo@sageinsure.com / demo123")
            print("   3. Start chatting with your RAG system!")
            print("\n💡 Try asking:")
            print("   • 'What insurance policies do you offer?'")
            print("   • 'How do I file an auto insurance claim?'")
            print("   • 'What is covered under marine insurance?'")
        else:
            print("\n⚠️  Backend is working but frontend needs to be started")
    else:
        print("\n❌ Backend API test failed")
        print("💡 Start the backend with: ./start-rag-api.sh")