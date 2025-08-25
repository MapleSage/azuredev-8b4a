# Azure Insurance Chat API

FastAPI backend service that provides RAG-powered chat capabilities for insurance policy queries, integrating with Azure OpenAI and Cognitive Search.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_openai_api_key_here
AZURE_OPENAI_DEPLOYMENT=gpt-4

# Azure Cognitive Search Configuration
AZURE_SEARCH_ENDPOINT=https://your-search-service.search.windows.net
AZURE_SEARCH_KEY=your_search_api_key_here
AZURE_SEARCH_INDEX=policy-index

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT=yourstorageaccount
STORAGE_ACCOUNT_KEY=your_storage_account_key_here
POLICY_DOCS_CONTAINER=policy-docs

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
```

### 3. Run the API

```bash
# Option 1: Using the startup script
python start_api.py

# Option 2: Direct uvicorn
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:

- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/healthz

## 📚 API Endpoints

### Health Check

```
GET /healthz
```

Returns service health status.

### Chat

```
POST /chat
```

Main chat endpoint with RAG capabilities.

**Request Body:**

```json
{
  "message": "What does my auto insurance cover?",
  "conversation_history": [
    {
      "role": "user",
      "content": "Hello"
    },
    {
      "role": "assistant",
      "content": "Hi! How can I help you with your insurance today?"
    }
  ]
}
```

**Response:**

```json
{
  "answer": "Based on your auto insurance policy...",
  "sources": [
    {
      "id": "auto_policy_001",
      "title": "Auto Insurance Policy",
      "category": "Auto",
      "snippet": "Your auto insurance covers..."
    }
  ],
  "conversation_id": null
}
```

### Upload Document

```
POST /upload
```

Upload and index a new policy document.

**Form Data:**

- `file`: JSON file containing policy data
- `category`: Policy category (e.g., "Auto", "Home", "Life")
- `title`: Policy title

### List Documents

```
GET /documents
```

List all indexed documents in the search index.

## 🔧 Architecture

### RAG Pipeline

1. **Query Processing**: User message is received
2. **Document Search**: Azure Cognitive Search finds relevant policy documents
3. **Context Building**: Relevant document snippets are compiled
4. **Response Generation**: Azure OpenAI generates response using RAG context
5. **Source Attribution**: Response includes references to source documents

### Azure Services Integration

- **Azure OpenAI**: GPT-4 for natural language generation
- **Azure Cognitive Search**: Semantic search across policy documents
- **Azure Blob Storage**: Document storage and retrieval

## 🚀 Deployment

### Local Development

```bash
python start_api.py
```

### Azure App Service

1. Ensure all environment variables are configured in App Service
2. Deploy the `app.py` and `requirements.txt` files
3. The service will automatically start on port 8000

### Docker (Optional)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["python", "start_api.py"]
```

## 🔍 Testing

### Manual Testing

Use the interactive docs at http://localhost:8000/docs to test endpoints.

### Health Check

```bash
curl http://localhost:8000/healthz
```

### Chat Test

```bash
curl -X POST "http://localhost:8000/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What does my insurance cover?", "conversation_history": []}'
```

## 📝 Environment Variables

| Variable                  | Description               | Required | Default        |
| ------------------------- | ------------------------- | -------- | -------------- |
| `AZURE_OPENAI_ENDPOINT`   | Azure OpenAI endpoint URL | Yes      | -              |
| `AZURE_OPENAI_API_KEY`    | Azure OpenAI API key      | Yes      | -              |
| `AZURE_OPENAI_DEPLOYMENT` | Model deployment name     | No       | `gpt-4`        |
| `AZURE_SEARCH_ENDPOINT`   | Cognitive Search endpoint | Yes      | -              |
| `AZURE_SEARCH_KEY`        | Cognitive Search API key  | Yes      | -              |
| `AZURE_SEARCH_INDEX`      | Search index name         | No       | `policy-index` |
| `AZURE_STORAGE_ACCOUNT`   | Storage account name      | Yes      | -              |
| `STORAGE_ACCOUNT_KEY`     | Storage account key       | Yes      | -              |
| `POLICY_DOCS_CONTAINER`   | Blob container name       | No       | `policy-docs`  |
| `API_HOST`                | API host binding          | No       | `0.0.0.0`      |
| `API_PORT`                | API port                  | No       | `8000`         |
| `DEBUG`                   | Enable debug mode         | No       | `false`        |

## 🔒 Security Notes

- Configure CORS origins properly for production
- Use Azure Key Vault for sensitive configuration
- Implement proper authentication/authorization
- Restrict API access to authorized clients

## 🐛 Troubleshooting

### Common Issues

1. **Missing Environment Variables**

   - Ensure all required environment variables are set
   - Check `.env` file format

2. **Azure Service Connection Issues**

   - Verify service endpoints and keys
   - Check network connectivity and firewall rules

3. **Search Index Issues**
   - Ensure search index exists and is properly configured
   - Run `scripts/seed-search-index.py` to populate index

### Logs

The API logs all operations to stdout. Check the console output for error details.

## 📚 Next Steps

1. **Frontend Integration**: Update frontend to call `/chat` endpoint
2. **Authentication**: Add MSAL integration for secure access
3. **Conversation Tracking**: Implement conversation persistence
4. **Document Processing**: Add support for more document formats
5. **Monitoring**: Add Azure Application Insights integration

