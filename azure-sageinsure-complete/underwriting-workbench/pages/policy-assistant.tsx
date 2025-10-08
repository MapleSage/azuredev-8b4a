import { useState, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function PolicyAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm Felix, your Insurance Policy AI Assistant. I can help you understand your insurance coverage 24/7. What would you like to know about your policy?",
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [userPolicy, setUserPolicy] = useState({
    policyNumber: 'POL-123456',
    policyHolder: 'John Doe',
    vehicleDetails: '2020 Honda Civic',
    coverage: 'Comprehensive Coverage',
    deductible: '$500',
    premiumAmount: '$1,200/year'
  })

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const response = generatePolicyResponse(inputMessage)
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1500)
  }

  const generatePolicyResponse = (question: string): string => {
    const q = question.toLowerCase()
    
    if (q.includes('deductible')) {
      return `Based on your policy ${userPolicy.policyNumber}, your deductible is ${userPolicy.deductible}. This is the amount you'll pay out of pocket before your insurance coverage applies to a claim. This applies to comprehensive and collision coverage for your ${userPolicy.vehicleDetails}.`
    }
    
    if (q.includes('coverage') || q.includes('cover')) {
      return `Your policy includes ${userPolicy.coverage} for your ${userPolicy.vehicleDetails}. This comprehensive protection includes:
      
• **Collision Coverage**: Damage from accidents with other vehicles or objects
• **Comprehensive Coverage**: Theft, vandalism, weather damage, fire
• **Liability Coverage**: Bodily injury and property damage to others
• **Medical Payments**: Medical expenses for you and passengers

Your coverage limits and specific details are outlined in your policy documents.`
    }
    
    if (q.includes('premium') || q.includes('cost') || q.includes('payment')) {
      return `Your annual premium is ${userPolicy.premiumAmount} for your ${userPolicy.coverage}. This covers your policy for the full year and includes all the comprehensive protections. You can pay monthly, quarterly, or annually. Contact us at insurance-queries@sageinsure.com for payment options.`
    }
    
    if (q.includes('claim') || q.includes('accident')) {
      return `To file a claim for your ${userPolicy.vehicleDetails}:

**📞 24/7 Claims Hotline**: 1-800-SAGE-CLAIM
**📧 Email**: claims@sageinsure.com  
**🌐 Online**: Visit our claims portal

**Have Ready**:
• Policy Number: ${userPolicy.policyNumber}
• Date, time, and location of incident
• Photos of damage
• Police report number (if applicable)
• Other driver's information

We'll assign a claims adjuster within 24 hours and guide you through the entire process.`
    }
    
    if (q.includes('contact') || q.includes('phone') || q.includes('help')) {
      return `**Contact SageInsure Support:**

📞 **Customer Service**: 1-800-SAGE-INS (24/7)
📧 **General Inquiries**: support@sageinsure.com
📧 **Policy Questions**: insurance-queries@sageinsure.com
📧 **Claims**: claims@sageinsure.com

**Your Account Manager**: Available Mon-Fri 8AM-6PM EST
**Policy Number**: ${userPolicy.policyNumber}

I'm also here 24/7 to answer questions about your coverage!`
    }
    
    return `I can help you with questions about:

**📋 Policy Information:**
• Coverage details and benefits
• Deductibles and limits  
• Policy terms and conditions
• Exclusions and restrictions

**💰 Billing & Payments:**
• Premium costs and payment options
• Billing questions and account management

**🚗 Claims Process:**
• How to file a claim
• Claims status and updates
• Required documentation

**📞 Contact Information:**
• Customer service and support
• Emergency claim reporting

What specific aspect of your ${userPolicy.coverage} would you like to know more about?`
  }

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🛡️</div>
          <div>
            <h1 className="text-2xl font-bold">Policy Assistant</h1>
            <p className="text-blue-100">Your AI-powered insurance policy companion</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Policy Info Sidebar */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-800 mb-4">Your Policy Information</h3>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Policy Number</div>
              <div className="font-medium">{userPolicy.policyNumber}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Policy Holder</div>
              <div className="font-medium">{userPolicy.policyHolder}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Vehicle</div>
              <div className="font-medium">{userPolicy.vehicleDetails}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Coverage Type</div>
              <div className="font-medium">{userPolicy.coverage}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Deductible</div>
              <div className="font-medium text-green-600">{userPolicy.deductible}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <div className="text-sm text-gray-600">Annual Premium</div>
              <div className="font-medium text-blue-600">{userPolicy.premiumAmount}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-800 mb-3">Quick Actions</h4>
            <div className="space-y-2">
              <button 
                onClick={() => setInputMessage("What does my policy cover?")}
                className="w-full text-left p-2 text-sm bg-white border rounded hover:bg-gray-50"
              >
                📋 View Coverage Details
              </button>
              <button 
                onClick={() => setInputMessage("How do I file a claim?")}
                className="w-full text-left p-2 text-sm bg-white border rounded hover:bg-gray-50"
              >
                🚨 File a Claim
              </button>
              <button 
                onClick={() => setInputMessage("What is my deductible?")}
                className="w-full text-left p-2 text-sm bg-white border rounded hover:bg-gray-50"
              >
                💰 Check Deductible
              </button>
              <button 
                onClick={() => setInputMessage("How can I contact support?")}
                className="w-full text-left p-2 text-sm bg-white border rounded hover:bg-gray-50"
              >
                📞 Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Felix is typing...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your policy coverage, claims, or billing..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              🛡️ Protected by AI Guardrails • 🔒 Secure & Private • 📚 Grounded in Policy Documents
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}