#!/usr/bin/env python3
"""
Seed Azure Cognitive Search index with policy documents from storage
Run after Terraform apply to populate the search index
"""
import json
import os
from azure.search.documents import SearchClient
from azure.storage.blob import BlobServiceClient
from azure.core.credentials import AzureKeyCredential

def main():
    # Get configuration from environment (set by Terraform outputs)
    search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    search_key = os.getenv("AZURE_SEARCH_KEY") 
    search_index = os.getenv("AZURE_SEARCH_INDEX", "policy-index")
    storage_account = os.getenv("AZURE_STORAGE_ACCOUNT")
    storage_key = os.getenv("STORAGE_ACCOUNT_KEY")
    container_name = os.getenv("POLICY_DOCS_CONTAINER", "policy-docs")
    
    if not all([search_endpoint, search_key, storage_account, storage_key]):
        print("Missing required environment variables")
        return
    
    # Initialize clients
    search_client = SearchClient(
        endpoint=search_endpoint,
        index_name=search_index,
        credential=AzureKeyCredential(search_key)
    )
    
    blob_client = BlobServiceClient(
        account_url=f"https://{storage_account}.blob.core.windows.net",
        credential=storage_key
    )
    
    # Get container client
    container_client = blob_client.get_container_client(container_name)
    
    # Process each blob in the container
    documents = []
    for blob in container_client.list_blobs():
        print(f"Processing {blob.name}...")
        
        # Download blob content
        blob_client_instance = container_client.get_blob_client(blob.name)
        content = blob_client_instance.download_blob().readall().decode('utf-8')
        
        try:
            # Parse JSON content
            policy_data = json.loads(content)
            
            # Create search document
            document = {
                "id": policy_data.get("id", blob.name.replace(".json", "")),
                "title": policy_data.get("title", ""),
                "content": policy_data.get("content", ""),
                "category": policy_data.get("category", ""),
                "effectiveDate": policy_data.get("effectiveDate", "2024-01-01T00:00:00Z")
            }
            
            documents.append(document)
            
        except json.JSONDecodeError:
            print(f"Skipping {blob.name} - not valid JSON")
            continue
    
    # Upload documents to search index
    if documents:
        result = search_client.upload_documents(documents)
        print(f"Uploaded {len(documents)} documents to search index")
        
        for item in result:
            if not item.succeeded:
                print(f"Failed to upload document {item.key}: {item.error_message}")
    else:
        print("No documents found to upload")

if __name__ == "__main__":
    main()