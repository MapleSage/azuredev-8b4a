# GitHub Actions Authentication Setup

## Service Principal Created

I've created a service principal for GitHub Actions authentication:

```json
{
  "clientId": "13d36788-efc1-46cc-8302-03eb81850c4f",
  "clientSecret": "wdF8Q~K4qirFr5Jti9qq43rF~q26INECLPaLNc.h",
  "subscriptionId": "2bfa9715-785b-445f-8102-6a423a7495ef",
  "tenantId": "e9394f90-446d-41dd-8c8c-98ac08c5f090",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

## Next Steps

1. **Add GitHub Secret**: Go to your GitHub repository settings → Secrets and variables → Actions
2. **Create Secret**: Add a new repository secret named `AZURE_CREDENTIALS`
3. **Set Value**: Paste the entire JSON above as the secret value
4. **Test Pipeline**: Run the GitOps deployment workflow to verify authentication

## Verification

The service principal has been tested and can successfully:

- Authenticate to Azure
- Access the AKS cluster
- Deploy applications via Helm

## Security Notes

- The service principal has `contributor` role scoped only to the `sageinsure-rg` resource group
- Credentials should be rotated every 90 days
- Monitor usage in Azure AD audit logs
