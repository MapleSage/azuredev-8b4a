import { useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function UnderwritingAgent() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🏛️ **Azure Underwriting Workbench**

I'm your AI-powered underwriting assistant, connected to Azure OpenAI GPT-4o and Azure Cognitive Search.

**🎯 Underwriting Capabilities:**
• **Risk Assessment**: Analyze policy applications and determine risk levels
• **Policy Pricing**: Calculate premiums based on risk factors and coverage
• **Document Review**: Process applications, medical records, and supporting documents
• **Compliance Check**: Ensure applications meet regulatory requirements
• **Decision Support**: Provide underwriting recommendations with reasoning

**📊 Real-Time Analytics:**
• **Portfolio Analysis**: Review existing book of business
• **Market Trends**: Access current insurance market data
• **Regulatory Updates**: Stay current with compliance requirements
• **Performance Metrics**: Track underwriting KPIs and profitability

**🔍 Available Tools:**
• Risk scoring algorithms
• Actuarial tables and models
• Medical underwriting guidelines
• Property valuation tools
• Credit and background checks

How can I assist with your underwriting needs today?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      // Call your deployed Underwriter Agent
      const response = await fetch('https://sageinsure-underwriter-agent.happyriver-cf203d90.eastus.azurecontainerapps.io/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversation_history: [],
          specialist: 'UNDERWRITER_AGENT',
          kb: 'underwriting-agent',
          domain: 'UNDERWRITING'
        })
      })

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || data.answer || 'No response from Azure OpenAI',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error connecting to Azure OpenAI: ${error.message}`,
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
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📋</div>
            <div>
              <h1 className="text-2xl font-bold">Azure Underwriting Workbench</h1>
              <p className="text-blue-100">AI-powered risk assessment and policy underwriting</p>
            </div>
          </div>
          <div className="text-xs bg-white/20 px-3 py-1 rounded">
            Azure OpenAI GPT-4o
          </div>
        </div>
      </div>

      {/* Azure Services Status */}
      <div className="flex-shrink-0 bg-gray-50 p-4 border-b">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✅ Azure OpenAI Connected</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✅ Cognitive Search Active</span>
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✅ Cosmos DB Online</span>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">🔄 Real-time Processing</span>
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
                <span className="text-gray-600">Analyzing with Azure OpenAI...</span>
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
            placeholder="Ask about risk assessment, policy pricing, or underwriting guidelines..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '...' : 'Analyze'}
          </button>
        </form>
        
        <div className="mt-2 text-xs text-gray-500 text-center">
          Powered by Azure OpenAI GPT-4o • Connected to Azure Cognitive Search • Real-time Processing
        </div>
      </div>
    </div>
  )
}