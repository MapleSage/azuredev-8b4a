# SageInsure Monitoring and Alerting Guide

## Overview

This guide covers the comprehensive monitoring and alerting setup for the SageInsure application running on Azure Kubernetes Service (AKS).

## Architecture

The monitoring stack consists of:

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notification
- **ServiceMonitors**: Automatic service discovery for metrics scraping
- **PrometheusRules**: Alert definitions and recording rules

## Components

### 1. Prometheus Configuration

#### ServiceMonitors

- `sageinsure-api-metrics`: Monitors FastAPI backend metrics
- `sageinsure-frontend-metrics`: Monitors Next.js frontend metrics
- `sageinsure-worker-metrics`: Monitors worker service metrics
- `nginx-ingress-controller-metrics`: Monitors ingress controller

#### Key Metrics Collected

- HTTP request rates and latencies
- Error rates by status code
- Pod resource usage (CPU, memory)
- Container restart counts
- Ingress controller metrics

### 2. Grafana Dashboards

#### SageInsure Overview Dashboard

- API request rate
- Error rate percentage
- Response time percentiles
- Active user sessions

#### Infrastructure Dashboard

- Pod status and health
- Memory and CPU usage
- Network traffic
- Storage utilization

### 3. AlertManager Rules

#### Critical Alerts

- **SageInsureAPIDown**: API service unavailable
- **SageInsurePodCrashLooping**: Pods restarting frequently
- **HighErrorRate**: Error rate > 5%

#### Warning Alerts

- **HighLatency**: 95th percentile > 2 seconds
- **HighMemoryUsage**: Memory usage > 90%
- **HighCPUUsage**: CPU usage > 90%

## Deployment

### Prerequisites

- AKS cluster with sufficient resources
- Helm 3.x installed
- kubectl configured for cluster access

### Installation

1. **Deploy monitoring stack:**

   ```bash
   ./scripts/deploy-monitoring.sh
   ```

2. **Validate deployment:**
   ```bash
   ./scripts/validate-monitoring.sh
   ```

### Manual Deployment

1. **Create namespace:**

   ```bash
   kubectl create namespace monitoring
   ```

2. **Install Prometheus Operator:**

   ```bash
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update

   helm install prometheus-operator prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
     --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false
   ```

3. **Apply custom configurations:**
   ```bash
   kubectl apply -f kubernetes/monitoring/
   ```

## Access and Usage

### Grafana Access

```bash
# Port forward to access Grafana
kubectl port-forward -n monitoring svc/prometheus-operator-grafana 3000:80

# Access at http://localhost:3000
# Default credentials: admin/admin123
```

### Prometheus Access

```bash
# Port forward to access Prometheus
kubectl port-forward -n monitoring svc/prometheus-operator-kube-p-prometheus 9090:9090

# Access at http://localhost:9090
```

### AlertManager Access

```bash
# Port forward to access AlertManager
kubectl port-forward -n monitoring svc/prometheus-operator-kube-p-alertmanager 9093:9093

# Access at http://localhost:9093
```

## Custom Metrics

### Application Metrics

The SageInsure applications expose custom business metrics:

#### API Metrics

- `insurance_quotes_generated_total`: Number of quotes generated
- `policy_processing_duration_seconds`: Policy processing time
- `document_analysis_requests_total`: Document analysis requests

#### Worker Metrics

- `ai_model_inference_time_seconds`: AI model inference duration
- `batch_job_completion_time_seconds`: Batch job processing time
- `queue_size`: Current queue size

### Adding Custom Metrics

1. **In your application code:**

   ```python
   from prometheus_client import Counter, Histogram, generate_latest

   # Define metrics
   quotes_counter = Counter('insurance_quotes_generated_total',
                           'Total quotes generated', ['product_type'])

   # Increment metrics
   quotes_counter.labels(product_type='auto').inc()
   ```

2. **Expose metrics endpoint:**
   ```python
   @app.get("/metrics")
   async def metrics():
       return Response(generate_latest(), media_type="text/plain")
   ```

## Alert Configuration

### Slack Integration

1. **Create Slack webhook URL**
2. **Update AlertManager configuration:**
   ```yaml
   slack_configs:
     - api_url: "YOUR_SLACK_WEBHOOK_URL"
       channel: "#alerts"
   ```

### Email Notifications

1. **Configure SMTP settings in AlertManager:**
   ```yaml
   global:
     smtp_smarthost: "smtp.gmail.com:587"
     smtp_from: "alerts@sageinsure.com"
   ```

## Troubleshooting

### Common Issues

1. **ServiceMonitor not discovering targets:**

   - Check label selectors match service labels
   - Verify namespace selectors
   - Check RBAC permissions

2. **Grafana dashboards not loading:**

   - Verify ConfigMap labels include `grafana_dashboard: "1"`
   - Check dashboard JSON syntax
   - Restart Grafana pod if needed

3. **Alerts not firing:**
   - Check PrometheusRule syntax
   - Verify metric names and labels
   - Check AlertManager configuration

### Debugging Commands

```bash
# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus-operator-kube-p-prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check ServiceMonitor status
kubectl get servicemonitors -n monitoring -o yaml

# Check PrometheusRule status
kubectl get prometheusrules -n monitoring -o yaml

# View AlertManager configuration
kubectl get secret alertmanager-prometheus-operator-kube-p-alertmanager -n monitoring -o yaml
```

## Maintenance

### Regular Tasks

1. **Monitor storage usage:**

   ```bash
   kubectl get pvc -n monitoring
   ```

2. **Check alert rule effectiveness:**

   - Review alert frequency
   - Adjust thresholds based on baseline metrics
   - Remove noisy alerts

3. **Update dashboards:**
   - Add new metrics as application evolves
   - Optimize queries for performance
   - Add business-specific visualizations

### Backup and Recovery

1. **Backup Grafana dashboards:**

   ```bash
   kubectl get configmaps -n monitoring -l grafana_dashboard=1 -o yaml > grafana-dashboards-backup.yaml
   ```

2. **Backup Prometheus configuration:**
   ```bash
   kubectl get prometheusrules -n monitoring -o yaml > prometheus-rules-backup.yaml
   kubectl get servicemonitors -n monitoring -o yaml > servicemonitors-backup.yaml
   ```

## Performance Optimization

### Prometheus Optimization

1. **Adjust retention period:**

   ```yaml
   spec:
     retention: 15d # Reduce if storage is limited
   ```

2. **Configure recording rules for expensive queries:**
   ```yaml
   - record: sageinsure:request_rate_5m
     expr: sum(rate(http_requests_total{job="sageinsure-api"}[5m]))
   ```

### Grafana Optimization

1. **Use recording rules for dashboard queries**
2. **Set appropriate refresh intervals**
3. **Limit time ranges for heavy queries**

## Security Considerations

1. **Network Policies**: Restrict access to monitoring components
2. **RBAC**: Implement least-privilege access
3. **TLS**: Enable TLS for all monitoring communications
4. **Authentication**: Configure proper authentication for Grafana
5. **Secret Management**: Use Kubernetes secrets for sensitive data

## Scaling

### High Availability

1. **Prometheus HA:**

   ```yaml
   spec:
     replicas: 2
   ```

2. **AlertManager HA:**

   ```yaml
   spec:
     replicas: 3
   ```

3. **Grafana HA:**
   ```yaml
   spec:
     replicas: 2
   ```

### Resource Scaling

Monitor resource usage and adjust:

- CPU and memory requests/limits
- Storage capacity
- Retention periods
- Scrape intervals

## Integration with CI/CD

The monitoring stack integrates with the CI/CD pipeline:

1. **Automated deployment validation**
2. **Health checks in deployment pipeline**
3. **Alert suppression during deployments**
4. **Rollback triggers based on metrics**
