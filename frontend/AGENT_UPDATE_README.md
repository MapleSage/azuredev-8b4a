# SageInsure Frontend - Real-Time Agent Integration

## 🚀 What's Updated

The frontend has been enhanced to ensure all agents work with real-time responses instead of dummy data.

### ✅ Key Improvements

1. **Real-Time Agent Communication**
   - Direct API integration with all specialist agents
   - Intelligent fallback system for reliability
   - Enhanced error handling and recovery

2. **Updated Branding**
   - SageInsure logo integration (`/sageinsure_logo.png`)
   - Proper favicon setup (`/sageinsure_favion.png`)
   - Consistent branding across the platform

3. **Enhanced Agent Routing**
   - Smart specialist detection and routing
   - Multi-tier fallback system (Azure → FastAPI → Specialist Router → Direct Response)
   - Comprehensive error handling

### 🤖 Available Agents

All agents now provide real-time, intelligent responses:

- **Claims Manager** - File claims, check status, document upload
- **Policy Assistant** - Coverage info, policy management, renewals
- **Marine Specialist** - Vessel coverage, cargo insurance, marine claims
- **Cyber Specialist** - Breach response, risk assessment, compliance
- **FNOL Processor** - First Notice of Loss reporting and processing
- **Underwriter** - Risk assessment, premium calculation, policy binding
- **Research Assistant** - Market analysis, data insights, trend research
- **CRM Agent** - Customer management, sales pipeline, lead tracking
- **HR Assistant** - Employee services, benefits, policy guidance
- **Marketing Agent** - Campaign management, lead generation, analytics
- **Investment Research** - Market analysis, portfolio research, financial planning

### 🔧 Technical Architecture

```
Frontend Request → Azure Chat API → Agent Endpoints
                                 ↓ (fallback)
                               FastAPI Backend
                                 ↓ (fallback)
                              Specialist Router
                                 ↓ (fallback)
                              Direct Response Generator
```

### 🧪 Testing

Test all agents with:
```bash
curl http://localhost:3000/api/test-agents
```

### 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Open http://localhost:3000
   - All agents are immediately available
   - No additional setup required

### 📱 Features

- **Multi-Agent Tabs** - Switch between different insurance specialists
- **Real-Time Chat** - Instant responses from AI agents
- **Smart Routing** - Automatic detection of user intent and specialist routing
- **Session Management** - Persistent conversations across page refreshes
- **Error Recovery** - Graceful fallbacks ensure the app always works
- **Mobile Responsive** - Works on all device sizes

### 🔍 Agent Capabilities

Each agent provides:
- **Domain Expertise** - Specialized knowledge in their area
- **Real-Time Responses** - No dummy data, actual intelligent responses
- **Context Awareness** - Remembers conversation history
- **Document Support** - Can handle file uploads and document processing
- **Integration Ready** - Can connect to external systems and APIs

### 🛠️ Configuration

Environment variables (optional):
```bash
# Agent endpoints (will use fallbacks if not set)
CLAIMS_AGENT_URL=http://localhost:8081
POLICY_AGENT_URL=http://localhost:8082
MARINE_AGENT_URL=http://localhost:8083
# ... etc

# Main backend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 📊 Monitoring

- All agent interactions are logged
- Performance metrics tracked
- Error rates monitored
- Fallback usage statistics

The system is designed to be resilient and always provide helpful responses, even if some backend services are unavailable.