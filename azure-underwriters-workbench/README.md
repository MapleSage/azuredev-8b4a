# 🏢 SageInsure Underwriters Workbench

AI-Powered Document Analysis & Risk Assessment Platform for Insurance Underwriters

## 🎯 Overview

The SageInsure Underwriters Workbench is a comprehensive platform that leverages Azure OpenAI and Azure Cognitive Search to streamline the underwriting process. It provides intelligent document analysis, risk assessment, and decision support for insurance underwriters.

## ✨ Key Features

### 📄 Document Analysis
- **Multi-format Support**: PDF, TXT, DOCX document processing
- **AI-Powered Extraction**: Structured data extraction using GPT-4o
- **Document Classification**: Automatic categorization of insurance documents
- **Real-time Analysis**: Instant underwriting insights and recommendations

### ⚖️ Risk Assessment
- **Dynamic Risk Scoring**: AI-calculated risk scores based on multiple factors
- **Visual Risk Indicators**: Interactive gauges and charts
- **Factor Analysis**: Detailed breakdown of risk contributors
- **Automated Recommendations**: Approval/decline/review suggestions

### 🔍 Guidelines Search
- **Intelligent Search**: Azure Cognitive Search integration
- **Contextual Results**: Relevant underwriting guidelines and policies
- **Category Filtering**: Search by medical, lifestyle, financial factors
- **Real-time Updates**: Always current underwriting standards

### 📊 Portfolio Dashboard
- **Application Tracking**: Status distribution and metrics
- **Performance Analytics**: Approval rates and processing times
- **Visual Insights**: Interactive charts and graphs
- **Trend Analysis**: Historical data and patterns

### 📋 Batch Processing
- **Multi-document Upload**: Process multiple applications simultaneously
- **Bulk Analysis**: Automated batch risk assessment
- **Export Results**: CSV download of analysis results
- **Progress Tracking**: Real-time processing status

## 🚀 Deployment

### Prerequisites
- Azure CLI configured
- kubectl configured for AKS cluster
- Docker with buildx support
- Access to Azure Container Registry

### Quick Deploy
```bash
cd azure-underwriters-workbench
python deploy.py
```

### Manual Deployment
```bash
# Build and push image
docker buildx build --platform linux/amd64,linux/arm64 -t sageinsureacr.azurecr.io/underwriters-workbench:latest --push .

# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get pods -n sageinsure-workbench
kubectl get service -n sageinsure-workbench
```

## 🔧 Configuration

### Environment Variables
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI service endpoint
- `AZURE_OPENAI_KEY`: Azure OpenAI API key
- `AZURE_SEARCH_ENDPOINT`: Azure Cognitive Search endpoint
- `AZURE_SEARCH_KEY`: Azure Cognitive Search API key

### Azure Resources Required
- **Azure OpenAI**: GPT-4o model deployment
- **Azure Cognitive Search**: Document indexing and search
- **Azure Kubernetes Service**: Container orchestration
- **Azure Container Registry**: Image storage

## 📋 Usage

### Document Analysis Workflow
1. **Upload Document**: Select document type and upload file
2. **AI Analysis**: Automatic extraction and risk assessment
3. **Review Results**: Structured insights and recommendations
4. **Make Decision**: Approve, decline, or request additional info

### Risk Assessment Process
1. **Data Extraction**: Key underwriting factors identified
2. **Score Calculation**: AI-powered risk scoring algorithm
3. **Factor Analysis**: Detailed risk contributor breakdown
4. **Recommendations**: Automated decision support

### Guidelines Search
1. **Enter Query**: Search for specific underwriting topics
2. **Review Results**: Relevant guidelines and policies
3. **Apply Standards**: Use in decision-making process

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Streamlit     │    │   Azure OpenAI   │    │ Azure Cognitive │
│   Frontend      │◄──►│     GPT-4o       │    │     Search      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Kubernetes     │    │  Document        │    │  Guidelines     │
│  AKS Cluster    │    │  Processing      │    │  Database       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔐 Security

- **Azure Key Vault**: Secure credential storage
- **Kubernetes Secrets**: Runtime secret management
- **RBAC**: Role-based access control
- **Network Policies**: Secure pod communication

## 📊 Monitoring

- **Health Checks**: Kubernetes liveness/readiness probes
- **Logging**: Centralized application logs
- **Metrics**: Performance and usage analytics
- **Alerts**: Automated issue notifications

## 🤝 Support

For technical support and questions:
- Check deployment logs: `kubectl logs -f deployment/underwriters-workbench -n sageinsure-workbench`
- Monitor pod status: `kubectl get pods -n sageinsure-workbench`
- Scale if needed: `kubectl scale deployment underwriters-workbench --replicas=3 -n sageinsure-workbench`

## 📈 Roadmap

- [ ] Advanced ML risk models
- [ ] Real-time collaboration features
- [ ] Mobile application support
- [ ] Integration with external data sources
- [ ] Automated compliance reporting