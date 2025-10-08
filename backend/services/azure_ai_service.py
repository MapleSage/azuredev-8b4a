import openai
import os
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
from typing import Dict, List, Optional
import logging
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)

class AzureAIService:
    """
    Azure AI Service client for integrating with Azure OpenAI and AI Foundry
    Supports both development and production environments with proper authentication
    """
    
    def __init__(self):
        self.setup_credentials()
        self.setup_openai_client()

    def setup_credentials(self):
        """Setup Azure credentials using Managed Identity in production"""
        try:
            environment = os.getenv('ENVIRONMENT', 'development')
            
            if environment == 'production':
                # Use Managed Identity in production (AKS)
                self.credential = ManagedIdentityCredential()
                logger.info("Using Managed Identity for Azure authentication")
            else:
                # Use Default Azure Credential for development
                self.credential = DefaultAzureCredential()
                logger.info("Using Default Azure Credential for development")

            # Setup Key Vault client
            vault_url = os.getenv('AZURE_KEY_VAULT_URL', 'https://kv-sageretailjssso.vault.azure.net/')
            self.secret_client = SecretClient(vault_url=vault_url, credential=self.credential)
            logger.info(f"Key Vault client configured for: {vault_url}")
            
        except Exception as e:
            logger.error(f"Failed to setup Azure credentials: {e}")
            self.credential = None
            self.secret_client = None

    def setup_openai_client(self):
        """Configure OpenAI client for Azure AI Foundry"""
        try:
            # Get OpenAI credentials from Key Vault or environment
            openai_key = self.get_secret('azure-openai-key') or os.getenv('AZURE_OPENAI_API_KEY')
            openai_endpoint = self.get_secret('azure-openai-endpoint') or os.getenv('AZURE_OPENAI_ENDPOINT')

            if not openai_key or not openai_endpoint:
                raise ValueError("Azure OpenAI credentials not found in Key Vault or environment variables")

            # Configure OpenAI for Azure
            openai.api_type = "azure"
            openai.api_base = openai_endpoint
            openai.api_key = openai_key
            openai.api_version = "2024-02-15-preview"

            logger.info("Azure OpenAI client configured successfully")
            logger.info(f"Endpoint: {openai_endpoint}")

        except Exception as e:
            logger.error(f"Failed to configure OpenAI client: {e}")
            # Try fallback to environment variables
            try:
                openai.api_type = "azure"
                openai.api_base = os.getenv('AZURE_OPENAI_ENDPOINT')
                openai.api_key = os.getenv('AZURE_OPENAI_API_KEY')
                openai.api_version = "2024-02-15-preview"
                logger.warning("Using fallback environment variables for OpenAI configuration")
            except Exception as fallback_error:
                logger.error(f"Fallback OpenAI configuration also failed: {fallback_error}")

    @lru_cache(maxsize=50)
    def get_secret(self, secret_name: str) -> Optional[str]:
        """Get secret from Azure Key Vault with caching"""
        if not self.secret_client:
            logger.warning("Key Vault client not available, skipping secret retrieval")
            return None
            
        try:
            secret = self.secret_client.get_secret(secret_name)
            logger.debug(f"Successfully retrieved secret: {secret_name}")
            return secret.value
        except Exception as e:
            logger.warning(f"Failed to get secret {secret_name} from Key Vault: {e}")
            return None

    async def chat_completion(
        self,
        messages: List[Dict],
        user_context: Optional[Dict] = None,
        deployment: str = "gpt-4o",
        temperature: float = 0.7,
        max_tokens: int = 800
    ) -> Dict:
        """
        Generate chat completion with user context for auditing
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            user_context: Optional user context from MSAL token for auditing
            deployment: Azure OpenAI deployment name (default: gpt-4o)
            temperature: Sampling temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            
        Returns:
            Dictionary with response, usage, and model information
        """
        try:
            # Add user context for auditing if available
            if user_context:
                user_id = user_context.get('oid', 'unknown')
                user_email = user_context.get('preferred_username', 'unknown')
                logger.info(f"AI request from user: {user_email} (ID: {user_id})")

            # Validate messages format
            if not messages or not isinstance(messages, list):
                raise ValueError("Messages must be a non-empty list")

            for msg in messages:
                if not isinstance(msg, dict) or 'role' not in msg or 'content' not in msg:
                    raise ValueError("Each message must have 'role' and 'content' fields")

            # Make the OpenAI API call
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai.ChatCompletion.create(
                    engine=deployment,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    top_p=0.9,
                    frequency_penalty=0,
                    presence_penalty=0,
                    user=user_context.get('oid') if user_context else None  # User ID for tracking
                )
            )

            # Extract response data
            result = {
                'response': response.choices[0].message.content,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'model': deployment,
                'finish_reason': response.choices[0].finish_reason
            }

            logger.info(f"AI completion successful. Tokens used: {result['usage']['total_tokens']}")
            return result

        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise Exception(f"AI service unavailable: {str(e)}")

    async def get_embeddings(
        self,
        text: str,
        user_context: Optional[Dict] = None,
        deployment: str = "text-embedding-ada-002"
    ) -> List[float]:
        """
        Generate embeddings for text using Azure OpenAI
        
        Args:
            text: Text to generate embeddings for
            user_context: Optional user context for auditing
            deployment: Embedding model deployment name
            
        Returns:
            List of embedding values
        """
        try:
            if user_context:
                user_email = user_context.get('preferred_username', 'unknown')
                logger.info(f"Embedding request from user: {user_email}")

            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: openai.Embedding.create(
                    engine=deployment,
                    input=text,
                    user=user_context.get('oid') if user_context else None
                )
            )

            embeddings = response.data[0].embedding
            logger.info(f"Embeddings generated successfully. Dimension: {len(embeddings)}")
            return embeddings

        except Exception as e:
            logger.error(f"Embeddings API error: {e}")
            raise Exception(f"Embeddings service unavailable: {str(e)}")

    def health_check(self) -> Dict:
        """
        Check the health of Azure AI services
        
        Returns:
            Dictionary with health status information
        """
        health_status = {
            'azure_ai_service': 'unknown',
            'key_vault': 'unknown',
            'openai_configured': False,
            'credentials': 'unknown'
        }

        try:
            # Check credentials
            if self.credential:
                health_status['credentials'] = 'configured'
            else:
                health_status['credentials'] = 'missing'

            # Check Key Vault access
            if self.secret_client:
                try:
                    # Try to access a test secret (this will fail gracefully if secret doesn't exist)
                    self.secret_client.get_secret('test-connection')
                    health_status['key_vault'] = 'accessible'
                except Exception:
                    # Expected if secret doesn't exist, but Key Vault is accessible
                    health_status['key_vault'] = 'accessible'
            else:
                health_status['key_vault'] = 'not_configured'

            # Check OpenAI configuration
            if hasattr(openai, 'api_key') and openai.api_key and hasattr(openai, 'api_base') and openai.api_base:
                health_status['openai_configured'] = True
                health_status['azure_ai_service'] = 'configured'
            else:
                health_status['azure_ai_service'] = 'not_configured'

        except Exception as e:
            logger.error(f"Health check error: {e}")
            health_status['azure_ai_service'] = 'error'

        return health_status

# Global service instance
azure_ai_service = AzureAIService()