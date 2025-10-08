import type { NextApiRequest, NextApiResponse } from 'next'

interface PolicyResponse {
  response: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PolicyResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      response: '',
      error: 'Method not allowed' 
    })
  }

  try {
    const { query, message } = req.body
    const userQuery = query || message

    if (!userQuery) {
      return res.status(400).json({
        response: '',
        error: 'Query is required'
      })
    }

    // Call your deployed Policy Assistant
    const response = await fetch('https://sageinsure-backend.livelyforest-2e320588.eastus2.azurecontainerapps.io/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: userQuery,
        conversation_history: []
      })
    })

    if (!response.ok) {
      throw new Error(`RAG API error: ${response.status}`)
    }

    const data = await response.json()
    res.status(200).json({ 
      response: data.response || data.answer || 'No response from Azure OpenAI',
      citations: data.sources || []
    })

  } catch (error) {
    console.error('Policy Assistant error:', error)
    res.status(500).json({
      response: '',
      error: `Policy assistance failed: ${error}`
    })
  }
}

function generatePolicyResponse(query: string): string {
  const queryLower = query.toLowerCase()
  
  if (queryLower.includes('claim') || queryLower.includes('file')) {
    return `🏛️ **SageInsure Claims Assistant - Felix**

Hello! I'm Felix, your dedicated claims specialist. Let me guide you through the claims process:

**📋 Immediate Next Steps:**
1. **Document Everything**: Take photos of damage, gather receipts, collect witness information
2. **File Your Claim**: I can help you start a claim right now through our Claims Chat tab
3. **Claim ID Generation**: You'll receive a unique CNF pattern claim ID (format: 1a23b-4c)
4. **Expert Assignment**: Our Claims Manager agent will be assigned within 2 hours

**🔍 Required Information:**
• Policy number (I can help you find this)
• Date, time, and location of incident
• Detailed description of what happened
• Photos of damage or evidence
• Police report number (if applicable)
• Contact information for other parties involved

**⚡ SageInsure Advantage:**
• **AI-Powered Processing**: 60% faster than traditional methods
• **Real-time Updates**: Track your claim status 24/7
• **Multi-Agent Support**: Claims Manager, Underwriter, and Customer Service agents
• **Vendor Coordination**: Automatic scheduling with preferred repair networks

**🎯 Processing Timeline:**
• Initial review: 2-4 hours (AI-assisted)
• Adjuster assignment: Same day
• Settlement decision: 3-5 business days

Would you like me to help you start a new claim now, or do you need to check on an existing claim?`
  }
  
  if (queryLower.includes('coverage') || queryLower.includes('collision')) {
    return `Hi John Doe, based on your policy POL-2024-001, you have comprehensive coverage including:

• **Liability Coverage**: $100,000 per person, $300,000 per accident
• **Collision Coverage**: $500 deductible
• **Comprehensive Coverage**: $250 deductible
• **Uninsured Motorist**: $50,000 per person
• **Personal Injury Protection**: $10,000

Your policy also includes roadside assistance and rental car coverage up to $30/day for 30 days.

📚 **Sources:**
• Policy Document Section 2.1 - Liability Coverage
• Policy Document Section 3.4 - Collision and Comprehensive
• Policy Document Section 5.2 - Additional Benefits`
  }
  
  if (queryLower.includes('premium') || queryLower.includes('payment') || queryLower.includes('billing')) {
    return `💳 **SageInsure Premium & Billing - Felix**

I'm here to help with all your payment and billing questions:

**💰 Flexible Payment Options:**
• **Monthly AutoPay**: Convenient automatic payments (5% discount)
• **Quarterly Billing**: Reduced processing fees
• **Annual Payment**: Maximum savings (up to 12% discount)
• **Digital Wallet**: Apple Pay, Google Pay, PayPal integration
• **Traditional Methods**: Check, bank transfer, credit/debit cards

**📱 Smart Payment Features:**
• **AI Payment Reminders**: Personalized notifications
• **Premium Optimization**: AI-suggested payment schedules
• **Automatic Adjustments**: Real-time premium updates based on usage
• **Multi-Policy Discounts**: Bundling savings across all your policies

**🧮 Premium Calculation Factors:**
• **Risk Assessment**: AI-powered risk modeling
• **Claims History**: Your personal claims record
• **Coverage Selections**: Limits, deductibles, and add-ons
• **Location Factors**: Geographic risk considerations
• **Usage Patterns**: Telematics and usage-based pricing
• **Loyalty Rewards**: Long-term customer benefits

What specific billing or payment assistance do you need today?`
  }

  if (queryLower.includes('agent') || queryLower.includes('contact') || queryLower.includes('support')) {
    return `🤝 **SageInsure Agent Network - Felix**

You have access to our comprehensive multi-agent support system:

**🎯 Specialized Agents:**
• **Claims Manager Agent**: Handles all claim-related inquiries and processing
• **Underwriter Agent**: Policy analysis, risk assessment, and coverage recommendations
• **Customer Service Agent**: General support, account management, and policy changes
• **Research Assistant Agent**: Life science research, drug discovery, and clinical trial insights

**🏢 Business Support Agents:**
• **CRM Agent**: Customer relationship management and account optimization
• **HR Assistant**: Employee benefits and group policy management
• **Marketing Agent**: Insurance product information and promotional offers
• **Investment Research Agent**: Financial planning and investment-linked insurance products

**📞 Contact Methods:**
• **Live Chat**: Available 24/7 through any tab in our platform
• **Phone Support**: 1-800-SAGEINS (1-800-724-3467)
• **Email**: support@sageinsure.com
• **Video Calls**: Schedule through your account dashboard

Which agent or support channel would work best for your current needs?`
  }

  return `🔐 **Cognito Auth** | 🛡️ **Bedrock Guardrails** | 💾 **DynamoDB Sessions**

👋 **Welcome to your Insurance Policy AI Assistant!**

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

How can I help you with your insurance policy today?`
}