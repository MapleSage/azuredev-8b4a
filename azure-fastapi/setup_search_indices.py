#!/usr/bin/env python3
"""
Azure Cognitive Search Index Setup Script
Creates specialist-specific search indices with proper schema and semantic configurations
"""

import os
import json
import logging
from typing import Dict, List
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    VectorSearchProfile,
    HnswAlgorithmConfiguration,
    SemanticConfiguration,
    SemanticSearch,
    SemanticField,
    SemanticPrioritizedFields
)
from azure.core.credentials import AzureKeyCredential

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Azure configuration
AZURE_SEARCH_SERVICE = os.getenv("AZURE_SEARCH_SERVICE")
AZURE_SEARCH_KEY = os.getenv("AZURE_SEARCH_KEY")

if not AZURE_SEARCH_SERVICE or not AZURE_SEARCH_KEY:
    raise ValueError("AZURE_SEARCH_SERVICE and AZURE_SEARCH_KEY environment variables are required")

# Initialize search client
search_client = SearchIndexClient(
    endpoint=f"https://{AZURE_SEARCH_SERVICE}.search.windows.net",
    credential=AzureKeyCredential(AZURE_SEARCH_KEY)
)

# Specialist index configurations
SPECIALIST_INDICES = {
    "claims-general-index": {
        "name": "claims-general-index",
        "description": "General claims processing knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single), 
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="claim_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="claim_amount", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="status", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "underwriting-index": {
        "name": "underwriting-index", 
        "description": "Underwriting and risk assessment knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="risk_level", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="coverage_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="premium", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "research-index": {
        "name": "research-index",
        "description": "Life science research and clinical trials knowledge base", 
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="study_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="publication_date", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="authors", type=SearchFieldDataType.String),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "cyber-insurance-index": {
        "name": "cyber-insurance-index",
        "description": "Cyber insurance and security knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="threat_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="severity", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SearchableField(name="mitigation", type=SearchFieldDataType.String),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "fnol-index": {
        "name": "fnol-index",
        "description": "First Notice of Loss processing knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="incident_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="location", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="damage_amount", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "claims-lifecycle-index": {
        "name": "claims-lifecycle-index",
        "description": "Claims lifecycle and workflow management knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="workflow_stage", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="priority", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="assigned_to", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    },
    
    "policy-index": {
        "name": "policy-index",
        "description": "Policy assistance and customer service knowledge base",
        "fields": [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SearchableField(name="title", type=SearchFieldDataType.String),
            SearchableField(name="content", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                       searchable=True, vector_search_dimensions=1536, vector_search_profile_name="vector-profile"),
            SimpleField(name="specialist", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="document_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="policy_type", type=SearchFieldDataType.String, filterable=True, facetable=True),
            SimpleField(name="coverage_limits", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="deductible", type=SearchFieldDataType.Double, filterable=True),
            SimpleField(name="timestamp", type=SearchFieldDataType.DateTimeOffset, filterable=True, sortable=True),
            SearchableField(name="metadata", type=SearchFieldDataType.String)
        ]
    }
}

def create_vector_search_config():
    """Create vector search configuration"""
    return VectorSearch(
        profiles=[
            VectorSearchProfile(
                name="vector-profile",
                algorithm_configuration_name="hnsw-config"
            )
        ],
        algorithms=[
            HnswAlgorithmConfiguration(
                name="hnsw-config",
                parameters={
                    "m": 4,
                    "efConstruction": 400,
                    "efSearch": 500,
                    "metric": "cosine"
                }
            )
        ]
    )

def create_semantic_search_config(index_name: str):
    """Create semantic search configuration for each index"""
    semantic_configs = {
        "claims-general-index": SemanticConfiguration(
            name="claims-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="claim_type"),
                    SemanticField(field_name="status"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "underwriting-index": SemanticConfiguration(
            name="underwriting-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="risk_level"),
                    SemanticField(field_name="coverage_type"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "research-index": SemanticConfiguration(
            name="research-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="study_type"),
                    SemanticField(field_name="authors"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "cyber-insurance-index": SemanticConfiguration(
            name="cyber-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="threat_type"),
                    SemanticField(field_name="severity"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "fnol-index": SemanticConfiguration(
            name="fnol-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="incident_type"),
                    SemanticField(field_name="location"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "claims-lifecycle-index": SemanticConfiguration(
            name="lifecycle-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="workflow_stage"),
                    SemanticField(field_name="priority"),
                    SemanticField(field_name="document_type")
                ]
            )
        ),
        "policy-index": SemanticConfiguration(
            name="policy-semantic-config",
            prioritized_fields=SemanticPrioritizedFields(
                title_field=SemanticField(field_name="title"),
                content_fields=[SemanticField(field_name="content")],
                keywords_fields=[
                    SemanticField(field_name="policy_type"),
                    SemanticField(field_name="coverage_limits"),
                    SemanticField(field_name="document_type")
                ]
            )
        )
    }
    
    config = semantic_configs.get(index_name)
    if config:
        return SemanticSearch(configurations=[config])
    return None

def create_search_index(index_config: Dict) -> SearchIndex:
    """Create a search index with the given configuration"""
    index_name = index_config["name"]
    
    # Create the search index
    index = SearchIndex(
        name=index_name,
        fields=index_config["fields"],
        vector_search=create_vector_search_config(),
        semantic_search=create_semantic_search_config(index_name)
    )
    
    return index

def setup_all_indices():
    """Set up all specialist search indices"""
    logger.info("🚀 Starting Azure Cognitive Search index setup...")
    
    created_indices = []
    updated_indices = []
    failed_indices = []
    
    for index_name, index_config in SPECIALIST_INDICES.items():
        try:
            logger.info(f"📋 Processing index: {index_name}")
            
            # Check if index already exists
            try:
                existing_index = search_client.get_index(index_name)
                logger.info(f"📄 Index {index_name} already exists, updating...")
                
                # Create new index configuration
                new_index = create_search_index(index_config)
                
                # Update the index
                search_client.create_or_update_index(new_index)
                updated_indices.append(index_name)
                logger.info(f"✅ Updated index: {index_name}")
                
            except Exception as e:
                if "not found" in str(e).lower():
                    # Index doesn't exist, create it
                    logger.info(f"🆕 Creating new index: {index_name}")
                    
                    new_index = create_search_index(index_config)
                    search_client.create_index(new_index)
                    created_indices.append(index_name)
                    logger.info(f"✅ Created index: {index_name}")
                else:
                    raise e
                    
        except Exception as e:
            logger.error(f"❌ Failed to process index {index_name}: {e}")
            failed_indices.append((index_name, str(e)))
    
    # Summary
    logger.info("📊 Index setup summary:")
    logger.info(f"✅ Created: {len(created_indices)} indices")
    logger.info(f"🔄 Updated: {len(updated_indices)} indices") 
    logger.info(f"❌ Failed: {len(failed_indices)} indices")
    
    if created_indices:
        logger.info(f"Created indices: {', '.join(created_indices)}")
    
    if updated_indices:
        logger.info(f"Updated indices: {', '.join(updated_indices)}")
        
    if failed_indices:
        logger.error("Failed indices:")
        for index_name, error in failed_indices:
            logger.error(f"  - {index_name}: {error}")
    
    return {
        "created": created_indices,
        "updated": updated_indices,
        "failed": failed_indices
    }

def list_existing_indices():
    """List all existing search indices"""
    logger.info("📋 Listing existing search indices...")
    
    try:
        indices = search_client.list_indexes()
        index_names = [index.name for index in indices]
        
        logger.info(f"Found {len(index_names)} existing indices:")
        for name in index_names:
            logger.info(f"  - {name}")
            
        return index_names
    except Exception as e:
        logger.error(f"❌ Failed to list indices: {e}")
        return []

def delete_index(index_name: str):
    """Delete a specific index"""
    try:
        search_client.delete_index(index_name)
        logger.info(f"🗑️ Deleted index: {index_name}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to delete index {index_name}: {e}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Azure Cognitive Search Index Management")
    parser.add_argument("--action", choices=["setup", "list", "delete"], default="setup",
                       help="Action to perform")
    parser.add_argument("--index", help="Specific index name (for delete action)")
    
    args = parser.parse_args()
    
    if args.action == "setup":
        result = setup_all_indices()
        if result["failed"]:
            exit(1)
    elif args.action == "list":
        list_existing_indices()
    elif args.action == "delete":
        if not args.index:
            logger.error("❌ --index parameter required for delete action")
            exit(1)
        delete_index(args.index)
    
    logger.info("🎉 Script completed!")