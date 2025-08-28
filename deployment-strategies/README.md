# SageInsure Deployment Strategies

This directory contains comprehensive deployment strategies for the SageInsure application, including blue-green, canary, and rolling deployments with automated rollback capabilities.

## Overview

The deployment strategies are designed to provide:

- **Zero-downtime deployments**
- **Automated rollback on failure detection**
- **Metrics-based promotion decisions**
- **Comprehensive monitoring and alerting**
- **Multiple deployment patterns for different use cases**

## Deployment Strategies

### 1. Rolling Deployment (`rolling/`)

**Best for**: Regular updates, low-risk changes, development environments

**Characteristics**:

- Gradually replaces old pods with new ones
- Configurable rollout speed (maxUnavailable, maxSurge)
- Built-in Kubernetes deployment mechanism
- Automatic rollback on failure
- Resource-efficient

**Configuration**:

- `maxUnavailable: 1` - Only 1 pod can be unavailable during update
- `maxSurge: 2` - Up to 2 additional pods during rollout
- `minReadySeconds: 30` - Wait 30s before considering pod ready
- `revisionHistoryLimit: 10` - Keep 10 previous versions for rollback

### 2. Blue-Green Deployment (`blue-green/`)

**Best for**: Critical updates, major releases, when instant rollback is required

**Characteristics**:

- Maintains two identical environments (blue and green)
- Instant traffic switching between environments
- Zero-downtime deployments
- Instant rollback capability
- Requires double the resources during deployment

**Features**:

- Pre-promotion analysis with success rate and latency checks
- Post-promotion verification
- Manual or automated promotion
- Preview environment for testing

### 3. Canary Deployment (`canary/`)

**Best for**: High-risk changes, gradual rollouts, A/B testing

**Characteristics**:

- Gradual traffic shifting from stable to new version
- Multiple analysis checkpoints
- Automated rollback on metric failures
- Fine-grained traffic control

**Traffic Progression**:

1. 0% - Smoke tests only
2. 10% - Initial user traffic
3. 25% - Extended analysis
4. 50% - Broader testing
5. 75% - Pre-production validation
6. 100% - Full promotion

## Automated Rollback

The `rollback-automation.yaml` provides:

### Monitoring Thresholds

- **Error Rate**: > 5%
- **Response Time (P95)**: > 2000ms
- **Success Rate**: < 95%
- **Memory Usage**: > 90%
- **CPU Usage**: > 85%
- **Pod Restarts**: > 3 in 5 minutes

### Rollback Triggers

- Prometheus alerts based on metrics
- Automated job execution on alert firing
- Webhook notifications
- Comprehensive logging

## Scripts

### Deployment Script (`scripts/deploy.sh`)

Unified deployment script supporting all strategies:

```bash
# Rolling deployment
./scripts/deploy.sh --strategy rolling --image-tag v1.2.3

# Blue-green deployment with auto-promotion
./scripts/deploy.sh --strategy blue-green --image-tag v1.2.3 --auto-promote

# Canary deployment
./scripts/deploy.sh --strategy canary --image-tag v1.2.3

# Dry run
./scripts/deploy.sh --strategy rolling --image-tag v1.2.3 --dry-run

# Check status
./scripts/deploy.sh --status
```

### Rollback Script (`scripts/rollback.sh`)

Comprehensive rollback capabilities:

```bash
# Rollback to previous version
./scripts/rollback.sh --strategy rolling

# Rollback to specific revision
./scripts/rollback.sh --strategy rolling --revision 5

# Force rollback without confirmation
./scripts/rollback.sh --strategy canary --force

# Show deployment history
./scripts/rollback.sh --history

# Dry run rollback
./scripts/rollback.sh --strategy blue-green --dry-run
```

## Prerequisites

### Required Tools

- `kubectl` - Kubernetes CLI
- `argo-rollouts` - For blue-green and canary deployments
- `prometheus` - For metrics and monitoring
- `curl` - For connectivity testing

### Kubernetes Resources

- Argo Rollouts CRDs installed
- Prometheus operator for monitoring
- NGINX ingress controller
- Cert-manager for TLS certificates

### Installation Commands

```bash
# Install Argo Rollouts
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# Install Prometheus Operator
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Install NGINX Ingress
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
```

## Configuration

### Environment Variables

| Variable              | Description                                       | Default   |
| --------------------- | ------------------------------------------------- | --------- |
| `DEPLOYMENT_STRATEGY` | Deployment strategy (rolling\|blue-green\|canary) | `rolling` |
| `IMAGE_TAG`           | Docker image tag to deploy                        | `latest`  |
| `NAMESPACE`           | Kubernetes namespace                              | `default` |
| `TIMEOUT`             | Deployment timeout                                | `600s`    |
| `AUTO_PROMOTE`        | Auto-promote deployments                          | `false`   |
| `DRY_RUN`             | Dry run mode                                      | `false`   |

### Secrets Required

```yaml
# Database connection
apiVersion: v1
kind: Secret
metadata:
  name: database-secret
data:
  connection-string: <base64-encoded-connection-string>

# Azure services
apiVersion: v1
kind: Secret
metadata:
  name: azure-secrets
data:
  openai-api-key: <base64-encoded-key>
  search-api-key: <base64-encoded-key>

# Container registry
apiVersion: v1
kind: Secret
metadata:
  name: acr-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

## Monitoring and Alerting

### Prometheus Metrics

The deployment strategies expose and monitor:

- HTTP request rates and error rates
- Response time percentiles
- Resource utilization (CPU, memory)
- Pod restart counts
- Deployment status and progress

### Alert Rules

Configured alerts for:

- High error rates (> 5%)
- High latency (P95 > 2000ms)
- Low success rates (< 95%)
- Resource exhaustion
- Deployment failures

### Grafana Dashboards

Recommended dashboards:

- Application performance metrics
- Deployment status and history
- Resource utilization trends
- Error rate and latency tracking

## Best Practices

### Strategy Selection

1. **Rolling Deployment**:

   - Regular feature updates
   - Bug fixes
   - Development/staging environments
   - Resource-constrained environments

2. **Blue-Green Deployment**:

   - Major releases
   - Database schema changes
   - When instant rollback is critical
   - Production environments with sufficient resources

3. **Canary Deployment**:
   - High-risk changes
   - New features requiring validation
   - A/B testing scenarios
   - Gradual user adoption

### Deployment Checklist

Before deployment:

- [ ] Run tests in CI/CD pipeline
- [ ] Verify image exists in registry
- [ ] Check cluster resources
- [ ] Review monitoring dashboards
- [ ] Ensure rollback plan is ready

During deployment:

- [ ] Monitor application metrics
- [ ] Watch pod status and logs
- [ ] Verify service connectivity
- [ ] Check error rates and latency

After deployment:

- [ ] Validate application functionality
- [ ] Monitor for 15-30 minutes
- [ ] Update documentation
- [ ] Clean up old resources if needed

### Troubleshooting

Common issues and solutions:

1. **Deployment Stuck**:

   ```bash
   kubectl describe deployment sageinsure-api-rolling -n default
   kubectl logs -l app.kubernetes.io/name=sageinsure-api -n default
   ```

2. **Rollback Issues**:

   ```bash
   ./scripts/rollback.sh --history
   ./scripts/rollback.sh --status
   ```

3. **Service Connectivity**:

   ```bash
   kubectl run debug --image=curlimages/curl --rm -i --restart=Never -- \
     curl -v http://sageinsure-api-rolling.default.svc.cluster.local/health
   ```

4. **Resource Issues**:
   ```bash
   kubectl top pods -n default
   kubectl describe nodes
   ```

## Security Considerations

- All containers run as non-root users
- Read-only root filesystems
- Network policies restrict traffic
- RBAC controls deployment permissions
- Secrets are properly managed
- TLS encryption for all communications

## Performance Optimization

- Resource requests and limits configured
- Horizontal Pod Autoscaler enabled
- Pod Disruption Budgets prevent service interruption
- Graceful shutdown handling
- Connection pooling and keep-alive
- Efficient health check endpoints

## Disaster Recovery

- Multiple availability zones
- Automated backups before deployments
- Cross-region replication capabilities
- Documented recovery procedures
- Regular disaster recovery testing

## Contributing

When adding new deployment strategies:

1. Follow the existing directory structure
2. Include comprehensive documentation
3. Add monitoring and alerting rules
4. Provide rollback capabilities
5. Test thoroughly in non-production environments
6. Update this README with new information

## Support

For issues or questions:

- Check the troubleshooting section
- Review Kubernetes and Argo Rollouts documentation
- Consult monitoring dashboards and logs
- Contact the platform team for assistance
