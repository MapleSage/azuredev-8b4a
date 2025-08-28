"""
Health check endpoints for SageInsure FastAPI backend
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional

from .health_checks import health_checker, HealthCheckStatus

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
@router.get("/health")
async def health_check(
    details: bool = Query(False, description="Include detailed check results")
):
    """
    Comprehensive health check endpoint
    
    Returns overall service health including all dependencies
    """
    try:
        result = await health_checker.health_check(include_details=details)
        
        # Return appropriate HTTP status code
        status_code = 200
        if result["status"] == HealthCheckStatus.UNHEALTHY:
            status_code = 503
        elif result["status"] == HealthCheckStatus.DEGRADED:
            status_code = 200  # Still accepting traffic but with warnings
        
        return JSONResponse(content=result, status_code=status_code)
    
    except Exception as e:
        return JSONResponse(
            content={
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": "error"
            },
            status_code=503
        )


@router.get("/ready")
@router.get("/readiness")
async def readiness_check():
    """
    Kubernetes readiness probe endpoint
    
    Checks if the service is ready to accept traffic
    Only checks critical dependencies required for basic functionality
    """
    try:
        result = await health_checker.readiness_check()
        
        status_code = 200 if result["status"] == HealthCheckStatus.HEALTHY else 503
        
        return JSONResponse(content=result, status_code=status_code)
    
    except Exception as e:
        return JSONResponse(
            content={
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": "error"
            },
            status_code=503
        )


@router.get("/live")
@router.get("/liveness")
async def liveness_check():
    """
    Kubernetes liveness probe endpoint
    
    Simple check to determine if the service is alive
    Should not depend on external services to avoid restart loops
    """
    try:
        result = await health_checker.liveness_check()
        return JSONResponse(content=result, status_code=200)
    
    except Exception as e:
        return JSONResponse(
            content={
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "timestamp": "error"
            },
            status_code=503
        )


@router.get("/startup")
async def startup_check():
    """
    Kubernetes startup probe endpoint
    
    Checks if the application has started successfully
    Can have longer timeout than liveness probe
    """
    try:
        # For startup, we want to ensure critical services are available
        result = await health_checker.readiness_check()
        
        # Add startup-specific checks
        startup_result = {
            **result,
            "startup_complete": True,
            "message": "Application startup completed successfully"
        }
        
        status_code = 200 if result["status"] == HealthCheckStatus.HEALTHY else 503
        
        return JSONResponse(content=startup_result, status_code=status_code)
    
    except Exception as e:
        return JSONResponse(
            content={
                "status": HealthCheckStatus.UNHEALTHY,
                "error": str(e),
                "startup_complete": False,
                "timestamp": "error"
            },
            status_code=503
        )


@router.get("/metrics")
async def health_metrics():
    """
    Prometheus-compatible health metrics endpoint
    
    Returns health check results in a format suitable for monitoring
    """
    try:
        result = await health_checker.health_check(include_details=True)
        
        # Convert to Prometheus metrics format
        metrics = []
        
        # Overall health status (1 = healthy, 0 = unhealthy)
        health_value = 1 if result["status"] == HealthCheckStatus.HEALTHY else 0
        metrics.append(f'sageinsure_health_status{{service="api"}} {health_value}')
        
        # Response time
        metrics.append(f'sageinsure_health_response_time_ms{{service="api"}} {result["response_time_ms"]}')
        
        # Uptime
        metrics.append(f'sageinsure_uptime_seconds{{service="api"}} {result["uptime_seconds"]}')
        
        # Individual check results
        if "checks" in result:
            for check_name, check_result in result["checks"].items():
                check_value = 1 if check_result["status"] == HealthCheckStatus.HEALTHY else 0
                metrics.append(f'sageinsure_dependency_health{{service="api",dependency="{check_name}"}} {check_value}')
                
                if "response_time_ms" in check_result:
                    metrics.append(f'sageinsure_dependency_response_time_ms{{service="api",dependency="{check_name}"}} {check_result["response_time_ms"]}')
        
        return "\n".join(metrics) + "\n"
    
    except Exception as e:
        # Return unhealthy metrics on error
        return f'sageinsure_health_status{{service="api"}} 0\n# ERROR: {str(e)}\n'


@router.get("/version")
async def version_info():
    """
    Service version and build information
    """
    from ..config import settings
    
    return {
        "version": getattr(settings, 'APP_VERSION', '1.0.0'),
        "build_date": getattr(settings, 'BUILD_DATE', 'unknown'),
        "git_commit": getattr(settings, 'GIT_COMMIT', 'unknown'),
        "environment": settings.ENVIRONMENT,
        "python_version": getattr(settings, 'PYTHON_VERSION', 'unknown')
    }