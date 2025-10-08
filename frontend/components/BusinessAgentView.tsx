import { useState } from 'react'

interface BusinessAgentViewProps {
  agent: string
  onClose: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function BusinessAgentView({ agent, onClose }: BusinessAgentViewProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const getAgentConfig = (agentType: string) => {
    switch (agentType) {
      case 'crm':
        return {
          title: 'Customer Relationship Management Agent',
          icon: '👥',
          color: 'from-blue-600 to-indigo-600',
          description: 'Manage customer interactions, track leads, and analyze customer data',
          capabilities: [
            'Customer data management',
            'Lead tracking and scoring',
            'Sales pipeline analysis',
            'Customer interaction history',
            'Automated follow-ups'
          ],
          welcomeMessage: `🏢 **CRM Agent Ready**

I'm your Customer Relationship Management assistant. I can help you with:

**Customer Management:**
• View and update customer profiles
• Track customer interaction history
• Manage contact information and preferences

**Sales Pipeline:**
• Track leads and opportunities
• Monitor deal progression
• Generate sales forecasts and reports

**Analytics & Insights:**
• Customer behavior analysis
• Sales performance metrics
• Lead conversion tracking

**Automation:**
• Schedule follow-up reminders
• Automated email campaigns
• Task management and assignments

How can I assist with your CRM needs today?`
        }
      case 'hr':
        return {
          title: 'HR Assistant',
          icon: '🏢',
          color: 'from-green-600 to-teal-600',
          description: 'Employee management, benefits, payroll, and HR policies',
          capabilities: [
            'Employee onboarding',
            'Benefits administration',
            'Payroll queries',
            'Policy guidance',
            'Performance management'
          ],
          welcomeMessage: `👋 **HR Assistant at Your Service**

I'm here to help with all your Human Resources needs:

**Employee Services:**
• Onboarding new employees
• Benefits enrollment and queries
• Payroll and compensation questions
• Time-off requests and policies

**HR Operations:**
• Policy clarification and guidance
• Performance review processes
• Training and development programs
• Compliance and documentation

**Employee Support:**
• Career development guidance
• Workplace issue resolution
• Resource and tool access
• Company culture and events

**Integrations:**
• Calendar scheduling for meetings
• Email notifications and reminders
• Slack integration for team communication
• SQL queries for HR analytics

What HR topic can I help you with today?`
        }
      case 'marketing':
        return {
          title: 'Marketing Agent',
          icon: '📈',
          color: 'from-purple-600 to-pink-600',
          description: 'Campaign management, content creation, and marketing analytics',
          capabilities: [
            'Campaign planning',
            'Content generation',
            'Market analysis',
            'Lead generation',
            'Performance tracking'
          ],
          welcomeMessage: `🚀 **Marketing Agent Ready to Boost Your Brand**

I'm your AI-powered marketing assistant specializing in:

**Campaign Management:**
• Multi-channel campaign planning
• Budget allocation and optimization
• A/B testing strategies
• Performance monitoring and reporting

**Content Creation:**
• Marketing copy and messaging
• Social media content planning
• Email marketing campaigns
• Blog post and article ideas

**Analytics & Insights:**
• Market trend analysis
• Customer segmentation
• ROI tracking and optimization
• Competitive intelligence

**Lead Generation:**
• Target audience identification
• Lead scoring and qualification
• Conversion funnel optimization
• Customer journey mapping

Ready to elevate your marketing strategy?`
        }
      case 'investment':
        return {
          title: 'Investment Research Assistant',
          icon: '💼',
          color: 'from-yellow-600 to-orange-600',
          description: 'Financial analysis, market research, and investment insights',
          capabilities: [
            'Stock analysis',
            'Market research',
            'Portfolio management',
            'Risk assessment',
            'Financial reporting'
          ],
          welcomeMessage: `📊 **Investment Research Assistant**

I'm your AI-powered financial research assistant providing:

**Market Analysis:**
• Stock price analysis and trends
• Sector and industry research
• Economic indicator tracking
• Market sentiment analysis

**Investment Tools:**
• Portfolio optimization
• Risk assessment and management
• Diversification strategies
• Performance benchmarking

**Research Capabilities:**
• Company financial analysis
• Earnings report summaries
• Key phrase detection in documents
• Sentiment analysis of market news

**Data Processing:**
• PDF document analysis
• Audio transcription of earnings calls
• Real-time data integration
• Custom report generation

What investment research can I help you with today?`
        }
      default:
        return {
          title: 'Business Agent',
          icon: '🤖',
          color: 'from-gray-600 to-gray-700',
          description: 'AI-powered business assistant',
          capabilities: ['General assistance'],
          welcomeMessage: 'How can I help you today?'
        }
    }
  }

  const config = getAgentConfig(agent)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Mock response for business agents
      const response = await fetch('/api/business-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent,
          query: input
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || 'No response received',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}\n\n*Note: Business agents require backend integration with Bedrock Agents for full functionality.*`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize with welcome message
  if (messages.length === 0) {
    setMessages([{
      id: '1',
      role: 'assistant',
      content: config.welcomeMessage,
      timestamp: new Date()
    }])
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className={`flex-shrink-0 bg-gradient-to-r ${config.color} text-white p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{config.icon}</div>
            <div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              <p className="text-white/90">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
      </div>

      {/* Capabilities */}
      <div className="flex-shrink-0 bg-gray-50 p-4 border-b">
        <div className="flex flex-wrap gap-2">
          {config.capabilities.map((capability, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {capability}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask the ${config.title.toLowerCase()}...`}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}