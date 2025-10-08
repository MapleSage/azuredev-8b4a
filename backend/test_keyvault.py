#!/usr/bin/env python3
"""
Test script for Azure Key Vault integration
This script tests the ability to retrieve secrets from Azure Key Vault
"""

import os
import sys
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_keyvault_access():
    """Test Key Vault access with different credential types"""
    
    vault_url = os.getenv('AZURE_KEY_VAULT_URL', 'https://kv-sageretailjssso.vault.azure.net/')
    client_id = os.getenv('AZURE_CLIENT_ID', '27650c1d-91fa-4747-a2fa-1a52813ac5ac')
    
    print(f"🔐 Testing Key Vault access to: {vault_url}")
    print(f"📋 Using Client ID: {client_id}")
    
    # Test with different credential types
    credentials_to_test = [
        ("DefaultAzureCredential", DefaultAzureCredential()),
        ("ManagedIdentityCredential", ManagedIdentityCredential(client_id=client_id))
    ]
    
    secrets_to_test = [
        "azure-client-secret",
        "azure-openai-key", 
        "azure-openai-endpoint"
    ]
    
    for cred_name, credential in credentials_to_test:
        print(f"\n🧪 Testing with {cred_name}...")
        
        try:
            # Create Key Vault client
            secret_client = SecretClient(vault_url=vault_url, credential=credential)
            
            # Test listing secrets (requires read metadata permission)
            try:
                secret_properties = list(secret_client.list_properties_of_secrets())
                print(f"✅ Successfully listed {len(secret_properties)} secrets")
                for prop in secret_properties[:5]:  # Show first 5
                    print(f"   - {prop.name}")
            except Exception as e:
                print(f"⚠️ Could not list secrets: {e}")
            
            # Test retrieving specific secrets
            for secret_name in secrets_to_test:
                try:
                    secret = secret_client.get_secret(secret_name)
                    # Don't print the actual secret value for security
                    print(f"✅ Successfully retrieved secret: {secret_name}")
                    print(f"   - Version: {secret.properties.version}")
                    print(f"   - Created: {secret.properties.created_on}")
                except Exception as e:
                    print(f"❌ Failed to retrieve {secret_name}: {e}")
            
            print(f"✅ {cred_name} test completed successfully")
            return True
            
        except Exception as e:
            print(f"❌ {cred_name} failed: {e}")
            continue
    
    print("❌ All credential types failed")
    return False

def test_environment_variables():
    """Test that required environment variables are set"""
    
    print("\n📋 Checking environment variables...")
    
    required_vars = [
        'AZURE_TENANT_ID',
        'AZURE_CLIENT_ID', 
        'AZURE_KEY_VAULT_URL'
    ]
    
    optional_vars = [
        'AZURE_CLIENT_SECRET',
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_API_KEY'
    ]
    
    all_good = True
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value[:20]}..." if len(value) > 20 else f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
            all_good = False
    
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"ℹ️ {var}: {value[:20]}..." if len(value) > 20 else f"ℹ️ {var}: {value}")
        else:
            print(f"⚠️ {var}: Not set (optional)")
    
    return all_good

def main():
    """Main test function"""
    
    print("🚀 Azure Key Vault Integration Test")
    print("=" * 50)
    
    # Test environment variables
    env_ok = test_environment_variables()
    
    if not env_ok:
        print("\n❌ Environment variables not properly configured")
        print("Please check your .env file or environment settings")
        sys.exit(1)
    
    # Test Key Vault access
    kv_ok = test_keyvault_access()
    
    if kv_ok:
        print("\n🎉 Key Vault integration test PASSED!")
        print("✅ Ready to use Key Vault in production")
    else:
        print("\n❌ Key Vault integration test FAILED!")
        print("Please check:")
        print("1. Azure authentication (az login)")
        print("2. Key Vault access policies")
        print("3. Managed identity configuration (in AKS)")
        print("4. Network connectivity to Key Vault")
        sys.exit(1)

if __name__ == "__main__":
    main()