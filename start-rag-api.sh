#!/bin/bash
# Start the RAG API with proper environment variables

export AZURE_OPENAI_KEY="d4b6faae7f704e54a9a650ea8c4c8e45"
export AZURE_SEARCH_KEY="bzPZEpmcDDYEDwrOe6mRyO0oty0z3Sdv8dGrV5y7icAzSeDzrolq"

echo "🚀 Starting SageInsure RAG API..."
echo "OpenAI Endpoint: https://sageinsure-openai.openai.azure.com/"
echo "Search Endpoint: https://sageinsure-search.search.windows.net"
echo "API will be available at: http://localhost:8000"
echo ""

# Install dependencies if needed
if [ ! -f "venv/bin/activate" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
    pip install fastapi uvicorn openai azure-search-documents azure-core
else
    source venv/bin/activate
fi

# Start the API
python3 rag-api.py