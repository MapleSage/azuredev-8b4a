# SageInsure Infrastructure Testing Guide

## Overview

This guide covers the comprehensive testing framework for the SageInsure AKS infrastructure, including Terratest-based infrastructure tests, end-to-end connectivity tests, and load testing scenarios.

## Testing Architecture

The testing framework consists of three main components:

1. **Infrastructure Tests (Terratest)**: Validate Terraform modules and Azure resources
2. **End-to-End Tests**: Verify application connectivity and functionality
3. **Load Tests**: Performance and scalability testing

## Test Structure

```
tests/
├── terratest/           # Infrastructure testing with Terratest
│   ├── aks_cluster_test.go
│   ├── network_test.go
│   ├── identity_test.go
│   └── go.mod
├── e2e/                 # End-to-end connectivity tests
│   └── connectivity_test.go
├── load/                # Load testing scenarios
│   ├── k6-load-test.js
│   └── locust-load-test.py
└── run-tests.sh         # Test automation script
```

## Prerequisites

### Required Tools

1. **Go 1.21+**: For Terratest and E2E tests
2. **Terraform 1.6+**: For infrastructure validation
3. **kubectl**: For Kubernetes cluster interaction
4. **Azure CLI**: For Azure resource management
5. **K6** or **Locust**: For load testing

### Installation

#### Go and Dependencies

```bash
# Install Go (if not already installed)
# Follow instructions at https://golang.org/doc/install

# Initialize test modules
cd tests/terratest && go mod tidy
cd ../e2e && go mod init sageinsure-e2e-tests && go mod tidy
```

#### K6 (for load testing)

```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# macOS
brew install k6
```

#### Locust (alternative load testing)

```bash
pip install locust
```

## Running Tests

### Quick Start

Run all tests with default configuration:

```bash
./tests/run-tests.sh
```

### Selective Testing

Run only infrastructure tests:

```bash
./tests/run-tests.sh --terratest-only
```

Run only end-to-end tests:

```bash
./tests/run-tests.sh --e2e-only
```

Run only load tests:

```bash
./tests/run-tests.sh --load-only --load-type k6 --users 50 --duration 10m
```

### Environment Variables

Configure tests using environment variables:

```bash
# Test configuration
export RUN_TERRATEST=true
export RUN_E2E=true
export RUN_LOAD=false

# Load test configuration
export LOAD_TEST_TYPE=k6        # or locust
export LOAD_TEST_USERS=10
export LOAD_TEST_DURATION=5m

# Environment configuration
export TEST_NAMESPACE=default
export BASE_URL=https://sageinsure.local
export API_URL=https://api.sageinsure.local

# Azure configuration
export ARM_CLIENT_ID=your-client-id
export ARM_CLIENT_SECRET=your-client-secret
export ARM_SUBSCRIPTION_ID=your-subscription-id
export ARM_TENANT_ID=your-tenant-id
```

## Infrastructure Tests (Terratest)

### AKS Cluster Tests

Tests the complete AKS cluster deployment:

```go
func TestAKSClusterDeployment(t *testing.T) {
    // Tests:
    // - AKS cluster creation and health
    // - Node pool configuration
    // - Kubernetes API accessibility
    // - System pods functionality
    // - Network connectivity
}
```

**What it validates:**

- AKS cluster provisioning state
- Node pool health and scaling
- Kubernetes API server accessibility
- System pods (CoreDNS, kube-proxy, Azure CNI)
- Internal and external network connectivity

### Network Tests

Validates the network infrastructure:

```go
func TestNetworkInfrastructure(t *testing.T) {
    // Tests:
    // - Virtual Network creation
    // - Subnet configuration
    // - Network Security Groups
    // - Route Tables
    // - Private DNS Zones
}
```

**What it validates:**

- VNet and subnet creation
- NSG rules and associations
- Route table configuration
- Private DNS zone setup
- Network connectivity between subnets

### Identity Tests

Validates identity and access management:

```go
func TestIdentityModule(t *testing.T) {
    // Tests:
    // - Managed Identity creation
    // - Federated Identity Credentials
    // - RBAC role assignments
    // - Key Vault integration
}
```

**What it validates:**

- User Assigned Managed Identities
- Workload Identity federation
- RBAC permissions
- Key Vault access policies

## End-to-End Tests

### Connectivity Tests

Validates application-level connectivity:

```go
func TestEndToEndConnectivity(t *testing.T) {
    // Tests:
    // - Pod health and readiness
    // - Service accessibility
    // - Ingress connectivity
    // - Database connectivity
    // - Azure services integration
    // - Inter-service communication
}
```

**Test Scenarios:**

1. **Pod Health**: Verifies all application pods are running and ready
2. **Service Discovery**: Tests Kubernetes service endpoints
3. **Ingress Routing**: Validates external access through ingress
4. **Database Connectivity**: Tests database connections from pods
5. **Azure Services**: Validates connectivity to Azure OpenAI, Search, Key Vault
6. **Inter-Service Communication**: Tests service-to-service communication

### Running E2E Tests

```bash
cd tests/e2e
go test -v -timeout 20m ./connectivity_test.go
```

## Load Testing

### K6 Load Tests

Comprehensive performance testing with K6:

```javascript
export const options = {
  stages: [
    { duration: "2m", target: 10 }, // Ramp up
    { duration: "5m", target: 10 }, // Steady state
    { duration: "2m", target: 50 }, // Scale up
    { duration: "10m", target: 50 }, // Sustained load
    { duration: "5m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% < 2s
    http_req_failed: ["rate<0.05"], // Error rate < 5%
  },
};
```

**Test Scenarios:**

- Homepage loading
- API health checks
- User authentication
- Insurance quote generation
- Document upload
- Policy management

### Running K6 Tests

```bash
cd tests/load
k6 run --vus 50 --duration 10m k6-load-test.js
```

### Locust Load Tests

Alternative load testing with Locust:

```python
class SageInsureUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def view_homepage(self):
        # Test homepage loading

    @task(5)
    def check_api_health(self):
        # Test API health endpoint

    @task(4)
    def generate_quote(self):
        # Test quote generation
```

### Running Locust Tests

```bash
cd tests/load

# Web UI mode
locust -f locust-load-test.py --host=https://api.sageinsure.local

# Headless mode
locust -f locust-load-test.py --host=https://api.sageinsure.local --headless -u 50 -r 5 -t 300s
```

## CI/CD Integration

### GitHub Actions Workflow

The testing framework integrates with GitHub Actions for automated testing:

```yaml
name: Infrastructure Testing
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 2 * * *" # Daily at 2 AM
```

**Workflow Jobs:**

1. **Terratest**: Infrastructure validation
2. **E2E Tests**: Connectivity validation
3. **Load Tests**: Performance validation
4. **Security Tests**: Security scanning
5. **Report Generation**: Comprehensive reporting

### Manual Triggers

Trigger tests manually with custom parameters:

```bash
# Via GitHub CLI
gh workflow run infrastructure-testing.yml \
  -f test_type=load \
  -f load_test_users=100 \
  -f load_test_duration=15m
```

## Test Configuration

### Test Data

Configure test data for different scenarios:

```javascript
// K6 test data
const testUsers = [
  { email: "test1@example.com", password: "testpass123" },
  { email: "test2@example.com", password: "testpass123" },
];

const insuranceQuotes = [
  { type: "auto", vehicle: { make: "Toyota", model: "Camry" } },
  { type: "home", property: { type: "house", value: 300000 } },
];
```

### Environment-Specific Configuration

Configure tests for different environments:

```bash
# Development
export BASE_URL=https://dev.sageinsure.local
export API_URL=https://api-dev.sageinsure.local
export TEST_NAMESPACE=development

# Staging
export BASE_URL=https://staging.sageinsure.local
export API_URL=https://api-staging.sageinsure.local
export TEST_NAMESPACE=staging

# Production
export BASE_URL=https://sageinsure.local
export API_URL=https://api.sageinsure.local
export TEST_NAMESPACE=default
```

## Test Results and Reporting

### Automated Reports

Tests generate comprehensive reports:

```markdown
# Infrastructure Test Report

**Date:** 2024-01-15 10:30:00
**Environment:** production
**Status:** ✅ PASSED

## Test Results

- ✅ Terratest Infrastructure Tests: PASSED
- ✅ End-to-End Tests: PASSED
- ✅ Load Tests: COMPLETED
- ✅ Security Tests: PASSED

## Performance Metrics

- Average Response Time: 245ms
- 95th Percentile: 1.2s
- Error Rate: 0.02%
- Throughput: 150 req/s
```

### Artifacts

Test artifacts are preserved for analysis:

- Test logs and results
- Performance metrics (JSON, CSV)
- HTML reports (Locust)
- Security scan results (SARIF)

## Troubleshooting

### Common Issues

1. **Authentication Failures**

   ```bash
   # Verify Azure credentials
   az account show

   # Check Kubernetes access
   kubectl cluster-info
   ```

2. **Network Connectivity Issues**

   ```bash
   # Test cluster connectivity
   kubectl get nodes
   kubectl get pods --all-namespaces

   # Test ingress
   curl -I https://api.sageinsure.local/health
   ```

3. **Load Test Failures**

   ```bash
   # Check application health
   kubectl get pods -n default
   kubectl logs -l app.kubernetes.io/name=sageinsure-api

   # Verify resource limits
   kubectl describe nodes
   ```

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
# Terratest debug
export TF_LOG=DEBUG
export TERRATEST_LOG_LEVEL=DEBUG

# Go test verbose output
go test -v -timeout 30m ./...

# K6 debug
k6 run --http-debug k6-load-test.js
```

## Best Practices

### Test Organization

1. **Isolation**: Each test should be independent and idempotent
2. **Cleanup**: Always clean up resources after tests
3. **Timeouts**: Set appropriate timeouts for long-running operations
4. **Retries**: Implement retry logic for flaky operations

### Performance Testing

1. **Baseline**: Establish performance baselines
2. **Gradual Load**: Ramp up load gradually
3. **Monitoring**: Monitor system resources during tests
4. **Thresholds**: Set realistic performance thresholds

### Security Testing

1. **Secrets**: Never commit secrets in test code
2. **Permissions**: Use least-privilege access
3. **Scanning**: Regular security scans of test code
4. **Compliance**: Ensure tests meet compliance requirements

## Extending the Framework

### Adding New Tests

1. **Infrastructure Tests**: Add new Terratest files in `tests/terratest/`
2. **E2E Tests**: Extend `connectivity_test.go` with new scenarios
3. **Load Tests**: Add new test scenarios to K6 or Locust scripts

### Custom Metrics

Add custom metrics for business-specific testing:

```javascript
// K6 custom metrics
import { Counter, Rate, Trend } from "k6/metrics";

const businessMetrics = {
  quotesGenerated: new Counter("quotes_generated"),
  processingTime: new Trend("quote_processing_time"),
  successRate: new Rate("quote_success_rate"),
};
```

### Integration with Monitoring

Integrate test results with monitoring systems:

```bash
# Send metrics to Prometheus
curl -X POST http://prometheus-pushgateway:9091/metrics/job/load-tests \
  -d "test_duration_seconds $(date +%s)"

# Send alerts to Slack
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text": "Load test completed: 150 req/s, 0.02% error rate"}'
```

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep Go modules and tools updated
2. **Review Thresholds**: Adjust performance thresholds based on trends
3. **Clean Test Data**: Remove old test artifacts and logs
4. **Update Test Scenarios**: Keep test scenarios current with application changes

### Monitoring Test Health

1. **Test Success Rates**: Monitor test pass/fail rates over time
2. **Execution Time**: Track test execution duration trends
3. **Resource Usage**: Monitor test resource consumption
4. **Flaky Tests**: Identify and fix unstable tests

This comprehensive testing framework ensures the reliability, performance, and security of the SageInsure AKS infrastructure throughout its lifecycle.
