import { useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: string[]
}

export default function PolicyAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to your Insurance Policy AI Assistant!**

I'm here to help you understand your insurance coverage 24/7. I can:

**📋 Policy Information:**
• Explain your coverage details and benefits
• Clarify policy terms and conditions
• Help you understand deductibles and limits
• Review exclusions and restrictions

**🔍 Quick Answers:**
• "What does my auto policy cover?"
• "How much is my deductible for home insurance?"
• "Am I covered for flood damage?"
• "What's my liability limit?"

**📄 Document Analysis:**
• Summarize complex policy documents
• Explain legal terms in simple language
• Provide personalized responses based on your specific policy

**🛡️ Secure & Reliable:**
• Protected by AWS Guardrails for responsible AI
• Grounded responses with factual citations
• Your personal policy information is kept secure

How can I help you with your insurance policy today?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState('john_doe')

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
      // Call policy assistant API
      const response = await fetch('/api/policy-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          customer: selectedCustomer
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
        timestamp: new Date(),
        citations: data.citations
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}\n\n*Note: Policy Assistant requires connection to the deployed EC2 instance with Streamlit app and Bedrock Knowledge Base for full functionality.*`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🏛️</div>
            <div>
              <h2 className="text-2xl font-bold">Insurance Policy AI Assistant</h2>
              <p className="text-indigo-100">24/7 personalized policy guidance with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="text-sm bg-white/20 text-white border border-white/30 rounded px-3 py-2"
            >
              <option value="john_doe">John Doe</option>
              <option value="john_smith">John Smith</option>
            </select>
            <div className="text-xs bg-white/20 px-2 py-1 rounded">
              EC2 Deployed
            </div>
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="flex-shrink-0 bg-gray-50 p-4 border-b">
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">🧠 Bedrock Knowledge Base</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">🔍 OpenSearch Serverless</span>
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">🏛️ CloudFront + WAF</span>
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">🔐 Cognito Auth</span>
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">🛡️ Bedrock Guardrails</span>
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">💾 DynamoDB Sessions</span>
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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {message.citations && message.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm font-medium text-gray-600 mb-2">📚 Sources:</p>
                  <div className="space-y-1">
                    {message.citations.map((citation, idx) => (
                      <p key={idx} className="text-xs text-gray-500">
                        • {citation}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className={`text-xs mt-2 ${
                message.role === 'user' ? 'text-indigo-100' : 'text-gray-500'
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span className="text-gray-600">Analyzing your policy...</span>
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
            placeholder="Ask about your insurance policy..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Ask'}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Powered by Amazon Bedrock Knowledge Base • Secured with Guardrails • Available 24/7
        </div>
      </div>
    </div>
  )
}