"""
Health check implementations for SageInsure FastAPI backend
"""
import asyncio
import logging
import time
from typing import Dict, Any, List
from datetime import datetime, timedelta

import httpx
import redis
from sqlalchemy import text
from azure.storage.blob import BlobServiceClient
from azure.keyvault.secrets import SecretClient
from azure.identity import DefaultAzureCredential

from ..database import get_db_session
from ..config import settings

logger = logging.getLogger(__name__)


class HealthCheckStatus:
    """Health check status constants"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"


class HealthChecker:
    """Comprehensive health checker for SageInsure backend"""
    
    def __init__(self):
        self.checks = {
            "database": self._check_database,
            "redis": self._check_redis,
            "azure_storage": self._check_azure_storage,
            "azure_keyvault": self._check_azure_keyvault,
            "azure_openai": self._check_azure_openai,
            "azure_search": self._check_azure_search,
        }
        self.startup_time = datetime.utcnow()
    
    async def health_check(self, include_details: bool = False) -> Dict[str, Any]:
        """
        Perform comprehensive health check
        
        Args:
            include_details: Whether to include detailed check results
            
        Returns:
            Health check results
        """
        start_time = time.time()
        results = {}
        overall_status = HealthCheckStatus.HEALTHY
        
        # Run all health checks concurrently
        tasks = []
        for check_name, check_func in self.checks.items():
            task = asyncio.create_task(self._run_check(check_name, check_func))
            tasks.append(task)
        
        check_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, (check_name, _) in enumerate(self.checks.items()):
            result = check_results[i]
            if isinstance(result, Exception):
                results[check_name] = {
                    "status": HealthCheckStatus.UNHEALTHY,
                    "error": str(result),
                    "timestamp": datetime.utcnow().isoformat()
                }
                overall_status = HealthCheckStatus.UNHEALTHY
            else:
                results[check_name] = result
                if result["status"] == HealthCheckStatus.UNHEALTHY:
                    overall_status = HealthCheckStatus.UNHEALTHY
                elif result["status"] == HealthCheckStatus.DEGRADED and overall_status == HealthCheckStatus.HEALTHY:
                    overall_status = HealthCheckStatus.DEGRADED
        
        # Calculate response time
        response_time = round((time.time() - start_time) * 1000, 2)
        
        health_response = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int((datetime.utcnow() - self.startup_time).total_seconds()),
            "response_time_ms": response_time,
            "version": getattr(settings, 'APP_VERSION', '1.0.0'),
            "environment": settings.ENVIRONMENT
        }
        
        if include_details:
            health_response["checks"] = results
        
        return health_response
    
    async def _run_check(self, check_name: str, check_func) -> Dict[str, Any]:
        """Run individual health check with timeout"""
        try:
            return await asyncio.wait_for(check_func(), timeout=10.0)
        except asyncio.TimeoutError:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": "Health check timed out",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Health check {check_name} failed: {e}")
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            async with get_db_session() as session:
                # Simple connectivity test
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
                
                # Performance test - check query time
                query_start = time.time()
                await session.execute(text("SELECT COUNT(*) FROM information_schema.tables"))
                query_time = (time.time() - query_start) * 1000
                
                response_time = round((time.time() - start_time) * 1000, 2)
                
                status = HealthCheckStatus.HEALTHY
                if query_time > 1000:  # 1 second threshold
                    status = HealthCheckStatus.DEGRADED
                elif query_time > 5000:  # 5 second threshold
                    status = HealthCheckStatus.UNHEALTHY
                
                return {
                    "status": status,
                    "response_time_ms": response_time,
                    "query_time_ms": round(query_time, 2),
                    "timestamp": datetime.utcnow().isoformat()
                }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        if not hasattr(settings, 'REDIS_URL') or not settings.REDIS_URL:
            return {
                "status": HealthCheckStatus.HEALTHY,
                "message": "Redis not configured",
                "timestamp": datetime.utcnow().isoformat()
            }
        
        start_time = time.time()
        
        try:
            redis_client = redis.from_url(settings.REDIS_URL)
            
            # Test basic operations
            test_key = f"health_check_{int(time.time())}"
            redis_client.set(test_key, "test_value", ex=60)
            value = redis_client.get(test_key)
            redis_client.delete(test_key)
            
            if value != b"test_value":
                raise Exception("Redis read/write test failed")
            
            # Check memory usage
            info = redis_client.info("memory")
            memory_usage_mb = info.get("used_memory", 0) / 1024 / 1024
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            status = HealthCheckStatus.HEALTHY
            if memory_usage_mb > 1000:  # 1GB threshold
                status = HealthCheckStatus.DEGRADED
            
            return {
                "status": status,
                "response_time_ms": response_time,
                "memory_usage_mb": round(memory_usage_mb, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_storage(self) -> Dict[str, Any]:
        """Check Azure Storage connectivity"""
        start_time = time.time()
        
        try:
            credential = DefaultAzureCredential()
            blob_client = BlobServiceClient(
                account_url=f"https://{settings.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net",
                credential=credential
            )
            
            # Test connectivity by listing containers
            containers = []
            async for container in blob_client.list_containers():
                containers.append(container.name)
                if len(containers) >= 5:  # Limit to avoid long response times
                    break
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                "status": HealthCheckStatus.HEALTHY,
                "response_time_ms": response_time,
                "containers_count": len(containers),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_keyvault(self) -> Dict[str, Any]:
        """Check Azure Key Vault connectivity"""
        start_time = time.time()
        
        try:
            credential = DefaultAzureCredential()
            secret_client = SecretClient(
                vault_url=f"https://{settings.AZURE_KEYVAULT_NAME}.vault.azure.net/",
                credential=credential
            )
            
            # Test by listing secrets (just check connectivity)
            secrets = []
            for secret in secret_client.list_properties_of_secrets():
                secrets.append(secret.name)
                if len(secrets) >= 5:  # Limit to avoid long response times
                    break
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                "status": HealthCheckStatus.HEALTHY,
                "response_time_ms": response_time,
                "secrets_count": len(secrets),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_openai(self) -> Dict[str, Any]:
        """Check Azure OpenAI service connectivity"""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient() as client:
                # Test with a simple completion request
                response = await client.get(
                    f"{settings.AZURE_OPENAI_ENDPOINT}/openai/deployments",
                    headers={
                        "api-key": settings.AZURE_OPENAI_KEY,
                        "Content-Type": "application/json"
                    },
                    params={"api-version": "2023-12-01-preview"},
                    timeout=5.0
                )
                
                response_time = round((time.time() - start_time) * 1000, 2)
                
                if response.status_code == 200:
                    deployments = response.json().get("data", [])
                    return {
                        "status": HealthCheckStatus.HEALTHY,
                        "response_time_ms": response_time,
                        "deployments_count": len(deployments),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": HealthCheckStatus.UNHEALTHY,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "timestamp": datetime.utcnow().isoformat()
                    }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_search(self) -> Dict[str, Any]:
        """Check Azure Cognitive Search connectivity"""
        start_time = time.time()
        
        try:
            async with httpx.AsyncClient() as client:
                # Test service statistics endpoint
                response = await client.get(
                    f"{settings.AZURE_SEARCH_ENDPOINT}/servicestats",
                    headers={
                        "api-key": settings.AZURE_SEARCH_KEY,
                        "Content-Type": "application/json"
                    },
                    params={"api-version": "2023-11-01"},
                    timeout=5.0
                )
                
                response_time = round((time.time() - start_time) * 1000, 2)
                
                if response.status_code == 200:
                    stats = response.json()
                    return {
                        "status": HealthCheckStatus.HEALTHY,
                        "response_time_ms": response_time,
                        "storage_size_mb": stats.get("counters", {}).get("storageSize", 0) / 1024 / 1024,
                        "document_count": stats.get("counters", {}).get("documentCount", 0),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": HealthCheckStatus.UNHEALTHY,
                        "error": f"HTTP {response.status_code}: {response.text}",
                        "timestamp": datetime.utcnow().isoformat()
                    }
        
        except Exception as e:
            return {
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def readiness_check(self) -> Dict[str, Any]:
        """
        Readiness check - determines if the service is ready to accept traffic
        Only checks critical dependencies
        """
        critical_checks = ["database"]
        
        results = {}
        overall_status = HealthCheckStatus.HEALTHY
        
        for check_name in critical_checks:
            if check_name in self.checks:
                result = await self._run_check(check_name, self.checks[check_name])
                results[check_name] = result
                
                if result["status"] == HealthCheckStatus.UNHEALTHY:
                    overall_status = HealthCheckStatus.UNHEALTHY
        
        return {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "checks": results
        }
    
    async def liveness_check(self) -> Dict[str, Any]:
        """
        Liveness check - determines if the service is alive and should not be restarted
        Simple check that doesn't depend on external services
        """
        return {
            "status": HealthCheckStatus.HEALTHY,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int((datetime.utcnow() - self.startup_time).total_seconds()),
            "message": "Service is alive"
        }


# Global health checker instance
health_checker = HealthChecker()