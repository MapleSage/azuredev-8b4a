#!/bin/bash

# Test script to verify MSAL configuration fix

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Testing MSAL Configuration Fix...${NC}"

# Check if we're in the right directory
if [ ! -f "frontend/lib/msal-config.ts" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Current MSAL Configuration:${NC}"

# Show current environment files
echo -e "${YELLOW}Development Environment:${NC}"
if [ -f "frontend/.env.development" ]; then
    cat frontend/.env.development
else
    echo "No frontend/.env.development file found"
fi

echo -e "\n${YELLOW}Production Environment:${NC}"
if [ -f "frontend/.env.production" ]; then
    cat frontend/.env.production
else
    echo "No frontend/.env.production file found"
fi

# Check Azure AD app registration
echo -e "\n${BLUE}🔐 Checking Azure AD App Registration...${NC}"
az ad app show --id 27650c1d-91fa-4747-a2fa-1a52813ac5ac --query "web.redirectUris" -o table

# Build and test locally first
echo -e "\n${BLUE}🏗️ Building frontend locally...${NC}"
cd frontend
npm install
npm run build

echo -e "\n${GREEN}✅ Build successful! Configuration should be working.${NC}"

# Show next steps
echo -e "\n${YELLOW}📝 Next Steps:${NC}"
echo "1. Test locally: cd frontend && npm run dev"
echo "2. Visit http://localhost:3000/auth-test to verify configuration"
echo "3. Deploy to Azure Static Web Apps when ready"
echo "4. Test authentication on production URL"

cd ..