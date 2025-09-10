# Using maplesage.net Domain Strategy

## Why maplesage.net?

Using `maplesage.net` instead of `maplesage.com` solves several issues:

1. **No Domain Migration Needed** - Avoid complex MS365 domain transfer
2. **Full Control** - Register and manage under your main Azure account
3. **Clean Setup** - No external dependencies or access issues
4. **Cost Effective** - Use your Azure credits properly

## Setup Steps

### 1. Register maplesage.net Domain
- Register through Azure DNS or your preferred registrar
- Point DNS to your Azure account

### 2. Update DNS Records
```
A record: staging.maplesage.net → Your AKS Load Balancer IP
CNAME: api-staging.maplesage.net → staging.maplesage.net
TXT: _acme-challenge.maplesage.net → For Let's Encrypt
```

### 3. Update Helm Charts
```yaml
# frontend-chart/values.yaml
ingress:
  hosts:
    - host: staging.maplesage.net
      paths:
        - path: /
          pathType: Prefix

# api-chart/values.yaml  
ingress:
  hosts:
    - host: api-staging.maplesage.net
      paths:
        - path: /
          pathType: Prefix
```

### 4. Update Environment Variables
```env
# Production URLs
NEXT_PUBLIC_API_APP_URL=https://api-staging.maplesage.net
NEXT_PUBLIC_REDIRECT_URI_PROD=https://staging.maplesage.net/chat

# B2C Redirect URIs (add both)
- http://localhost:3000/chat
- https://staging.maplesage.net/chat
```

### 5. Update B2C Configuration
1. App registrations → SageInsure → Authentication
2. Add redirect URI: `https://staging.maplesage.net/chat`
3. Update any hardcoded maplesage.com references

### 6. SSL Certificate
```bash
# Let's Encrypt via cert-manager
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: maplesage-net-tls
spec:
  secretName: maplesage-net-tls
  dnsNames:
  - staging.maplesage.net
  - api-staging.maplesage.net
  issuer:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF
```

## Benefits

- ✅ **Immediate Control** - No waiting for domain transfers
- ✅ **Proper Billing** - Resources under your main account
- ✅ **Clean Architecture** - No external account dependencies  
- ✅ **B2C Branding** - Full control over authentication styling
- ✅ **Simplified Management** - Everything in one Azure tenant

## Migration Path

1. **Phase 1**: Set up maplesage.net alongside maplesage.com
2. **Phase 2**: Test all functionality on .net domain
3. **Phase 3**: Update DNS and redirect .com to .net
4. **Phase 4**: Eventually migrate .com domain when ready

This approach gives you immediate functionality while keeping the option to migrate the .com domain later.