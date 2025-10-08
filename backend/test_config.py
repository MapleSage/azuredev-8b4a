#!/usr/bin/env python3
"""
Test script to verify Azure Insurance API configuration
"""
import os
import sys
from dotenv import load_dotenv

def test_configuration():
    """Test if all required environment variables are set"""
    
    # Load environment variables
    load_dotenv()
    
    print("🔍 Testing Azure Insurance API Configuration...")
    print("=" * 50)
    
    # Required environment variables
    required_vars = {
        "AZURE_OPENAI_ENDPOINT": os.getenv("AZURE_OPENAI_ENDPOINT"),
        "AZURE_OPENAI_API_KEY": os.getenv("AZURE_OPENAI_API_KEY"),
        "AZURE_OPENAI_DEPLOYMENT": os.getenv("AZURE_OPENAI_DEPLOYMENT"),
        "AZURE_SEARCH_ENDPOINT": os.getenv("AZURE_SEARCH_ENDPOINT"),
        "AZURE_SEARCH_KEY": os.getenv("AZURE_SEARCH_KEY"),
        "AZURE_SEARCH_INDEX": os.getenv("AZURE_SEARCH_INDEX")
    }
    
    # Optional environment variables
    optional_vars = {
        "CORS_ORIGINS": os.getenv("CORS_ORIGINS"),
        "AZURE_STORAGE_ACCOUNT": os.getenv("AZURE_STORAGE_ACCOUNT"),
        "STORAGE_ACCOUNT_KEY": os.getenv("STORAGE_ACCOUNT_KEY"),
        "POLICY_DOCS_CONTAINER": os.getenv("POLICY_DOCS_CONTAINER")
    }
    
    all_configured = True
    
    print("✅ Required Configuration:")
    for var, value in required_vars.items():
        if value:
            print(f"  ✓ {var}: {'*' * min(len(value), 20)}...")
        else:
            print(f"  ❌ {var}: NOT SET")
            all_configured = False
    
    print("\n⚙️  Optional Configuration:")
    for var, value in optional_vars.items():
        if value:
            print(f"  ✓ {var}: {'*' * min(len(value), 20)}...")
        else:
            print(f"  - {var}: Not configured")
    
    print("\n" + "=" * 50)
    
    if all_configured:
        print("🎉 All required configuration is set!")
        print("✅ OpenAI: Configured")
        print("✅ Search: Configured")
        return True
    else:
        print("❌ Missing required configuration!")
        print("⚠️  OpenAI: Not configured (needs API keys)")
        print("⚠️  Search: Not configured (needs API keys)")
        return False

if __name__ == "__main__":
    success = test_configuration()
    sys.exit(0 if success else 1)