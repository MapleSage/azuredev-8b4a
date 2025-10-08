#!/bin/bash

# Azure Insurance Platform - Development Startup Script

echo "🚀 Starting Azure Insurance Platform..."

# Check if required files exist
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Backend .env file not found. Copying from example..."
    cp backend/.env.example backend/.env
    echo "📝 Please edit backend/.env with your Azure credentials"
fi

if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  Frontend .env.local file not found. Copying from example..."
    cp frontend/.env.local.example frontend/.env.local
    echo "📝 Please edit frontend/.env.local with your configuration"
fi

# Start backend
echo "🔧 Starting backend server..."
cd backend
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

echo "🌐 Backend starting on http://localhost:8000"
python app.py &
BACKEND_PID=$!

cd ..

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    npm install
fi

echo "🌐 Frontend starting on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

cd ..

echo "✅ Both servers are starting up..."
echo "📖 Backend API: http://localhost:8000"
echo "🖥️  Frontend App: http://localhost:3000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for interrupt
trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait