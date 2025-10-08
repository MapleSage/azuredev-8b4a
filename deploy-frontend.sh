#!/bin/bash
# Deploy SageInsure Frontend to Vercel

echo "🚀 Deploying SageInsure Frontend to Vercel"
echo "=========================================="

cd frontend

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🏗️  Building the project..."
npm run build

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Your SageInsure app is now live on Vercel"
echo ""
echo "🔗 Backend API: https://sageinsure-rag-api.happyriver-cf203d90.eastus.azurecontainerapps.io"
echo "🧪 API Health: https://sageinsure-rag-api.happyriver-cf203d90.eastus.azurecontainerapps.io/healthz"