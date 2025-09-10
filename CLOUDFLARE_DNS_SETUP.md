# Cloudflare DNS Setup for maplesage.net

## Get AKS Load Balancer IP
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
# Note the EXTERNAL-IP
```

## Cloudflare DNS Records
Add these records in Cloudflare dashboard:

```
Type: A
Name: sageinsure
Content: <YOUR_AKS_LOAD_BALANCER_IP>
Proxy: Orange cloud (Proxied)

Type: CNAME  
Name: api.sageinsure
Content: sageinsure.maplesage.net
Proxy: Orange cloud (Proxied)
```

## Update Helm Values
```bash
# Update both charts to use .net domain
helm upgrade frontend ./helm/frontend-chart --set ingress.hosts[0].host=sageinsure.maplesage.net
helm upgrade api ./helm/api-chart --set ingress.hosts[0].host=api.sageinsure.maplesage.net
```

## Update Environment Variables
```env
NEXT_PUBLIC_API_APP_URL=https://api.sageinsure.maplesage.net
```

## Add B2C Redirect URI
In Azure B2C app registration, add:
- `https://sageinsure.maplesage.net/chat`

That's it! Your existing Cloudflare setup will handle SSL automatically.