# SageInsure AKS Migration Testing Guide

This document provides comprehensive guidance for testing the SageInsure AKS Terraform migration infrastructure.

## Overview

The testing suite includes multiple types of tests to ensure the reliability and functionality of the AKS migration:

- **Infrastructure Tests (Terratest)**: Validate Terraform modules and Azure resources
- **End-to-End Tests**: Verify connectivity and application functionality
- **Health Checks**: Monitor infrastructure component status
- **Security Tests**: Validate security configurations and compliance
- **Load Tests**: Ensure performance under load

## Prerequisites

### Required Tools

- **Go 1.21+**: For running Terratest and E2E tests
- **Terraform 1.6+**: For infrastructure validation
- **Azure CLI**: For Azure resource management
- **kubectl**: For Kubernetes cluster interaction
- **Docker**: For container-based tests (optional)

### Environment Setup

1. **Azure Authentication**:

   ```bash
   # Service Principal authentication (recommended for CI/CD)
   export ARM_CLIENT_ID="your-client-id"
   export ARM_CLIENT_SECRET="your-client-secret"
   export ARM_SUBSCRIPTION_ID="your-subscription-id"
   export ARM_TENANT_ID="your-tenant-id"

   # Or use Azure CLI authentication
   az login
   ```

2. **Kubernetes Configuration**:

   ```bash
   # Get AKS credentials
   az aks get-credentials --resource-group sageinsure-rg --name sageinsure-aks
   ```

3. **Application Endpoints** (for E2E tests):
   ```bash
   export BASE_URL="https://sageinsure.local"
   export API_URL="https://api.sageinsure.local"
   ```

## Test Types

### 1. Infrastructure Tests (Terratest)

These tests validate that Terraform modules deploy correctly and Azure resources are configured properly.

#### Running Infrastructure Tests

```bash
# Run all infrastructure tests
./tests/run-tests.sh terratest

# Run specific test modules
cd tests/terratest
go test -v -timeout 30m ./network_test.go
go test -v -timeout 20m ./identity_test.go
go test -v -timeout 60m ./aks_cluster_test.go
```

#### Test Coverage

- **Network Module**: Virtual networks, subnets, NSGs, route tables
- **Identity Module**: Managed identities, RBAC assignments, federated credentials
- **AKS Module**: Cluster deployment, node pools, system pods

### 2. End-to-End Tests

These tests verify connectivity and application functionality.

#### Running E2E Tests

```bash
# Run all E2E tests
./tests/run-tests.sh e2e

# Run specific E2E tests
cd tests/e2e
go test -v ./connectivity_test.go
```

#### Test Coverage

- Internet connectivity
- Azure service endpoints
- Kubernetes cluster connectivity
- Application health endpoints

### 3. Health Checks

Quick validation of infrastructure component status.

#### Running Health Checks

```bash
# Run health checks
./tests/run-tests.sh health

# Or run directly
bash scripts/test-health-checks.sh
```

#### Health Check Coverage

- Azure CLI authentication
- Resource group existence
- Key Vault accessibility
- Azure OpenAI service
- Azure Cognitive Search
- Storage Account
- Virtual Network and subnets
- AKS cluster status and connectivity

### 4. Security Tests

Validate security configurations and compliance.

#### Running Security Tests

Security tests are integrated into the CI/CD pipeline using Trivy:

```bash
# Scan Terraform configurations
trivy config terraform/

# Scan container images
trivy image your-registry/sageinsure-api:latest
```

### 5. Load Tests

Performance testing using k6 and Locust.

#### Running Load Tests

```bash
# K6 load tests
cd tests/load
k6 run --vus 10 --duration 5m k6-load-test.js

# Locust load tests
locust -f locust-load-test.py --host=https://api.sageinsure.local
```

## CI/CD Integration

### GitHub Actions

The project includes comprehensive GitHub Actions workflows:

- **Infrastructure Testing**: `.github/workflows/infrastructure-testing.yml`
- **Integration Testing**: `.github/workflows/integration-testing.yml`

#### Triggering Tests

Tests run automatically on:

- Push to `main` or `develop` branches
- Pull requests to `main`
- Daily scheduled runs (2 AM UTC)
- Manual workflow dispatch

#### Manual Trigger

```bash
# Trigger via GitHub CLI
gh workflow run infrastructure-testing.yml

# Or use the GitHub web interface
```

## Test Configuration

### Terratest Configuration

Terratest tests use the following configuration:

```go
terraformOptions := &terraform.Options{
    TerraformDir: "../../terraform/modules/network",
    Vars: map[string]interface{}{
        "resource_group_name": resourceGroupName,
        "location":           "East US",
        "environment":        "test",
    },
    EnvVars: map[string]string{
        "ARM_SUBSCRIPTION_ID": subscriptionID,
    },
}
```

### Test Timeouts

- Network tests: 30 minutes
- Identity tests: 20 minutes
- AKS cluster tests: 60 minutes
- E2E tests: 20 minutes

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Problem**: Tests fail with authentication errors.

**Solution**:

```bash
# Verify Azure CLI authentication
az account show

# Check environment variables
echo $ARM_SUBSCRIPTION_ID
echo $ARM_CLIENT_ID

# Re-authenticate if needed
az login
```

#### 2. Terraform State Issues

**Problem**: Terraform state conflicts or corruption.

**Solution**:

```bash
# Check state lock
terraform force-unlock <lock-id>

# Refresh state
terraform refresh

# Import existing resources if needed
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/...
```

#### 3. Kubernetes Connectivity Issues

**Problem**: kubectl cannot connect to AKS cluster.

**Solution**:

```bash
# Get fresh credentials
az aks get-credentials --resource-group sageinsure-rg --name sageinsure-aks --overwrite-existing

# Verify cluster access
kubectl cluster-info

# Check cluster status
az aks show --resource-group sageinsure-rg --name sageinsure-aks --query provisioningState
```

#### 4. Test Timeout Issues

**Problem**: Tests timeout during resource creation.

**Solution**:

- Increase timeout values in test configuration
- Use smaller resource configurations for testing
- Run tests in regions with better performance

### Debug Mode

Enable debug logging for detailed test output:

```bash
# Terratest debug
export TF_LOG=DEBUG
go test -v ./network_test.go

# Azure CLI debug
export AZURE_CLI_DEBUG=1
az group show --name sageinsure-rg
```

## Test Data Management

### Test Resource Naming

Tests use unique identifiers to avoid conflicts:

```go
uniqueID := random.UniqueId()
resourceGroupName := fmt.Sprintf("test-network-rg-%s", uniqueID)
```

### Cleanup

Tests automatically clean up resources using `defer` statements:

```go
defer terraform.Destroy(t, terraformOptions)
```

For manual cleanup:

```bash
# List test resource groups
az group list --query "[?contains(name, 'test-')].name" -o table

# Delete test resources
az group delete --name test-network-rg-abc123 --yes --no-wait
```

## Performance Considerations

### Test Parallelization

Tests use `t.Parallel()` to run concurrently:

```go
func TestNetworkInfrastructure(t *testing.T) {
    t.Parallel()
    // Test implementation
}
```

### Resource Optimization

For faster test execution:

- Use minimal resource configurations
- Leverage existing resources where possible
- Run tests in parallel when safe

## Monitoring and Reporting

### Test Results

Test results are automatically uploaded as artifacts:

- Terratest logs
- E2E test reports
- Load test results
- Security scan reports

### Notifications

Failed tests trigger:

- GitHub issue creation (for scheduled runs)
- Pull request comments
- Slack notifications (if configured)

## Best Practices

### Writing Tests

1. **Use descriptive test names**: `TestNetworkInfrastructure`, `TestAKSClusterDeployment`
2. **Include cleanup**: Always use `defer terraform.Destroy()`
3. **Handle errors gracefully**: Use `require.NoError()` and `assert.True()`
4. **Add logging**: Use `t.Logf()` for debugging information
5. **Test isolation**: Ensure tests don't depend on each other

### Test Maintenance

1. **Regular updates**: Keep test dependencies up to date
2. **Review failures**: Investigate and fix flaky tests
3. **Documentation**: Update this guide when adding new tests
4. **Monitoring**: Track test execution times and success rates

## Security Considerations

### Secrets Management

- Never commit secrets to version control
- Use environment variables for sensitive data
- Leverage Azure Key Vault for production secrets
- Rotate test credentials regularly

### Access Control

- Use least-privilege service principals for CI/CD
- Limit test resource access to necessary permissions
- Monitor test resource usage and costs

## Cost Management

### Resource Optimization

- Use B-series VMs for testing
- Delete test resources promptly
- Monitor Azure costs for test subscriptions
- Use Azure Dev/Test pricing where available

### Budget Alerts

Set up budget alerts for test subscriptions:

```bash
az consumption budget create \
  --budget-name "test-budget" \
  --amount 100 \
  --time-grain Monthly \
  --start-date 2024-01-01 \
  --end-date 2024-12-31
```

## Support and Troubleshooting

For issues with the testing infrastructure:

1. Check this documentation first
2. Review GitHub Actions logs
3. Check Azure resource status
4. Contact the DevOps team
5. Create an issue in the project repository

## Appendix

### Useful Commands

```bash
# Quick health check
bash scripts/test-health-checks.sh

# Run specific test type
./tests/run-tests.sh terratest

# Check AKS cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# View Terraform state
terraform show
terraform state list

# Azure resource queries
az resource list --resource-group sageinsure-rg --output table
```

### Environment Variables Reference

| Variable              | Description                       | Required        |
| --------------------- | --------------------------------- | --------------- |
| `ARM_CLIENT_ID`       | Azure service principal client ID | Yes (for CI/CD) |
| `ARM_CLIENT_SECRET`   | Azure service principal secret    | Yes (for CI/CD) |
| `ARM_SUBSCRIPTION_ID` | Azure subscription ID             | Yes             |
| `ARM_TENANT_ID`       | Azure tenant ID                   | Yes (for CI/CD) |
| `KUBECONFIG`          | Kubernetes config file path       | No              |
| `BASE_URL`            | Frontend application URL          | No              |
| `API_URL`             | API application URL               | No              |
| `TF_LOG`              | Terraform log level               | No              |
| `AZURE_CLI_DEBUG`     | Azure CLI debug mode              | No              |
