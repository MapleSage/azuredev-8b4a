import { sessionManager } from './session-manager'

interface ClaimStep {
  field: string
  question: string
  validator?: (value: string) => boolean
  processor?: (value: string) => any
}

const CLAIM_STEPS: ClaimStep[] = [
  {
    field: 'policyNumber',
    question: 'What\'s your policy number?',
    validator: (value) => /^[A-Z]{2,4}-\d{4,6}$/.test(value)
  },
  {
    field: 'incidentDate',
    question: 'When did the incident happen?',
    validator: (value) => value.length > 0
  },
  {
    field: 'description',
    question: 'Please describe what happened.',
    validator: (value) => value.length > 10
  }
]

export class ConversationalAgent {
  
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    const session = sessionManager.getSession(sessionId)
    if (!session) {
      return 'Session not found. Please start a new conversation.'
    }

    // Add user message to session
    sessionManager.addMessage(sessionId, 'user', userMessage)

    // Check if this is a claim filing flow
    if (this.isClaimIntent(userMessage)) {
      return this.handleClaimFlow(sessionId, userMessage)
    }

    // Handle general insurance queries
    return this.handleGeneralQuery(sessionId, userMessage)
  }

  private isClaimIntent(message: string): boolean {
    const claimKeywords = ['file', 'claim', 'damage', 'accident', 'incident', 'hull', 'collision']
    return claimKeywords.some(keyword => message.toLowerCase().includes(keyword))
  }

  private async handleClaimFlow(sessionId: string, userMessage: string): Promise<string> {
    const session = sessionManager.getSession(sessionId)!
    const claimData = session.claimData || {}

    // Check if user is starting a new claim
    if (this.isClaimIntent(userMessage) && !claimData.policyNumber) {
      sessionManager.updateClaimData(sessionId, { status: 'collecting_info' })
      const response = '🔵 I\'ll help you file your claim. ' + CLAIM_STEPS[0].question
      sessionManager.addMessage(sessionId, 'assistant', response)
      return response
    }

    // Process claim data collection
    const nextStep = this.getNextClaimStep(claimData)
    
    if (nextStep) {
      // Validate and store the current response
      const currentField = this.getCurrentField(claimData)
      if (currentField) {
        const step = CLAIM_STEPS.find(s => s.field === currentField)
        if (step?.validator && !step.validator(userMessage)) {
          const response = `Please provide a valid ${currentField}. ${step.question}`
          sessionManager.addMessage(sessionId, 'assistant', response)
          return response
        }
        
        // Store the validated data
        sessionManager.updateClaimData(sessionId, { [currentField]: userMessage })
      }

      // Ask next question
      const response = `Thanks. ${nextStep.question}`
      sessionManager.addMessage(sessionId, 'assistant', response)
      return response
    }

    // All data collected, create claim
    return this.createClaim(sessionId)
  }

  private getNextClaimStep(claimData: any): ClaimStep | null {
    for (const step of CLAIM_STEPS) {
      if (!claimData[step.field]) {
        return step
      }
    }
    return null
  }

  private getCurrentField(claimData: any): string | null {
    for (const step of CLAIM_STEPS) {
      if (!claimData[step.field]) {
        return step.field
      }
    }
    return null
  }

  private async createClaim(sessionId: string): Promise<string> {
    const session = sessionManager.getSession(sessionId)!
    const claimData = session.claimData!

    // Generate claim ID
    const claimId = this.generateClaimId(claimData.policyNumber!)
    
    // Update claim data
    sessionManager.updateClaimData(sessionId, { 
      claimId, 
      status: 'submitted',
      submittedAt: new Date().toISOString()
    })

    // Store in S3 (simulated)
    await this.storeClaimInS3(claimId, claimData)

    const response = `✅ Claim ${claimId} has been created successfully! 

**Claim Summary:**
• Policy: ${claimData.policyNumber}
• Date: ${claimData.incidentDate}  
• Description: ${claimData.description}
• Status: Under Review

You can check the status anytime by asking "What's the status of claim ${claimId}?"`

    sessionManager.addMessage(sessionId, 'assistant', response)
    return response
  }

  private generateClaimId(policyNumber: string): string {
    const prefix = policyNumber.split('-')[0]
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substr(2, 4)
    return `${prefix}-${date}-${random}`
  }

  private async storeClaimInS3(claimId: string, claimData: any): Promise<void> {
    // Simulate S3 storage
    console.log(`📁 Storing claim ${claimId} in S3:`, claimData)
    
    // In real implementation, this would:
    // 1. Upload to S3 bucket
    // 2. Store in DynamoDB
    // 3. Trigger EventBridge event
    // 4. Send to underwriter queue
  }

  private async handleGeneralQuery(sessionId: string, userMessage: string): Promise<string> {
    const context = sessionManager.getConversationContext(sessionId)
    
    // Call existing SageInsure API with context
    try {
      const response = await fetch('/api/sageinsure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage,
          context: context,
          businessLine: 'general'
        })
      })

      const data = await response.json()
      const assistantResponse = data.response || 'I apologize, but I couldn\'t process your request.'
      
      sessionManager.addMessage(sessionId, 'assistant', assistantResponse)
      return assistantResponse
      
    } catch (error) {
      const errorResponse = 'I\'m experiencing technical difficulties. Please try again.'
      sessionManager.addMessage(sessionId, 'assistant', errorResponse)
      return errorResponse
    }
  }
}

export const conversationalAgent = new ConversationalAgent()