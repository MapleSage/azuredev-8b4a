#!/bin/bash

echo "🚀 Starting SageInsure Frontend with Real-Time Agents"
echo "=================================================="

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if logo files exist
if [ ! -f "public/sageinsure_logo.png" ]; then
    echo "⚠️  Warning: sageinsure_logo.png not found in public/ directory"
fi

if [ ! -f "public/sageinsure_favion.png" ]; then
    echo "⚠️  Warning: sageinsure_favion.png not found in public/ directory"
fi

echo ""
echo "🎯 Available Agents:"
echo "  • Claims Manager - File and track claims"
echo "  • Policy Assistant - Coverage and policy info"
echo "  • Marine Specialist - Vessel and cargo insurance"
echo "  • Cyber Specialist - Security and breach response"
echo "  • FNOL Processor - First Notice of Loss"
echo "  • Underwriter - Risk assessment and pricing"
echo "  • Research Assistant - Market analysis and insights"
echo "  • CRM Agent - Customer relationship management"
echo "  • HR Assistant - Human resources support"
echo "  • Marketing Agent - Campaign and lead management"
echo "  • Investment Research - Financial analysis"
echo ""

echo "🌐 Starting development server..."
echo "   Frontend will be available at: http://localhost:3000"
echo "   Test agents endpoint: http://localhost:3000/api/test-agents"
echo ""

# Start the development server
npm run dev