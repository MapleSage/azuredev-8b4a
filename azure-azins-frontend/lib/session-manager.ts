interface ConversationSession {
  sessionId: string
  userId: string
  context: Record<string, any>
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    metadata?: any
  }>
  claimData?: {
    policyNumber?: string
    incidentDate?: string
    description?: string
    claimId?: string
    status?: string
    submittedAt?: string
  }
}

export class SessionManager {
  private sessions: Map<string, ConversationSession> = new Map()

  createSession(userId: string): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const session: ConversationSession = {
      sessionId,
      userId,
      context: {},
      messages: [],
      claimData: {}
    }
    
    this.sessions.set(sessionId, session)
    return sessionId
  }

  getSession(sessionId: string): ConversationSession | null {
    return this.sessions.get(sessionId) || null
  }

  updateSession(sessionId: string, updates: Partial<ConversationSession>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, updates)
      this.sessions.set(sessionId, session)
    }
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string, metadata?: any): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.messages.push({
        role,
        content,
        timestamp: new Date().toISOString(),
        metadata
      })
      this.sessions.set(sessionId, session)
    }
  }

  updateClaimData(sessionId: string, claimData: Partial<ConversationSession['claimData']>): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.claimData = { ...session.claimData, ...claimData }
      this.sessions.set(sessionId, session)
    }
  }

  getConversationContext(sessionId: string): string {
    const session = this.sessions.get(sessionId)
    if (!session) return ''

    const recentMessages = session.messages.slice(-5)
    const context = recentMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n')
    
    let claimContext = ''
    if (session.claimData && Object.keys(session.claimData).length > 0) {
      claimContext = `\nClaim Context: ${JSON.stringify(session.claimData, null, 2)}`
    }

    return context + claimContext
  }
}

export const sessionManager = new SessionManager()