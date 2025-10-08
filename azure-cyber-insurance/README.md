# SageInsure Azure Cyber Insurance Portal

Azure-based cyber insurance risk assessment using Azure Security Center and Microsoft Defender for Cloud.

## Architecture

- **Frontend**: Static web app hosted on Azure Storage with CDN
- **Backend**: Azure Functions for API endpoints
- **Security**: Azure Security Center / Microsoft Defender for Cloud integration
- **Storage**: Azure Cosmos DB for quotes, Azure Blob Storage for findings
- **Messaging**: Azure Service Bus for notifications

## Components

1. **Partner Portal**: Web interface for customers to request quotes
2. **Security Assessment**: Integration with Azure Security Center
3. **Risk Calculator**: AI-powered risk assessment using Azure OpenAI
4. **Quote Generator**: Automated quote generation based on security posture

## Deployment

```bash
# Deploy infrastructure
az deployment group create --resource-group sageinsure-rg --template-file infrastructure/main.bicep

# Deploy frontend
cd frontend && npm run build && az storage blob upload-batch -d '$web' -s dist

# Deploy backend functions
cd backend && func azure functionapp publish sageinsure-cyber-functions
```

## Features

- Real-time security posture assessment
- AI-powered risk scoring
- Automated quote generation
- Integration with Microsoft Defender for Cloud
- Cross-tenant security data sharing