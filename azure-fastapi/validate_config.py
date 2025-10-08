#!/usr/bin/env python3
"""
Azure Configuration Validation Script
Validates Azure services connectivity and configuration
"""

import os
import sys
import asyncio
import logging
from typing import Dict, List, Tuple
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from openai import AzureOpenAI

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AzureConfigValidator:
    def __init__(self):
        self.search_service = os.getenv("AZURE_SEARCH_SERVICE")
        self.search_key = os.getenv("AZURE_SEARCH_KEY")
        self.openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        self.openai_key = os.getenv("AZURE_OPENAI_KEY")
        self.openai_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
        self.embedding_deployment = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT", "text-embedding-ada-002")
        self.api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
        
        self.validation_results = []

    def validate_environment_variables(self) -> bool:
        """Validate required environment variables"""
        logger.info("🔍 Validating environment variables...")
        
        required_vars = {
            "AZURE_SEARCH_SERVICE": self.search_service,
            "AZURE_SEARCH_KEY": self.search_key,
            "AZURE_OPENAI_ENDPOINT": self.openai_endpoint,
            "AZURE_OPENAI_KEY": self.openai_key
        }
        
        optional_vars = {
            "AZURE_OPENAI_DEPLOYMENT": self.openai_deployment,
            "AZURE_OPENAI_EMBEDDING_DEPLOYMENT": self.embedding_deployment,
            "AZURE_OPENAI_API_VERSION": self.api_version
        }
        
        all_valid = True
        
        # Check required variables
        for var_name, var_value in required_vars.items():
            if not var_value:
                logger.error(f"❌ Required environment variable {var_name} is not set")
                self.validation_results.append((var_name, False, "Not set"))
                all_valid = False
            else:
                logger.info(f"✅ {var_name}: {'*' * min(len(var_value), 10)}...")
                self.validation_results.append((var_name, True, "Set"))
        
        # Check optional variables
        for var_name, var_value in optional_vars.items():
            if var_value:
                logger.info(f"✅ {var_name}: {var_value}")
                self.validation_results.append((var_name, True, var_value))
            else:
                logger.warning(f"⚠️ Optional variable {var_name} not set, using default")
                self.validation_results.append((var_name, False, "Using default"))
        
        return all_valid

    def validate_azure_search(self) -> bool:
        """Validate Azure Cognitive Search connectivity"""
        logger.info("🔍 Validating Azure Cognitive Search...")
        
        if not self.search_service or not self.search_key:
            logger.error("❌ Azure Search credentials not available")
            return False
        
        try:
            # Test connection to search service
            endpoint = f"https://{self.search_service}.search.windows.net"
            credential = AzureKeyCredential(self.search_key)
            
            # Try to list indices (this validates both endpoint and credentials)
            from azure.search.documents.indexes import SearchIndexClient
            index_client = SearchIndexClient(endpoint=endpoint, credential=credential)
            
            indices = list(index_client.list_indexes())
            logger.info(f"✅ Azure Search connected successfully")
            logger.info(f"📋 Found {len(indices)} search indices:")
            
            for index in indices:
                logger.info(f"  - {index.name}")
            
            self.validation_results.append(("Azure Search Connection", True, f"{len(indices)} indices found"))
            return True
            
        except Exception as e:
            logger.error(f"❌ Azure Search connection failed: {e}")
            self.validation_results.append(("Azure Search Connection", False, str(e)))
            return False

    def validate_azure_openai(self) -> bool:
        """Validate Azure OpenAI connectivity"""
        logger.info("🔍 Validating Azure OpenAI...")
        
        if not self.openai_endpoint or not self.openai_key:
            logger.error("❌ Azure OpenAI credentials not available")
            return False
        
        try:
            # Initialize Azure OpenAI client
            client = AzureOpenAI(
                azure_endpoint=self.openai_endpoint,
                api_key=self.openai_key,
                api_version=self.api_version
            )
            
            # Test chat completion
            logger.info(f"🧪 Testing chat completion with deployment: {self.openai_deployment}")
            response = client.chat.completions.create(
                model=self.openai_deployment,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": "Say 'Azure OpenAI connection test successful'"}
                ],
                max_tokens=50,
                temperature=0
            )
            
            if response.choices and response.choices[0].message:
                logger.info(f"✅ Chat completion successful: {response.choices[0].message.content}")
                self.validation_results.append(("Azure OpenAI Chat", True, "Connection successful"))
            else:
                logger.error("❌ Chat completion returned empty response")
                self.validation_results.append(("Azure OpenAI Chat", False, "Empty response"))
                return False
            
            # Test embeddings
            logger.info(f"🧪 Testing embeddings with deployment: {self.embedding_deployment}")
            embedding_response = client.embeddings.create(
                model=self.embedding_deployment,
                input="Test embedding"
            )
            
            if embedding_response.data and embedding_response.data[0].embedding:
                embedding_dim = len(embedding_response.data[0].embedding)
                logger.info(f"✅ Embeddings successful: {embedding_dim} dimensions")
                self.validation_results.append(("Azure OpenAI Embeddings", True, f"{embedding_dim}D vectors"))
            else:
                logger.error("❌ Embeddings returned empty response")
                self.validation_results.append(("Azure OpenAI Embeddings", False, "Empty response"))
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Azure OpenAI connection failed: {e}")
            self.validation_results.append(("Azure OpenAI Connection", False, str(e)))
            return False

    def validate_search_indices(self) -> bool:
        """Validate that required search indices exist"""
        logger.info("🔍 Validating search indices...")
        
        required_indices = [
            "claims-general-index",
            "underwriting-index", 
            "research-index",
            "cyber-insurance-index",
            "fnol-index",
            "claims-lifecycle-index",
            "policy-index"
        ]
        
        if not self.search_service or not self.search_key:
            logger.error("❌ Azure Search credentials not available")
            return False
        
        try:
            from azure.search.documents.indexes import SearchIndexClient
            endpoint = f"https://{self.search_service}.search.windows.net"
            credential = AzureKeyCredential(self.search_key)
            index_client = SearchIndexClient(endpoint=endpoint, credential=credential)
            
            existing_indices = [index.name for index in index_client.list_indexes()]
            
            missing_indices = []
            for required_index in required_indices:
                if required_index in existing_indices:
                    logger.info(f"✅ Index exists: {required_index}")
                    self.validation_results.append((f"Index: {required_index}", True, "Exists"))
                else:
                    logger.warning(f"⚠️ Index missing: {required_index}")
                    missing_indices.append(required_index)
                    self.validation_results.append((f"Index: {required_index}", False, "Missing"))
            
            if missing_indices:
                logger.warning(f"⚠️ {len(missing_indices)} indices are missing. Run setup_search_indices.py to create them.")
                logger.info("Missing indices:")
                for index in missing_indices:
                    logger.info(f"  - {index}")
                return False
            else:
                logger.info("✅ All required search indices exist")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to validate search indices: {e}")
            self.validation_results.append(("Search Indices Validation", False, str(e)))
            return False

    def test_end_to_end_rag(self) -> bool:
        """Test end-to-end RAG pipeline"""
        logger.info("🔍 Testing end-to-end RAG pipeline...")
        
        try:
            # This would test the full RAG pipeline
            # For now, we'll do a simple test
            
            # Test search
            if not self.search_service or not self.search_key:
                logger.error("❌ Cannot test RAG: Search credentials missing")
                return False
            
            endpoint = f"https://{self.search_service}.search.windows.net"
            credential = AzureKeyCredential(self.search_key)
            
            # Try to search in the policy index (most likely to have data)
            search_client = SearchClient(
                endpoint=endpoint,
                index_name="policy-index",
                credential=credential
            )
            
            # Simple search test
            results = search_client.search(
                search_text="insurance policy",
                top=1
            )
            
            result_count = len(list(results))
            logger.info(f"✅ RAG search test: Found {result_count} results")
            self.validation_results.append(("RAG Pipeline Test", True, f"{result_count} search results"))
            
            return True
            
        except Exception as e:
            logger.error(f"❌ RAG pipeline test failed: {e}")
            self.validation_results.append(("RAG Pipeline Test", False, str(e)))
            return False

    def generate_report(self) -> Dict:
        """Generate validation report"""
        passed = sum(1 for _, success, _ in self.validation_results if success)
        total = len(self.validation_results)
        
        report = {
            "overall_status": "PASS" if passed == total else "FAIL",
            "passed": passed,
            "total": total,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.validation_results
        }
        
        return report

    def print_summary(self, report: Dict):
        """Print validation summary"""
        logger.info("=" * 60)
        logger.info("🎯 AZURE CONFIGURATION VALIDATION SUMMARY")
        logger.info("=" * 60)
        
        status_emoji = "✅" if report["overall_status"] == "PASS" else "❌"
        logger.info(f"{status_emoji} Overall Status: {report['overall_status']}")
        logger.info(f"📊 Success Rate: {report['success_rate']:.1f}% ({report['passed']}/{report['total']})")
        
        logger.info("\n📋 Detailed Results:")
        for test_name, success, details in report["results"]:
            status_emoji = "✅" if success else "❌"
            logger.info(f"{status_emoji} {test_name}: {details}")
        
        if report["overall_status"] == "FAIL":
            logger.info("\n💡 Next Steps:")
            logger.info("1. Fix any missing environment variables")
            logger.info("2. Verify Azure service credentials and permissions")
            logger.info("3. Run setup_search_indices.py to create missing indices")
            logger.info("4. Check Azure service quotas and limits")
        else:
            logger.info("\n🎉 All validations passed! Your Azure configuration is ready.")

async def main():
    """Main validation function"""
    logger.info("🚀 Starting Azure Configuration Validation...")
    
    validator = AzureConfigValidator()
    
    # Run all validations
    validations = [
        ("Environment Variables", validator.validate_environment_variables),
        ("Azure Search", validator.validate_azure_search),
        ("Azure OpenAI", validator.validate_azure_openai),
        ("Search Indices", validator.validate_search_indices),
        ("RAG Pipeline", validator.test_end_to_end_rag)
    ]
    
    overall_success = True
    
    for validation_name, validation_func in validations:
        logger.info(f"\n{'='*20} {validation_name} {'='*20}")
        try:
            success = validation_func()
            if not success:
                overall_success = False
        except Exception as e:
            logger.error(f"❌ Validation {validation_name} failed with exception: {e}")
            overall_success = False
    
    # Generate and print report
    report = validator.generate_report()
    validator.print_summary(report)
    
    # Exit with appropriate code
    sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    asyncio.run(main())