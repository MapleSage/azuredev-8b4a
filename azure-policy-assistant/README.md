# Azure Insurance Policy AI Assistant

Azure equivalent of AWS Insurance Policy AI Assistant using Azure services.

## Architecture

- **Frontend**: Azure Static Web Apps
- **Backend**: Azure Functions (Python)
- **Storage**: Azure Blob Storage for policy documents
- **Database**: Azure Cosmos DB for session management
- **AI**: Azure OpenAI Service for policy Q&A
- **Auth**: Azure AD B2C (optional)

## Azure Services Mapping

| AWS Service | Azure Equivalent |
|-------------|------------------|
| Amazon Bedrock | Azure OpenAI Service |
| Amazon S3 | Azure Blob Storage |
| Amazon DynamoDB | Azure Cosmos DB |
| AWS Lambda | Azure Functions |
| Amazon CloudFront | Azure CDN |
| Amazon Cognito | Azure AD B2C |
| AWS WAF | Azure Application Gateway WAF |
| Amazon EC2 | Azure Virtual Machines |

## Features

- **Personalized Policy Q&A**: AI assistant answers questions based on customer policy
- **Document Storage**: Secure storage of policy documents in Azure Blob Storage
- **Session Management**: Track conversations using Cosmos DB
- **Responsive UI**: Modern web interface with chat functionality
- **Security**: Built-in Azure security features

## Deployment

```bash
# Deploy infrastructure
az deployment group create \
  --resource-group rg-sageinsure \
  --template-file infrastructure/main.bicep

# Deploy function app
func azure functionapp publish sageinsure-policy-func

# Deploy static web app
az staticwebapp create \
  --name sageinsure-policy-web \
  --source frontend/
```

## Demo Features

- Interactive chat interface
- Policy information display
- Simulated AI responses for common insurance questions
- Responsive design for mobile and desktop

## Cost Estimation

- Azure Functions: ~$5/month (consumption plan)
- Cosmos DB: ~$10/month (400 RU/s)
- Blob Storage: ~$2/month (1GB)
- Static Web Apps: Free tier
- **Total**: ~$17/month