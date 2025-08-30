# Migration Validation and Cutover Plan

## Current Status

### ✅ Completed Infrastructure

- AKS cluster deployed and running
- Applications deployed to staging namespace
- Ingress controller configured
- Key Vault integration working
- Private endpoints configured
- Container registry operational

### ⚠️ Issues to Resolve

1. **SSL Certificate Generation Failing**

   - Let's Encrypt challenges failing due to HTTP connectivity issues
   - Cloudflare configuration may be blocking HTTP-01 challenges

2. **GitHub Actions Authentication Missing**

   - AZURE_CREDENTIALS secret not configured
   - CI/CD pipeline cannot authenticate to Azure

3. **Duplicate Resources Running**
   - Old App Service still running alongside AKS
   - Need to clean up legacy resources after validation

## Validation Steps

### 1. Fix SSL Certificate Issues

**Option A: Use DNS-01 Challenge (Recommended)**

```bash
# Update cert-manager to use DNS-01 challenge with Cloudflare
kubectl patch clusterissuer letsencrypt-prod --type='merge' -p='
spec:
  acme:
    solvers:
    - dns01:
        cloudflare:
          email: your-email@domain.com
          apiTokenSecretRef:
            name: cloudflare-api-token-secret
            key: api-token
'
```

**Option B: Temporarily Use Self-Signed Certificates**

```bash
# Create self-signed certificates for testing
kubectl create secret tls staging-maplesage-com-tls \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n staging
```

### 2. Add GitHub Secrets

- Add AZURE_CREDENTIALS secret (see github-secrets-setup.md)
- Test CI/CD pipeline deployment

### 3. Application Health Validation

**Backend API Health Check:**

```bash
kubectl port-forward -n staging svc/sageinsure-api 8080:80
curl http://localhost:8080/health
```

**Frontend Health Check:**

```bash
kubectl port-forward -n staging svc/sageinsure-frontend 3000:80
curl http://localhost:3000
```

**Key Vault Integration Test:**

```bash
kubectl exec -n staging deployment/sageinsure-api -- ls -la /mnt/secrets-store/
```

### 4. End-to-End Testing

**Test API Endpoints:**

```bash
# Test document upload
curl -X POST https://api-staging.maplesage.com/documents \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test-document.pdf"

# Test search functionality
curl https://api-staging.maplesage.com/search?q=test
```

**Test Frontend:**

- Navigate to https://staging.maplesage.com
- Test user authentication
- Test document upload and search

## Cutover Plan

### Phase 1: Pre-Cutover Validation (Current)

- [ ] Fix SSL certificates
- [ ] Add GitHub secrets
- [ ] Validate all application functionality
- [ ] Performance testing
- [ ] Security validation

### Phase 2: Traffic Migration

- [ ] Update DNS to point production domain to AKS
- [ ] Monitor application performance
- [ ] Validate all integrations working

### Phase 3: Legacy Cleanup

- [ ] Stop App Service applications
- [ ] Delete App Service and App Service Plan
- [ ] Clean up unused resources
- [ ] Update monitoring and alerting

## Resource Cleanup List

**Resources to DELETE after successful cutover:**

- `sageinsure-api` (App Service)
- `sageinsure-api-plan` (App Service Plan)

**Resources to KEEP:**

- All AKS infrastructure
- `kv-eedfa81f` (Key Vault)
- `sageinsure-openai` (Azure OpenAI)
- `sageinsure-search` (Search Service)
- `policydocseedfa81f` (Storage Account)
- `sageinsureacr` (Container Registry)

## Rollback Plan

If issues occur during cutover:

1. Revert DNS changes to point back to App Service
2. Restart App Service if needed
3. Investigate and fix AKS issues
4. Re-attempt cutover when ready

## Success Criteria

- [ ] All applications accessible via HTTPS
- [ ] SSL certificates valid and auto-renewing
- [ ] GitHub Actions CI/CD pipeline working
- [ ] All API endpoints responding correctly
- [ ] Frontend application fully functional
- [ ] Performance meets or exceeds App Service baseline
- [ ] No duplicate resources consuming costs
