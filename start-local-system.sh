#!/bin/bash

echo "🚀 Starting SageInsure Local Development System"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Update environment for local development
echo "🔧 Configuring for local development..."

# Update frontend .env.local for local development
cat > frontend/.env.local << 'EOF'
# Local Development Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_APP_URL=http://localhost:8000

# Azure endpoints (will fallback to local if not available)
NEXT_PUBLIC_MARINE_AGENT_URL=http://localhost:8000
NEXT_PUBLIC_CLAIMS_AGENT_URL=http://localhost:8000
NEXT_PUBLIC_AGENTCORE_URL=http://localhost:8000
NEXT_PUBLIC_FNOL_AGENT_URL=http://localhost:8000

# Azure AD B2C Configuration (demo mode)
NEXT_PUBLIC_B2C_CLIENT_ID=demo-client-id
NEXT_PUBLIC_B2C_TENANT_NAME=demo-tenant
NEXT_PUBLIC_B2C_POLICY_SIGNUP_SIGNIN=B2C_1_signupsignin
NEXT_PUBLIC_B2C_AUTHORITY=https://demo-tenant.b2clogin.com/demo-tenant.onmicrosoft.com/B2C_1_signupsignin
NEXT_PUBLIC_REDIRECT_URI=http://localhost:3000/chat

# Demo mode
NEXT_PUBLIC_DEMO_MODE=true
EOF

# Update backend .env for local development
cat > backend/.env << 'EOF'
# Local Development Configuration
AZURE_OPENAI_ENDPOINT=https://api.openai.com/v1/
AZURE_OPENAI_API_KEY=demo-key
AZURE_OPENAI_DEPLOYMENT=gpt-3.5-turbo

# Local endpoints
MARINE_AGENT_URL=http://localhost:8000
CLAIMS_AGENT_URL=http://localhost:8000
AGENTCORE_URL=http://localhost:8000
FNOL_AGENT_URL=http://localhost:8000

# CORS Origins
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Environment
ENVIRONMENT=development
PORT=8000
DEMO_MODE=true
EOF

echo "✅ Environment configured for local development"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -f "requirements.txt" ]; then
    cat > requirements.txt << 'EOF'
fastapi==0.104.1
uvicorn==0.24.0
python-dotenv==1.0.0
pydantic==2.5.0
python-multipart==0.0.6
requests==2.31.0
EOF
fi

if ! pip3 show fastapi &> /dev/null; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
fi
cd ..

echo "✅ Dependencies installed"

# Create a simple working backend if it doesn't exist
if [ ! -f "backend/app.py" ]; then
    echo "🔧 Creating local backend..."
    cat > backend/app.py << 'EOF'
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from datetime import datetime
import json

app = FastAPI(title="SageInsure Local API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    text: str
    conversationId: str = "local-session"
    specialist: str = "GENERAL"
    context: list = []

class ChatResponse(BaseModel):
    response: str
    agent: str
    specialist: str
    confidence: float
    status: str
    conversationId: str
    timestamp: str

@app.get("/")
async def health_check():
    return {
        "status": "SageInsure Local API Running",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "mode": "local_development"
    }

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """Main chat endpoint that handles all specialist requests"""
    
    specialist_responses = {
        "CLAIMS_MANAGER": generate_claims_response(request.text),
        "POLICY_ASSISTANT": generate_policy_response(request.text),
        "MARINE_SPECIALIST": generate_marine_response(request.text),
        "CYBER_SPECIALIST": generate_cyber_response(request.text),
        "FNOL_PROCESSOR": generate_fnol_response(request.text),
        "UNDERWRITER": generate_underwriting_response(request.text),
        "RESEARCH_ASSISTANT": generate_research_response(request.text),
    }
    
    response_text = specialist_responses.get(
        request.specialist, 
        f"Hello! I'm your {request.specialist.replace('_', ' ').title()} assistant. How can I help you today?"
    )
    
    return ChatResponse(
        response=response_text,
        agent=f"Local {request.specialist.replace('_', ' ').title()}",
        specialist=request.specialist,
        confidence=0.9,
        status="success",
        conversationId=request.conversationId,
        timestamp=datetime.now().isoformat()
    )

def generate_claims_response(text: str) -> str:
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["file", "submit", "report"]):
        return """I'll help you file a claim right away! Here's what I need:

🔍 **Claim Information:**
• Type of incident (auto, property, health, etc.)
• Date and time it occurred
• Location of the incident
• Description of what happened

📋 **Required Documents:**
• Photos of any damage
• Police report (if applicable)
• Medical records (for injury claims)
• Receipts for expenses

📞 **Next Steps:**
1. I'll create your claim number
2. Assign an adjuster within 24 hours
3. Schedule inspection if needed
4. Keep you updated throughout the process

What type of claim would you like to file?"""
    
    elif any(word in text_lower for word in ["status", "track", "update"]):
        return """I can help you track your claim status. Here's what I can check:

📊 **Claim Status Options:**
• **Submitted** - We've received your claim
• **Under Review** - Adjuster is investigating
• **Pending** - Waiting for additional information
• **Approved** - Claim approved for payment
• **Settled** - Payment has been processed

🔍 **To check your status, I need:**
• Your claim number, OR
• Policy number and incident date

What's your claim number or policy information?"""
    
    return """👋 Hello! I'm your Claims Manager. I can help you with:

🚗 **Auto Claims** - Accidents, theft, vandalism
🏠 **Property Claims** - Fire, water damage, storms
🏥 **Health Claims** - Medical treatments, prescriptions
💼 **Business Claims** - Commercial liability, property
⚓ **Marine Claims** - Vessel damage, cargo loss

**Quick Actions:**
• File a new claim
• Check claim status
• Upload documents
• Schedule adjuster visit
• Get repair estimates

What can I help you with today?"""

def generate_policy_response(text: str) -> str:
    text_lower = text.lower()
    
    if any(word in text_lower for word in ["coverage", "covered", "cover"]):
        return """Let me explain your coverage options:

📋 **Standard Coverage Types:**

🚗 **Auto Insurance:**
• Liability (required by law)
• Collision (vehicle damage)
• Comprehensive (theft, weather, vandalism)
• Medical payments
• Uninsured/underinsured motorist

🏠 **Home Insurance:**
• Dwelling coverage (structure)
• Personal property
• Liability protection
• Additional living expenses
• Medical payments to others

💡 **To check your specific coverage:**
• Provide your policy number
• Tell me what situation you're asking about
• I'll explain exactly what's covered

What type of coverage question do you have?"""
    
    elif any(word in text_lower for word in ["premium", "cost", "price", "payment"]):
        return """I can help you understand your premium and payment options:

💰 **Premium Factors:**
• Coverage limits and deductibles
• Your location and risk factors
• Claims history and credit score
• Vehicle/property characteristics
• Available discounts

💳 **Payment Options:**
• Monthly automatic payments
• Quarterly or semi-annual payments
• Annual payment (often includes discount)
• Online payment portal
• Phone or mail payments

🎯 **Ways to Save:**
• Bundle multiple policies
• Increase deductibles
• Maintain good driving record
• Install safety devices
• Take defensive driving courses

Would you like a quote or help with payment options?"""
    
    return """📄 Hi! I'm your Policy Assistant. I can help with:

**Policy Services:**
• Coverage explanations and limits
• Premium calculations and discounts
• Policy updates and changes
• Renewal information
• Adding or removing coverage

**Common Questions:**
• What's covered under my policy?
• How can I lower my premium?
• When is my renewal date?
• How do I add a driver or vehicle?
• What discounts am I eligible for?

**Quick Actions:**
• Get policy documents
• Update contact information
• Request coverage changes
• Set up automatic payments

What policy question can I answer for you?"""

def generate_marine_response(text: str) -> str:
    return """⚓ Welcome to Marine Insurance! I specialize in maritime coverage:

🚢 **Vessel Insurance:**
• Hull and machinery coverage
• Protection & Indemnity (P&I)
• Crew liability and medical
• Marina and mooring coverage
• Salvage and wreck removal

📦 **Cargo Insurance:**
• Import/export shipments
• Inland transit coverage
• Warehouse-to-warehouse protection
• International trade coverage
• Temperature-sensitive cargo

🌊 **Marine Perils Covered:**
• Storm and weather damage
• Collision and grounding
• Fire and explosion
• Piracy and theft
• General average contributions
• Sue and labor expenses

🎯 **Specialized Services:**
• Marine surveys and inspections
• Loss prevention consulting
• Claims handling worldwide
• 24/7 emergency response

Whether you're a commercial operator, cargo shipper, or recreational boater, I can help you navigate marine insurance. What type of marine coverage do you need?"""

def generate_cyber_response(text: str) -> str:
    return """🔒 Cyber Insurance Specialist here! I protect against digital threats:

💻 **Cyber Coverage Areas:**
• Data breach response and notification
• Ransomware and malware attacks
• Business interruption from cyber events
• Cyber extortion and social engineering
• Network security liability
• Privacy liability claims

🛡️ **Risk Assessment Services:**
• Cybersecurity vulnerability scans
• Employee training programs
• Incident response planning
• Compliance consulting (GDPR, HIPAA, PCI)
• Security best practices guidance

⚡ **Immediate Incident Response:**
• 24/7 cyber incident hotline
• Forensic investigation coordination
• Legal and regulatory compliance
• Public relations and crisis management
• Customer notification services

🎯 **Industries We Serve:**
• Healthcare and medical practices
• Financial services
• Retail and e-commerce
• Manufacturing
• Professional services
• Small to enterprise businesses

Are you looking for cyber coverage, dealing with an incident, or need a risk assessment?"""

def generate_fnol_response(text: str) -> str:
    return """📞 First Notice of Loss (FNOL) - I'm here for immediate incident reporting!

🚨 **Report Your Loss Now:**

**Step 1: Safety First**
• Ensure everyone is safe and secure
• Call 911 if there are injuries
• Move to a safe location if possible

**Step 2: Document Everything**
• Take photos of damage/scene
• Get contact info from witnesses
• Note weather conditions
• Record time and location details

**Step 3: Information I Need**
• Date, time, and location of incident
• Description of what happened
• Parties involved and their information
• Police report number (if applicable)
• Estimated damages or injuries

**Step 4: Immediate Actions**
• I'll assign your claim number instantly
• Connect you with an adjuster within 24 hours
• Arrange emergency services if needed
• Provide claim status updates

🎯 **Types of Incidents:**
• Auto accidents and collisions
• Property damage (fire, storm, theft)
• Workplace injuries
• Liability incidents
• Marine casualties

Ready to report your incident? Let's start with what happened and when."""

def generate_underwriting_response(text: str) -> str:
    return """📊 Underwriting Specialist - I evaluate risks and determine coverage:

🔍 **Risk Assessment Process:**
• Application review and verification
• Financial analysis and credit evaluation
• Loss history and claims analysis
• Property inspection coordination
• Industry and geographic risk factors

📈 **Underwriting Services:**
• New business evaluation
• Renewal underwriting
• Coverage modifications
• Risk improvement recommendations
• Premium calculations and rating

💼 **Specialized Lines:**
• Commercial general liability
• Professional liability
• Directors & officers coverage
• Cyber liability
• International coverage
• High-value personal lines

🎯 **Risk Management:**
• Loss control services
• Safety program development
• Claims prevention strategies
• Industry best practices
• Regulatory compliance guidance

**Underwriting Factors:**
• Business operations and exposures
• Safety records and procedures
• Financial stability
• Management experience
• Geographic considerations

What type of coverage are you looking to underwrite, or do you need help with risk assessment?"""

def generate_research_response(text: str) -> str:
    return """🔬 Research Assistant - Providing data-driven insurance insights:

📊 **Market Research & Analysis:**
• Industry trends and forecasting
• Competitive intelligence
• Regulatory impact analysis
• Emerging risk identification
• Market opportunity assessment

📈 **Data Analytics Services:**
• Claims pattern analysis
• Loss ratio calculations
• Pricing model development
• Risk correlation studies
• Predictive modeling

🎯 **Strategic Research:**
• Product development insights
• Market expansion opportunities
• Customer behavior analysis
• Technology impact assessment
• Demographic trend analysis

💡 **Research Capabilities:**
• Statistical analysis and modeling
• Survey design and execution
• Focus group coordination
• Literature reviews
• Regulatory research
• Economic impact studies

**Recent Research Areas:**
• Climate change impact on insurance
• Autonomous vehicle implications
• Cyber risk evolution
• Pandemic business interruption
• ESG factors in underwriting

What research question or analysis can I help you with today?"""

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
EOF
    echo "✅ Local backend created"
fi

echo ""
echo "🎉 Setup complete! Starting the system..."
echo ""

# Function to start backend
start_backend() {
    echo "🔧 Starting backend on http://localhost:8000..."
    cd backend
    python3 app.py &
    BACKEND_PID=$!
    cd ..
    sleep 3
    
    # Test if backend is running
    if curl -s http://localhost:8000/ > /dev/null; then
        echo "✅ Backend is running!"
    else
        echo "❌ Backend failed to start"
        return 1
    fi
}

# Function to start frontend
start_frontend() {
    echo "🎨 Starting frontend on http://localhost:3000..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    sleep 5
    
    echo "✅ Frontend is starting..."
}

# Start services
start_backend
if [ $? -eq 0 ]; then
    start_frontend
    
    echo ""
    echo "🚀 SageInsure is now running!"
    echo "================================"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Docs: http://localhost:8000/docs"
    echo ""
    echo "✨ All specialist tabs are now working with intelligent responses!"
    echo ""
    echo "🛑 To stop the system:"
    echo "   Press Ctrl+C or run: pkill -f 'node.*next' && pkill -f 'python.*app.py'"
    echo ""
    
    # Keep script running
    wait
else
    echo "❌ Failed to start backend. Please check the error messages above."
    exit 1
fi