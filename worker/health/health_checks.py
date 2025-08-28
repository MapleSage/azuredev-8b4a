"""
Health check implementations for SageInsure Worker services
"""
import asyncio
import logging
import time
import os
from typing import Dict, Any
from datetime import datetime

import redis
import httpx
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

logger = logging.getLogger(__name__)


class WorkerHealthChecker:
    """Health checker for SageInsure worker services"""
    
    def __init__(self):
        self.startup_time = datetime.utcnow()
        self.checks = {
            "redis_queue": self._check_redis_queue,
            "azure_storage": self._check_azure_storage,
            "azure_openai": self._check_azure_openai,
            "disk_space": self._check_disk_space,
            "memory": self._check_memory_usage,
        }
    
    async def health_check(self, include_details: bool = False) -> Dict[str, Any]:
        """Comprehensive health check for worker"""
        start_time = time.time()
        results = {}
        overall_status = "healthy"
        
        # Run health checks
        for check_name, check_func in self.checks.items():
            try:
                result = await asyncio.wait_for(check_func(), timeout=10.0)
                results[check_name] = result
                
                if result["status"] == "unhealthy":
                    overall_status = "unhealthy"
                elif result["status"] == "degraded" and overall_status == "healthy":
                    overall_status = "degraded"
                    
            except Exception as e:
                results[check_name] = {
                    "status": "unhealthy",
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                }
                overall_status = "unhealthy"
        
        response_time = round((time.time() - start_time) * 1000, 2)
        
        health_response = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int((datetime.utcnow() - self.startup_time).total_seconds()),
            "response_time_ms": response_time,
            "worker_type": os.getenv("WORKER_TYPE", "general"),
            "environment": os.getenv("ENVIRONMENT", "development")
        }
        
        if include_details:
            health_response["checks"] = results
        
        return health_response
    
    async def _check_redis_queue(self) -> Dict[str, Any]:
        """Check Redis queue connectivity and status"""
        start_time = time.time()
        
        try:
            redis_url = os.getenv("REDIS_URL")
            if not redis_url:
                return {
                    "status": "degraded",
                    "message": "Redis not configured",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            redis_client = redis.from_url(redis_url)
            
            # Test basic connectivity
            redis_client.ping()
            
            # Check queue lengths
            queue_info = {}
            queue_names = ["default", "high_priority", "document_processing", "ai_inference"]
            
            for queue_name in queue_names:
                queue_length = redis_client.llen(f"queue:{queue_name}")
                queue_info[queue_name] = queue_length
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            # Determine status based on queue lengths
            total_queued = sum(queue_info.values())
            status = "healthy"
            if total_queued > 1000:
                status = "degraded"
            elif total_queued > 5000:
                status = "unhealthy"
            
            return {
                "status": status,
                "response_time_ms": response_time,
                "queue_lengths": queue_info,
                "total_queued_jobs": total_queued,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_storage(self) -> Dict[str, Any]:
        """Check Azure Storage connectivity"""
        start_time = time.time()
        
        try:
            storage_account = os.getenv("AZURE_STORAGE_ACCOUNT")
            if not storage_account:
                return {
                    "status": "degraded",
                    "message": "Azure Storage not configured",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            credential = DefaultAzureCredential()
            blob_client = BlobServiceClient(
                account_url=f"https://{storage_account}.blob.core.windows.net",
                credential=credential
            )
            
            # Test by listing containers
            containers = list(blob_client.list_containers())
            
            response_time = round((time.time() - start_time) * 1000, 2)
            
            return {
                "status": "healthy",
                "response_time_ms": response_time,
                "containers_count": len(containers),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_azure_openai(self) -> Dict[str, Any]:
        """Check Azure OpenAI connectivity"""
        start_time = time.time()
        
        try:
            openai_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
            openai_key = os.getenv("AZURE_OPENAI_KEY")
            
            if not openai_endpoint or not openai_key:
                return {
                    "status": "degraded",
                    "message": "Azure OpenAI not configured",
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{openai_endpoint}/openai/deployments",
                    headers={"api-key": openai_key},
                    params={"api-version": "2023-12-01-preview"},
                    timeout=5.0
                )
                
                response_time = round((time.time() - start_time) * 1000, 2)
                
                if response.status_code == 200:
                    deployments = response.json().get("data", [])
                    return {
                        "status": "healthy",
                        "response_time_ms": response_time,
                        "deployments_available": len(deployments),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.utcnow().isoformat()
                    }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            import shutil
            
            # Check disk space in /tmp (commonly used for temporary files)
            total, used, free = shutil.disk_usage("/tmp")
            
            free_gb = free / (1024**3)
            total_gb = total / (1024**3)
            usage_percent = (used / total) * 100
            
            status = "healthy"
            if free_gb < 1:  # Less than 1GB free
                status = "unhealthy"
            elif free_gb < 5:  # Less than 5GB free
                status = "degraded"
            
            return {
                "status": status,
                "free_space_gb": round(free_gb, 2),
                "total_space_gb": round(total_gb, 2),
                "usage_percent": round(usage_percent, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def _check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            import psutil
            
            memory = psutil.virtual_memory()
            
            available_gb = memory.available / (1024**3)
            total_gb = memory.total / (1024**3)
            usage_percent = memory.percent
            
            status = "healthy"
            if usage_percent > 95:
                status = "unhealthy"
            elif usage_percent > 85:
                status = "degraded"
            
            return {
                "status": status,
                "available_memory_gb": round(available_gb, 2),
                "total_memory_gb": round(total_gb, 2),
                "usage_percent": round(usage_percent, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def readiness_check(self) -> Dict[str, Any]:
        """Check if worker is ready to process jobs"""
        # For workers, readiness depends on queue connectivity
        redis_check = await self._check_redis_queue()
        
        return {
            "status": redis_check["status"],
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {"redis_queue": redis_check}
        }
    
    async def liveness_check(self) -> Dict[str, Any]:
        """Simple liveness check"""
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "uptime_seconds": int((datetime.utcnow() - self.startup_time).total_seconds()),
            "worker_type": os.getenv("WORKER_TYPE", "general")
        }


# Global health checker instance
worker_health_checker = WorkerHealthChecker()