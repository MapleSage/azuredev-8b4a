import { useState } from 'react'

interface CyberQuote {
  quote: string
  findings: {
    critical: number
    high: number
    medium: number
    low: number
    informational: number
  }
  riskAssessment?: {
    riskLevel: string
    totalRiskScore: number
    recommendations: string[]
  }
  coverage?: {
    dataBreachResponse: string
    businessInterruption: string
    cyberExtortion: string
    regulatoryFines: string
  }
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function CyberInsurance() {
  const [accountId, setAccountId] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [isLoading, setIsLoading] = useState(false)
  const [quote, setQuote] = useState<CyberQuote | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'quote' | 'chat'>('quote')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-southeast-1',
    'ap-southeast-2', 'ap-northeast-1', 'ca-central-1'
  ]

  const handleShareFindings = () => {
    if (!accountId.trim()) {
      alert('Please enter your AWS Account ID.')
      return
    }

    const externalId = Math.random().toString(36).substring(2, 15)
    const partnerName = 'SageInsure'
    const partnerAccountId = '767398007438'
    const templateURL = 'https://s3.amazonaws.com/sageinsure-cyber-templates/customer-template.yaml'
    const snsTopicArn = `arn:aws:sns:${region}:${partnerAccountId}:SageInsureCyberQuoteTopic`

    const cloudFormationUrl = `https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks/create/review?stackName=${partnerName}CyberInsuranceStack&templateURL=${templateURL}&param_PartnerAccountId=${partnerAccountId}&param_ExternalId=${externalId}&param_SnsTopicArn=${snsTopicArn}`
    
    window.open(cloudFormationUrl, '_blank')

    fetch('/api/cyber-insurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_account',
        accountId,
        region,
        externalId
      })
    }).catch(console.error)
  }

  const handleGetQuote = async () => {
    if (!accountId.trim()) {
      alert('Please enter your AWS Account ID.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/cyber-insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_quote',
          accountId,
          region
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setQuote(data)
    } catch (err: any) {
      setError(err.message || 'Failed to get quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsChatLoading(true)

    try {
      const response = await fetch('/api/cyber-insurance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          message: inputMessage
        })
      })

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`)
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response || 'I\'m here to help with your cyber insurance needs.',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsChatLoading(false)
    }
  }

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Sub-header with cyber insurance branding and tabs */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🛡️</div>
            <div>
              <h2 className="text-lg font-semibold">Cyber Insurance Portal</h2>
              <p className="text-red-100 text-sm">AWS Security Hub Based Risk Assessment</p>
            </div>
          </div>
          
          {/* Sub-tab Navigation */}
          <div className="flex bg-red-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('quote')}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                activeTab === 'quote' 
                  ? 'bg-white text-red-600' 
                  : 'text-red-100 hover:text-white hover:bg-red-700'
              }`}
            >
              Get Quote
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                activeTab === 'chat' 
                  ? 'bg-white text-red-600' 
                  : 'text-red-100 hover:text-white hover:bg-red-700'
              }`}
            >
              Chat Assistant
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-6 h-96 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Cyber Insurance Assistant</h3>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    <p>👋 Hi! I'm your cyber insurance specialist.</p>
                    <p>Ask me about coverage, risk assessment, or security best practices.</p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-red-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <p className="text-sm text-gray-500">Typing...</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about cyber insurance..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'quote' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Introduction */}
            <div>
              <p className="text-gray-700 mb-4">
                Welcome to the SageInsure Cyber Insurance Portal. Share your <strong>AWS Security Hub</strong> findings to receive a cyber insurance quote based on your security posture.
              </p>
              
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">Prerequisites:</h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• AWS Security Hub enabled across your organization</li>
                  <li>• AWS Foundational Security Best Practices v1.0.0 standard enabled</li>
                  <li>• Security Hub findings aggregated in a central account</li>
                  <li>• Allow up to 48 hours for findings generation</li>
                </ul>
              </div>
            </div>

            {/* Form */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Cyber Insurance Quote</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer AWS Account ID
                  </label>
                  <input
                    type="text"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="123456789012"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Security Hub Aggregation Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {regions.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleShareFindings}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  1. Share Security Hub Findings with SageInsure
                </button>
                
                <button
                  onClick={handleGetQuote}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? 'Processing...' : '2. Get Quote'}
                </button>
              </div>
            </div>

            {/* Risk-Based Pricing Model */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Risk-Based Pricing Model</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left">Finding Severity</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Cost per Finding</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="border border-gray-300 px-4 py-2">Critical</td><td className="border border-gray-300 px-4 py-2 text-red-600 font-semibold">$1,000</td></tr>
                    <tr><td className="border border-gray-300 px-4 py-2">High</td><td className="border border-gray-300 px-4 py-2 text-orange-600 font-semibold">$500</td></tr>
                    <tr><td className="border border-gray-300 px-4 py-2">Medium</td><td className="border border-gray-300 px-4 py-2 text-yellow-600 font-semibold">$100</td></tr>
                    <tr><td className="border border-gray-300 px-4 py-2">Low</td><td className="border border-gray-300 px-4 py-2 text-blue-600 font-semibold">$10</td></tr>
                    <tr><td className="border border-gray-300 px-4 py-2">Informational</td><td className="border border-gray-300 px-4 py-2 text-gray-600 font-semibold">$1</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Assessment Icons */}
            <div className="mb-6">
              <div className="flex justify-center space-x-6">
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">📊</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Analytics</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">📷</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Evidence</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">⚠️</span>
                  </div>
                  <span className="text-sm font-medium text-purple-700">Alerts</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-red-100 rounded-lg hover:bg-red-200 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">🎯</span>
                  </div>
                  <span className="text-sm font-medium text-red-700">Incidents</span>
                </div>
                
                <div className="flex flex-col items-center p-4 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-2">
                    <span className="text-white text-2xl">⭐</span>
                  </div>
                  <span className="text-sm font-medium text-blue-700">Premium</span>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">Error: {error}</p>
              </div>
            )}

            {/* Quote Results */}
            {quote && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">Your Cyber Insurance Quote</h3>
                  <p className="text-2xl font-bold text-green-700 mb-4">{quote.quote}</p>
                  
                  {quote.riskAssessment && (
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                        quote.riskAssessment.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' :
                        quote.riskAssessment.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        Risk Level: {quote.riskAssessment.riskLevel}
                      </span>
                      <span className="ml-3 text-gray-600">
                        Total Risk Score: {quote.riskAssessment.totalRiskScore}
                      </span>
                    </div>
                  )}
                  
                  <h4 className="font-semibold mb-3">Security Findings Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left">Severity</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Count</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Cost per Finding</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Critical</td>
                          <td className="border border-gray-300 px-4 py-2">{quote.findings.critical}</td>
                          <td className="border border-gray-300 px-4 py-2">$1,000</td>
                          <td className="border border-gray-300 px-4 py-2">${quote.findings.critical * 1000}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">High</td>
                          <td className="border border-gray-300 px-4 py-2">{quote.findings.high}</td>
                          <td className="border border-gray-300 px-4 py-2">$500</td>
                          <td className="border border-gray-300 px-4 py-2">${quote.findings.high * 500}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Medium</td>
                          <td className="border border-gray-300 px-4 py-2">{quote.findings.medium}</td>
                          <td className="border border-gray-300 px-4 py-2">$100</td>
                          <td className="border border-gray-300 px-4 py-2">${quote.findings.medium * 100}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Low</td>
                          <td className="border border-gray-300 px-4 py-2">{quote.findings.low}</td>
                          <td className="border border-gray-300 px-4 py-2">$10</td>
                          <td className="border border-gray-300 px-4 py-2">${quote.findings.low * 10}</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-4 py-2">Informational</td>
                          <td className="border border-gray-300 px-4 py-2">{quote.findings.informational}</td>
                          <td className="border border-gray-300 px-4 py-2">$1</td>
                          <td className="border border-gray-300 px-4 py-2">${quote.findings.informational}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Coverage Details */}
                {quote.coverage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-800 mb-3">Coverage Limits</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Data Breach Response</p>
                        <p className="text-blue-700">{quote.coverage.dataBreachResponse}</p>
                      </div>
                      <div>
                        <p className="font-medium">Business Interruption</p>
                        <p className="text-blue-700">{quote.coverage.businessInterruption}</p>
                      </div>
                      <div>
                        <p className="font-medium">Cyber Extortion</p>
                        <p className="text-blue-700">{quote.coverage.cyberExtortion}</p>
                      </div>
                      <div>
                        <p className="font-medium">Regulatory Fines</p>
                        <p className="text-blue-700">{quote.coverage.regulatoryFines}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recommendations */}
                {quote.riskAssessment?.recommendations && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-800 mb-3">Security Recommendations</h4>
                    <ul className="space-y-2">
                      {quote.riskAssessment.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-yellow-600 mt-1">•</span>
                          <span className="text-yellow-700">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Feedback Assistant - Fixed Position */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-gray-600 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer hover:bg-gray-700 transition-colors">
          <span className="text-sm font-medium">Feedback Assistant</span>
        </div>
      </div>
    </div>
  )
}