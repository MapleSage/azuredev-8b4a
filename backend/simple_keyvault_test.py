#!/usr/bin/env python3
"""
Simple Key Vault test
"""

import os
import sys

try:
    from azure.identity import DefaultAzureCredential
    from azure.keyvault.secrets import SecretClient
    print("✅ Azure SDK imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

def test_keyvault():
    vault_url = os.getenv('AZURE_KEY_VAULT_URL', 'https://kv-sageretailjssso.vault.azure.net/')
    
    print(f"🔐 Testing Key Vault: {vault_url}")
    
    try:
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=vault_url, credential=credential)
        
        # Try to list secrets
        secrets = list(client.list_properties_of_secrets())
        print(f"✅ Found {len(secrets)} secrets")
        
        return True
    except Exception as e:
        print(f"❌ Key Vault test failed: {e}")
        return False

if __name__ == "__main__":
    test_keyvault()