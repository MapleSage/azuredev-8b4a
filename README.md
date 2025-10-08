# Azure Insurance Platform

A comprehensive insurance platform built with Azure services, featuring AI-powered agents for various insurance operations.

## Architecture

- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Backend**: FastAPI with Azure OpenAI and Cognitive Search
- **Authentication**: Azure AD B2C
- **Infrastructure**: Azure Kubernetes Service (AKS)
- **AI Services**: Azure OpenAI, Cognitive Search

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.9+
- Azure subscription
- Docker (optional)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables in `.env`:
```bash
cp .env.example .env
# Edit .env with your Azure credentials
```

4. Run the backend:
```bash
python app.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

4. Run the frontend:
```bash
npm run dev
```

## Configuration

### Required Azure Services

1. **Azure OpenAI**: For AI-powered chat responses
2. **Azure Cognitive Search**: For document search and retrieval
3. **Azure AD B2C**: For user authentication
4. **Azure Storage**: For document storage (optional)

### Environment Variables

#### Backend (.env)
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_DEPLOYMENT`: Your deployment name (e.g., gpt-4)
- `AZURE_SEARCH_ENDPOINT`: Your Azure Search endpoint
- `AZURE_SEARCH_KEY`: Your Azure Search admin key
- `AZURE_SEARCH_INDEX`: Search index name

#### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_B2C_CLIENT_ID`: Azure AD B2C client ID
- `NEXT_PUBLIC_B2C_TENANT_NAME`: B2C tenant name
- `NEXT_PUBLIC_B2C_AUTHORITY`: B2C authority URL

## Deployment

### Local Development
```bash
# Start backend
cd backend && python app.py

# Start frontend
cd frontend && npm run dev
```

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Kubernetes Deployment
```bash
# Deploy to AKS
kubectl apply -f k8s-manifests/
```

## Features

- **Multi-Agent System**: Specialized agents for different insurance domains
- **Document Processing**: AI-powered document analysis and extraction
- **Real-time Chat**: Interactive chat interface with policy assistance
- **Claims Processing**: Automated claims handling and FNOL processing
- **Underwriting**: AI-assisted underwriting workflows
- **Marine Insurance**: Specialized marine insurance capabilities
- **Cyber Insurance**: Cyber risk assessment and policy management

## Project Structure

```
azure-insurance/
├── backend/                 # FastAPI backend
├── frontend/               # Next.js frontend
├── agents/                 # Specialized insurance agents
├── terraform/              # Infrastructure as Code
├── k8s-manifests/         # Kubernetes manifests
├── helm-charts/           # Helm charts
└── docs/                  # Documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.