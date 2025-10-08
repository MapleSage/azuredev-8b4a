# SageInsure Azure Underwriter Agent

AI-powered underwriting assistant integrated with existing Azure infrastructure.

## Architecture

**Existing Azure Resources:**
- ✅ AKS Cluster: `sageinsure-aks`
- ✅ Azure OpenAI: `sageinsure-openai` 
- ✅ Cognitive Search: `sageinsure-search`
- ✅ Container Registry: `sageinsureacr`
- ✅ Key Vault: `kv-eedfa81f`
- ✅ Storage: `policydocseedfa81f`

## Components

### 1. Underwriter Agent
- **Model**: GPT-4o via Azure OpenAI
- **Capabilities**: Document analysis, risk assessment, compliance checking
- **Integration**: Azure Cognitive Search for guidelines lookup

### 2. Underwriting Workbench
- **Framework**: Streamlit web application
- **Features**: Application analysis, guidelines search, risk calculator, batch processing
- **Deployment**: Containerized on AKS cluster

## Deployment

### 1. Build and Push Container
```bash
# Build container
docker build -t sageinsureacr.azurecr.io/underwriting-workbench:latest .

# Push to ACR
az acr login --name sageinsureacr
docker push sageinsureacr.azurecr.io/underwriting-workbench:latest
```

### 2. Deploy to AKS
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s-deployment.yaml

# Check deployment status
kubectl get pods -n sageinsure
kubectl get services -n sageinsure
```

### 3. Create Search Index
```bash
# Run deployment script
python deploy.py
```

### 4. Configure Secrets
```bash
# Create Azure secrets in Key Vault
kubectl create secret generic azure-secrets \
  --from-literal=openai-key="YOUR_OPENAI_KEY" \
  -n sageinsure
```

## Usage

### Access Workbench
- **URL**: `https://underwriting.sageinsure.com`
- **Features**:
  - Application Analysis: AI-powered risk assessment
  - Guidelines Search: Query underwriting policies
  - Risk Calculator: Premium adjustment calculations
  - Batch Processing: Bulk application analysis

### API Integration
```python
from azure.ai.openai import AzureOpenAI

client = AzureOpenAI(
    azure_endpoint="https://sageinsure-openai.openai.azure.com/",
    api_key="YOUR_KEY",
    api_version="2024-02-01"
)

# Analyze application
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are an expert underwriter."},
        {"role": "user", "content": "Analyze this application: ..."}
    ]
)
```

## Integration with Existing SageInsure

### Frontend Integration
Add underwriting workbench to existing SageInsure frontend:

```typescript
// Add to TabsInterface component
const tabs = [
  // ... existing tabs
  {
    id: 'underwriting',
    label: 'Underwriting',
    icon: '⚖️',
    component: <UnderwritingWorkbench />
  }
]
```

### API Integration
Extend existing `sageinsure-api` App Service:

```python
@app.route('/api/underwriting/analyze', methods=['POST'])
def analyze_application():
    # Integration with underwriter agent
    pass
```

## Monitoring

### Health Checks
- **Liveness**: `/_stcore/health`
- **Readiness**: `/_stcore/health`

### Metrics
- Application analysis requests
- Risk assessment accuracy
- Response times
- Resource utilization

## Security

### Authentication
- Integration with existing Azure AD
- Role-based access control (RBAC)
- Key Vault for secrets management

### Compliance
- HIPAA compliance for medical data
- SOC 2 Type II controls
- Data encryption at rest and in transit

## Next Steps

1. **Deploy to AKS**: `kubectl apply -f k8s-deployment.yaml`
2. **Configure DNS**: Point `underwriting.sageinsure.com` to AKS ingress
3. **Upload Guidelines**: Populate search index with underwriting policies
4. **Integration Testing**: Test with existing SageInsure frontend
5. **Production Rollout**: Gradual deployment with monitoring