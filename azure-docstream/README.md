# SageInsure DocStream
## AI-Powered FNOL Document Classification for Insurance Claims

## Overview

SageInsure DocStream automates the indexing and processing of insurance claim documents using Azure AI services. This solution transitions from manual document processing to a streamlined, AI-powered workflow that identifies, classifies, and routes documents based on their content.

## Core Features

* **Intelligent Document Processing** - Azure AI Document Intelligence for text extraction
* **AI Classification** - Azure OpenAI for document categorization  
* **Automated Routing** - Logic Apps for workflow orchestration
* **Scalable Architecture** - Serverless Azure Functions
* **Real-time Processing** - Event-driven with Azure Event Grid

## Technical Architecture

### Azure Services Mapping:
- **AWS S3** → **Azure Blob Storage**
- **AWS Textract** → **Azure AI Document Intelligence**
- **AWS Bedrock** → **Azure OpenAI**
- **AWS Step Functions** → **Azure Logic Apps**
- **AWS Lambda** → **Azure Functions**
- **AWS DynamoDB** → **Azure Cosmos DB**
- **AWS EventBridge** → **Azure Event Grid**

## Components

### 1. Document Upload & Storage
- **Azure Blob Storage** containers for different processing stages
- **Azure Event Grid** triggers on document upload
- **Azure Logic Apps** orchestrates the workflow

### 2. Document Analysis
- **Azure AI Document Intelligence** extracts text and structure
- **Azure Functions** process extracted content
- **Azure OpenAI** classifies document types

### 3. Document Classification & Routing
- **GPT-4** model classifies insurance claim documents
- **Conditional routing** based on classification results
- **Automated data extraction** for valid claims

### 4. Data Storage & Integration
- **Azure Cosmos DB** stores extracted claim data
- **Power BI** dashboards for analytics
- **Integration APIs** for downstream systems

## Deployment

```bash
# Deploy infrastructure
az deployment group create --resource-group sageinsure-rg --template-file infrastructure/main.bicep

# Deploy functions
cd backend && func azure functionapp publish sageinsure-docstream-functions

# Upload frontend
az storage blob upload-batch -d '$web' -s frontend/dist --account-name <storage-account>
```

## Usage

1. **Upload Documents** - Drop PDF files into the staging container
2. **Automatic Processing** - AI extracts and classifies content
3. **Smart Routing** - Documents routed based on classification
4. **Data Extraction** - Key information stored in Cosmos DB
5. **Dashboard Analytics** - View processing metrics and insights