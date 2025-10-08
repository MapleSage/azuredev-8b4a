#!/usr/bin/env python3
"""
Quick fix script to test the backend locally and verify the fixes
"""
import asyncio
import httpx
from app import app
import uvicorn
import threading
import time

async def test_endpoints():
    """Test the backend endpoints"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        print("🧪 Testing Backend Endpoints...")
        print("=" * 40)
        
        # Test root endpoint
        try:
            response = await client.get(f"{base_url}/")
            print(f"✅ Root endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Message: {data.get('message')}")
        except Exception as e:
            print(f"❌ Root endpoint failed: {e}")
        
        # Test health endpoint
        try:
            response = await client.get(f"{base_url}/health")
            print(f"✅ Health endpoint: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   Status: {data.get('status')}")
                print(f"   OpenAI: {'✅' if data.get('openai_configured') else '❌'}")
                print(f"   Search: {'✅' if data.get('search_configured') else '❌'}")
        except Exception as e:
            print(f"❌ Health endpoint failed: {e}")
        
        # Test healthz endpoint (legacy)
        try:
            response = await client.get(f"{base_url}/healthz")
            print(f"✅ Healthz endpoint: {response.status_code}")
        except Exception as e:
            print(f"❌ Healthz endpoint failed: {e}")
        
        print("=" * 40)

def run_server():
    """Run the server in a separate thread"""
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")

if __name__ == "__main__":
    print("🚀 Starting Quick Fix Test...")
    
    # Start server in background
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    print("⏳ Waiting for server to start...")
    time.sleep(3)
    
    # Run tests
    asyncio.run(test_endpoints())
    
    print("✅ Quick fix test completed!")
    print("💡 If tests pass, the backend is ready for deployment")