#!/usr/bin/env python3

import os
import json
from azure.identity import DefaultAzureCredential
from azure.ai.openai import AzureOpenAI
from azure.search.documents.indexes import SearchIndexClient

class SageInsureUnderwriterAgent:
    def __init__(self):
        self.credential = DefaultAzureCredential()
        self.resource_group = 'sageinsure-rg'
        self.location = 'eastus'
        
        # Existing Azure resources
        self.openai_service = 'sageinsure-openai'
        self.search_service = 'sageinsure-search'
        self.storage_account = 'policydocseedfa81f'
        
        self.search_client = SearchIndexClient(
            endpoint=f"https://{self.search_service}.search.windows.net/",
            credential=self.credential
        )

    def create_underwriter_index(self):
        """Create search index for underwriting documents"""
        
        index_schema = {
            "name": "underwriting-guidelines",
            "fields": [
                {"name": "id", "type": "Edm.String", "key": True},
                {"name": "title", "type": "Edm.String", "searchable": True},
                {"name": "content", "type": "Edm.String", "searchable": True},
                {"name": "category", "type": "Edm.String", "filterable": True},
                {"name": "risk_level", "type": "Edm.String", "filterable": True},
                {"name": "policy_type", "type": "Edm.String", "filterable": True},
                {"name": "medical_conditions", "type": "Collection(Edm.String)", "searchable": True},
                {"name": "premium_impact", "type": "Edm.Double", "sortable": True}
            ]
        }
        
        return index_schema

    def deploy_underwriter_agent(self):
        """Deploy the underwriter agent configuration"""
        
        agent_config = {
            "name": "sageinsure-underwriter-agent",
            "model": "gpt-4o",
            "system_prompt": """You are an expert life insurance underwriter with deep knowledge of risk assessment, medical underwriting, and insurance regulations.

Your primary responsibilities:
1. DOCUMENT ANALYSIS: Extract and analyze key information from insurance applications, medical records, and supporting documents
2. RISK ASSESSMENT: Evaluate medical history, lifestyle factors, financial information, and other risk indicators  
3. UNDERWRITING DECISIONS: Provide recommendations on coverage approval, premium adjustments, or additional requirements
4. COMPLIANCE: Ensure all recommendations follow insurance regulations and company guidelines

Always provide:
- Clear risk assessment with supporting evidence
- Specific recommendations with rationale
- Required additional documentation if needed
- Premium adjustment suggestions when applicable
- Compliance notes for regulatory requirements""",
            
            "tools": [
                {
                    "type": "function",
                    "function": {
                        "name": "search_underwriting_guidelines",
                        "description": "Search underwriting guidelines and policies",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string"},
                                "category": {"type": "string"},
                                "risk_level": {"type": "string"}
                            }
                        }
                    }
                }
            ]
        }
        
        return agent_config

    def create_workbench_deployment(self):
        """Create Kubernetes deployment for underwriting workbench"""
        
        k8s_manifest = {
            "apiVersion": "apps/v1",
            "kind": "Deployment", 
            "metadata": {
                "name": "underwriting-workbench",
                "namespace": "sageinsure"
            },
            "spec": {
                "replicas": 2,
                "selector": {
                    "matchLabels": {"app": "underwriting-workbench"}
                },
                "template": {
                    "metadata": {
                        "labels": {"app": "underwriting-workbench"}
                    },
                    "spec": {
                        "containers": [{
                            "name": "workbench",
                            "image": "sageinsureacr.azurecr.io/underwriting-workbench:latest",
                            "ports": [{"containerPort": 8080}],
                            "env": [
                                {"name": "AZURE_OPENAI_ENDPOINT", "value": f"https://{self.openai_service}.openai.azure.com/"},
                                {"name": "AZURE_SEARCH_ENDPOINT", "value": f"https://{self.search_service}.search.windows.net/"},
                                {"name": "AZURE_STORAGE_ACCOUNT", "value": self.storage_account}
                            ]
                        }]
                    }
                }
            }
        }
        
        return k8s_manifest

def main():
    print("🏗️  SageInsure Azure Underwriter Agent Setup")
    print("=" * 50)
    
    agent = SageInsureUnderwriterAgent()
    
    # Create configurations
    index_schema = agent.create_underwriter_index()
    agent_config = agent.deploy_underwriter_agent()
    k8s_manifest = agent.create_workbench_deployment()
    
    # Save configurations
    with open('underwriter-agent-config.json', 'w') as f:
        json.dump(agent_config, f, indent=2)
    
    with open('underwriting-index-schema.json', 'w') as f:
        json.dump(index_schema, f, indent=2)
    
    print("✅ Azure Underwriter Agent Setup Complete!")
    print("Files created:")
    print("- underwriter-agent-config.json")
    print("- underwriting-index-schema.json")

if __name__ == "__main__":
    main()