#!/bin/bash
# Complete SageInsure RAG System Startup

echo "🏢 SageInsure RAG System"
echo "========================"
echo ""

# Check if we're in the right directory
if [ ! -f "rag-api.py" ]; then
    echo "❌ Error: Please run this script from the azure-insurance directory"
    exit 1
fi

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check ports
echo "🔍 Checking ports..."
if ! check_port 8000; then
    echo "   Backend API port 8000 is busy - you may need to stop existing processes"
fi

if ! check_port 3000; then
    echo "   Frontend port 3000 is busy - you may need to stop existing processes"
fi

echo ""

# Start backend API in background
echo "🚀 Starting RAG API (Backend)..."
./start-rag-api.sh &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Test backend
echo "🧪 Testing backend API..."
if curl -s http://localhost:8000/healthz > /dev/null; then
    echo "✅ Backend API is running at http://localhost:8000"
    echo "   Health check: http://localhost:8000/healthz"
    echo "   Chat endpoint: http://localhost:8000/chat"
else
    echo "❌ Backend API failed to start"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""

# Start frontend
echo "🎨 Starting Frontend..."
echo "   This will open in a new terminal window..."
echo ""

# Open new terminal for frontend
osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && ./start-frontend.sh"'

echo "🎉 SageInsure RAG System Started!"
echo ""
echo "📍 Access Points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Health Check: http://localhost:8000/healthz"
echo ""
echo "🔑 Demo Login:"
echo "   Email: demo@sageinsure.com"
echo "   Password: demo123"
echo ""
echo "💡 The system connects to your deployed Azure services:"
echo "   • Azure OpenAI: https://sageinsure-openai.openai.azure.com/"
echo "   • Azure Search: https://sageinsure-search.search.windows.net"
echo "   • Search Index: policy-index (3 sample policies loaded)"
echo ""
echo "Press Ctrl+C to stop the backend API"

# Keep backend running
wait $BACKEND_PID