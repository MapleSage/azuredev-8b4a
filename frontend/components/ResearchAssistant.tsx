import { useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ResearchAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `🧬 **Life Science Research Assistant**

I'm your AI-powered research assistant for pharmaceutical and drug discovery research. I can help you with:

**Research Capabilities:**
• **Scientific Literature**: Search arXiv and PubMed for latest research
• **Drug Discovery**: Find compounds and bioactivity data from ChEMBL
• **Clinical Trials**: Access ClinicalTrials.gov for trial information
• **Web Research**: Get recent news and developments via Tavily

**Example Queries:**
• "Generate a report for HER2 including recent research and clinical trials"
• "Find recent papers about BRCA1 inhibitors"
• "What are promising drug candidates for coronavirus proteins?"
• "Summarize mechanism of action for HER2 targeted therapies"

How can I assist with your research today?`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('Claude 3.5 Sonnet')

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
      // Call research assistant API
      const response = await fetch('/api/research-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: input,
          model: selectedModel
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
        content: `❌ Error: ${error.message}\n\n*Note: Research Assistant requires backend integration with Strands Agents and MCP servers for full functionality.*`,
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
      <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧬</div>
            <div>
              <h1 className="text-2xl font-bold">Life Science Research Assistant</h1>
              <p className="text-purple-100">AI-powered drug discovery and biomedical research</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm opacity-90">Model:</div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-sm bg-white/20 text-white border border-white/30 rounded px-3 py-1 font-medium"
              >
                <option value="Claude 4 Sonnet">Claude 4 Sonnet</option>
                <option value="Claude 3.7 Sonnet">Claude 3.7 Sonnet</option>
                <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet</option>
                <option value="Claude 3.5 Haiku">Claude 3.5 Haiku</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources & Capabilities */}
      <div className="flex-shrink-0 bg-gray-50 p-4 border-b">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Connected Data Sources</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">📚 arXiv Scientific Papers</span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">🏥 PubMed Biomedical</span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">🧪 ChEMBL Compounds</span>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-medium">🔬 ClinicalTrials.gov</span>
            <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">🌐 Tavily Web Search</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border">
            <div className="font-medium text-blue-600">🎯 Target Research</div>
            <div className="text-gray-600 text-xs mt-1">Protein targets, mechanisms, pathways</div>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="font-medium text-green-600">💊 Drug Discovery</div>
            <div className="text-gray-600 text-xs mt-1">Compounds, bioactivity, SAR analysis</div>
          </div>
          <div className="bg-white p-3 rounded-lg border">
            <div className="font-medium text-purple-600">🏥 Clinical Intelligence</div>
            <div className="text-gray-600 text-xs mt-1">Trials, outcomes, regulatory status</div>
          </div>
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
              className={`max-w-3xl rounded-lg p-3 ${
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
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Researching...</span>
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
            placeholder="e.g., 'Generate HER2 research report' or 'Find BRCA1 inhibitor clinical trials'"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}