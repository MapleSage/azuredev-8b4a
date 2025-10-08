# Azure Insurance Agent - AgentCore Runtime

Azure equivalent of AWS Bedrock AgentCore for insurance policy assistance using Azure AI Agent Runtime.

## Architecture

- **Azure AI Agents**: Runtime equivalent to AWS Bedrock AgentCore
- **Azure OpenAI**: GPT-4 for response generation
- **Azure Cognitive Search**: Knowledge base for insurance policies
- **Container Apps**: Serverless runtime deployment
- **Log Analytics**: Observability and monitoring

## Quick Start

### Prerequisites
- Azure CLI installed and configured
- Azure subscription with AI services enabled
- Docker for local development

### Deploy

```bash
# Deploy to Azure
./deploy.sh

# Test locally
python insurance_agent.py
curl -X POST http://localhost:8080/invocations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is covered under comprehensive insurance?"}'
```

### Environment Variables
```bash
export AZURE_OPENAI_ENDPOINT="https://your-openai.openai.azure.com/"
export AZURE_OPENAI_KEY="your-key"
export AZURE_SEARCH_ENDPOINT="https://your-search.search.windows.net"
export AZURE_SEARCH_KEY="your-search-key"
```

## Features

✅ **Agent Runtime**: Azure AI Agents equivalent to Bedrock AgentCore  
✅ **Knowledge Base**: Azure Cognitive Search for policy documents  
✅ **AI Generation**: Azure OpenAI GPT-4 for responses  
✅ **Serverless**: Container Apps for auto-scaling  
✅ **Observability**: Log Analytics for monitoring  

## Comparison to AWS

| AWS Bedrock AgentCore | Azure Equivalent |
|----------------------|------------------|
| AgentCore Runtime | Azure AI Agents |
| Bedrock Knowledge Base | Cognitive Search |
| Claude/Titan | Azure OpenAI GPT-4 |
| Lambda | Container Apps |
| CloudWatch | Log Analytics |