# SageInsure Policy Assistant - Standalone Azure Deployment

Complete standalone insurance policy AI assistant with full Azure infrastructure equivalent to AWS sample.

## 🏗️ Architecture

**Azure Services (AWS Equivalents):**
- **Azure Container Apps** → AWS Fargate/ECS
- **Application Gateway** → AWS Application Load Balancer  
- **Azure CDN** → AWS CloudFront
- **Azure OpenAI** → AWS Bedrock
- **Azure Cognitive Search** → AWS OpenSearch
- **Azure Cosmos DB** → AWS DynamoDB
- **Azure Container Registry** → AWS ECR
- **Azure Storage** → AWS S3

## 🚀 Features

- **Standalone Web Application**: Complete insurance policy assistant
- **Azure OpenAI Integration**: GPT-4 powered responses
- **Knowledge Base**: Azure Cognitive Search with policy documents
- **Session Management**: Cosmos DB for conversation history
- **Global CDN**: Azure CDN for worldwide access
- **Load Balancing**: Application Gateway with health checks
- **Auto Scaling**: Container Apps with 1-3 replicas
- **Secure**: Azure Key Vault for secrets management

## 📦 Deployment

```bash
# Deploy complete infrastructure
cd deployment
./deploy.sh
```

## 🌐 Access

After deployment, the Policy Assistant will be available at:
- **CDN URL**: https://sageinsure-policy-endpoint.azureedge.net
- **Direct IP**: Application Gateway public IP
- **Features**: 24/7 policy Q&A, claims assistance, coverage details

## 💰 Cost Estimate

- **Container Apps**: ~$15/month (1-3 instances)
- **Application Gateway**: ~$25/month (Standard v2)
- **Azure CDN**: ~$5/month (basic usage)
- **Azure OpenAI**: ~$20/month (GPT-4 usage)
- **Cosmos DB**: ~$10/month (400 RU/s)
- **Storage**: ~$2/month (policy documents)
- **Total**: ~$77/month

## 🛡️ Security

- Azure Key Vault for API keys
- Application Gateway WAF protection
- Container Apps private networking
- Cosmos DB encryption at rest
- CDN HTTPS enforcement