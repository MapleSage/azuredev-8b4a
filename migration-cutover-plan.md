# SageInsure AKS Migration - Final Cutover Plan

## Current State Analysis

### Duplicate Resources Identified

- **Legacy App Service**: `sageinsure-api` + `sageinsure-api-plan` (should be removed)
- **New AKS Infrastructure**: Fully deployed and running
- **Shared Resources**: Key Vault, OpenAI, Search, Storage (remain)

### Issues to Resolve

1. **Missing Frontend Ingress**: No ingress for staging.maplesage.com
2. **SSL Configuration**: SSL redirect disabled, no TLS certificates
3. **GitHub Actions Authentication**: Service principal created but not configured in GitHub
4. **Resource Cleanup**: Legacy App Service still running

## Validation Steps

### 1. Fix Frontend Ingress and SSL

- Create ingress for staging.maplesage.com
- Enable TLS with cert-manager
- Test both frontend and API endpoints

### 2. Validate GitHub Actions Authentication

- Add AZURE_CREDENTIALS secret to GitHub repository
- Test CI/CD pipeline deployment

### 3. End-to-End Application Testing

- Test frontend → API → Azure services connectivity
- Validate health checks and monitoring
- Performance testing under load

### 4. Production Cutover

- Switch DNS/traffic to AKS endpoints
- Remove legacy App Service resources
- Update monitoring and alerting

## Estimated Cost Savings

- App Service Plan: ~$50-100/month
- Simplified resource management
- Better scaling and reliability

## Rollback Plan

- Keep App Service resources until 48h after successful cutover
- DNS can be quickly switched back if issues arise
- Database/storage remains unchanged
