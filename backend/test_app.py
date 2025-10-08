#!/usr/bin/env python3
"""
Test script for the backend application
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🔍 Testing backend application...")
print(f"Environment: {os.getenv('ENVIRONMENT', 'not set')}")
print(f"Azure Tenant ID: {os.getenv('AZURE_TENANT_ID', 'not set')[:20]}...")
print(f"Azure Client ID: {os.getenv('AZURE_CLIENT_ID', 'not set')[:20]}...")

try:
    import app
    print("✅ Backend app imported successfully")
    print(f"✅ MSAL Enabled: {app.MSAL_ENABLED}")
    
    # Test health endpoint
    print("\n🧪 Testing health endpoint...")
    import asyncio
    
    async def test_health():
        result = await app.health_check()
        print(f"✅ Health check: {result['status']}")
        print(f"✅ Authentication: {result['authentication']}")
        return result
    
    health_result = asyncio.run(test_health())
    
    print("\n🎉 Backend test completed successfully!")
    
except Exception as e:
    print(f"❌ Backend test failed: {e}")
    import traceback
    traceback.print_exc()