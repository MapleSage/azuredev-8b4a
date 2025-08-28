# SageInsure Health Checks and Probes Guide

## Overview

This guide covers the comprehensive health check and probe implementations for the SageInsure application components running on Azure Kubernetes Service (AKS).

## Health Check Architecture

### Components

1. **FastAPI Backend**: Comprehensive health checks with dependency validation
2. **Next.js Frontend**: Client-side and API health monitoring
3. **Worker Services**: Queue and resource monitoring
4. **Kubernetes Probes**: Liveness, readiness, and startup probes

### Health Check Types

#### 1. Liveness Probes

- **Purpose**: Determine if the container is alive and should not be restarted
- **Failure Action**: Kubernetes restarts the container
- **Implementation**: Simple checks that don't depend on external services

#### 2. Readiness Probes

- **Purpose**: Determine if the container is ready to accept traffic
- **Failure Action**: Kubernetes removes the pod from service endpoints
- **Implementation**: Checks critical dependencies required for basic functionality

#### 3. Startup Probes

- **Purpose**: Determine if the application has started successfully
- **Failure Action**: Kubernetes restarts the container if startup fails
- **Implementation**: Can have longer timeouts than liveness probes

## Backend Health Checks

### Endpoints

#### `/health` - General Health Check

```bash
curl http://api.sageinsure.local/health
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime_seconds": 3600,
  "response_time_ms": 45.2,
  "version": "1.0.0",
  "environment": "production"
}
```

#### `/health?details=true` - Detailed Health Check

```bash
curl http://api.sageinsure.local/health?details=true
```

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime_seconds": 3600,
  "response_time_ms": 67.8,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "response_time_ms": 12.3,
      "query_time_ms": 8.5,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 5.2,
      "memory_usage_mb": 245.7,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "azure_storage": {
      "status": "healthy",
      "response_time_ms": 89.1,
      "containers_count": 3,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "azure_keyvault": {
      "status": "healthy",
      "response_time_ms": 156.4,
      "secrets_count": 5,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "azure_openai": {
      "status": "healthy",
      "response_time_ms": 234.7,
      "deployments_count": 2,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    "azure_search": {
      "status": "healthy",
      "response_time_ms": 123.8,
      "storage_size_mb": 1024.5,
      "document_count": 15000,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### `/health/live` - Liveness Probe

```bash
curl http://api.sageinsure.local/health/live
```

#### `/health/ready` - Readiness Probe

```bash
curl http://api.sageinsure.local/health/ready
```

#### `/health/startup` - Startup Probe

```bash
curl http://api.sageinsure.local/health/startup
```

#### `/health/metrics` - Prometheus Metrics

```bash
curl http://api.sageinsure.local/health/metrics
```

**Response:**

```
sageinsure_health_status{service="api"} 1
sageinsure_health_response_time_ms{service="api"} 45.2
sageinsure_uptime_seconds{service="api"} 3600
sageinsure_dependency_health{service="api",dependency="database"} 1
sageinsure_dependency_response_time_ms{service="api",dependency="database"} 12.3
```

#### `/health/version` - Version Information

```bash
curl http://api.sageinsure.local/health/version
```

### Health Check Implementation

The backend health checker validates:

1. **Database Connectivity**: Connection and query performance
2. **Redis Cache**: Connectivity and memory usage
3. **Azure Storage**: Blob service availability
4. **Azure Key Vault**: Secret access
5. **Azure OpenAI**: Service availability and deployments
6. **Azure Cognitive Search**: Service statistics

### Status Levels

- **healthy**: All systems operational
- **degraded**: Some non-critical issues detected
- **unhealthy**: Critical systems unavailable

## Frontend Health Checks

### Endpoints

#### `/api/health` - General Health Check

```bash
curl http://sageinsure.local/api/health
```

#### `/api/health/live` - Liveness Probe

```bash
curl http://sageinsure.local/api/health/live
```

#### `/api/health/ready` - Readiness Probe

```bash
curl http://sageinsure.local/api/health/ready
```

### Frontend Health Implementation

The frontend health checker validates:

1. **API Connectivity**: Backend service availability
2. **Build Configuration**: Environment variables and build integrity
3. **Browser Environment**: Required browser capabilities
4. **Client-side Resources**: Local storage, session storage, crypto API

## Worker Health Checks

### Implementation

Worker services include health checks for:

1. **Redis Queue**: Queue connectivity and job counts
2. **Azure Storage**: File processing capabilities
3. **Azure OpenAI**: AI model availability
4. **Disk Space**: Available storage for temporary files
5. **Memory Usage**: Current memory consumption

### Metrics

- Queue lengths by priority
- Processing times
- Resource utilization
- Error rates

## Kubernetes Probe Configuration

### API Service Probes

```yaml
# Startup Probe
startupProbe:
  httpGet:
    path: /health/startup
    port: http
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30
  successThreshold: 1

# Liveness Probe
livenessProbe:
  httpGet:
    path: /health/live
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1

# Readiness Probe
readinessProbe:
  httpGet:
    path: /health/ready
    port: http
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

### Frontend Service Probes

```yaml
# Liveness Probe
livenessProbe:
  httpGet:
    path: /api/health/live
    port: http
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Readiness Probe
readinessProbe:
  httpGet:
    path: /api/health/ready
    port: http
  initialDelaySeconds: 15
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

## Testing Health Checks

### Automated Testing

Use the provided test script:

```bash
# Test health checks in default namespace
./scripts/test-health-checks.sh

# Test health checks in specific namespace
./scripts/test-health-checks.sh staging
```

### Manual Testing

#### Test Individual Endpoints

```bash
# Port forward to service
kubectl port-forward svc/sageinsure-api 8080:80

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/health?details=true
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/startup
```

#### Test Pod Health Directly

```bash
# Get pod name
POD=$(kubectl get pods -l app.kubernetes.io/name=sageinsure-api -o jsonpath='{.items[0].metadata.name}')

# Test health endpoint in pod
kubectl exec $POD -- curl -s http://localhost:8000/health
```

### Performance Testing

```bash
# Test response times
for i in {1..10}; do
  time curl -s http://localhost:8080/health > /dev/null
done
```

## Monitoring and Alerting

### Prometheus Metrics

Health check metrics are exposed at `/health/metrics`:

- `sageinsure_health_status`: Overall health status (1=healthy, 0=unhealthy)
- `sageinsure_health_response_time_ms`: Health check response time
- `sageinsure_uptime_seconds`: Service uptime
- `sageinsure_dependency_health`: Individual dependency status
- `sageinsure_dependency_response_time_ms`: Dependency response times

### Grafana Dashboards

Health metrics are included in:

- **SageInsure Overview Dashboard**: High-level health status
- **Infrastructure Dashboard**: Detailed probe status and response times

### Alerting Rules

Key alerts configured:

- **Service Down**: Liveness probe failures
- **Service Not Ready**: Readiness probe failures
- **High Health Check Latency**: Response time > 1 second
- **Dependency Failures**: Individual service failures

## Troubleshooting

### Common Issues

#### 1. Probe Timeouts

**Symptoms**: Pods restarting frequently, probe timeout errors

**Solutions**:

- Increase `timeoutSeconds` in probe configuration
- Optimize health check logic to reduce response time
- Check for network latency issues

#### 2. Dependency Failures

**Symptoms**: Health checks returning "unhealthy" status

**Solutions**:

- Check Azure service connectivity
- Verify authentication and permissions
- Review network policies and firewall rules

#### 3. False Positives

**Symptoms**: Health checks failing during normal operation

**Solutions**:

- Adjust failure thresholds
- Implement retry logic in health checks
- Add circuit breaker patterns for external dependencies

### Debugging Commands

```bash
# Check probe status
kubectl describe pod <pod-name>

# View probe failure events
kubectl get events --field-selector reason=Unhealthy

# Check health endpoint logs
kubectl logs <pod-name> | grep health

# Test connectivity from pod
kubectl exec <pod-name> -- nslookup <service-name>
kubectl exec <pod-name> -- curl -v <health-endpoint>
```

## Best Practices

### Health Check Design

1. **Keep liveness probes simple**: Don't check external dependencies
2. **Make readiness probes comprehensive**: Check all critical dependencies
3. **Use appropriate timeouts**: Balance responsiveness with reliability
4. **Implement graceful degradation**: Return "degraded" status for non-critical issues

### Probe Configuration

1. **Startup probes**: Use for slow-starting applications
2. **Failure thresholds**: Set based on expected failure patterns
3. **Period intervals**: Balance load with responsiveness
4. **Success thresholds**: Usually keep at 1 for faster recovery

### Monitoring

1. **Track response times**: Monitor health check performance
2. **Alert on patterns**: Multiple failures across services
3. **Dashboard visibility**: Include health status in operational dashboards
4. **Historical analysis**: Track health trends over time

## Integration with CI/CD

Health checks are integrated into the deployment pipeline:

1. **Pre-deployment**: Validate health check endpoints in staging
2. **Post-deployment**: Verify health status after deployment
3. **Rollback triggers**: Automatic rollback on health check failures
4. **Canary deployments**: Use health checks to validate new versions

## Security Considerations

1. **Authentication**: Health endpoints should not require authentication
2. **Information disclosure**: Limit sensitive information in health responses
3. **Network access**: Restrict health endpoint access to necessary sources
4. **Audit logging**: Log health check access for security monitoring
