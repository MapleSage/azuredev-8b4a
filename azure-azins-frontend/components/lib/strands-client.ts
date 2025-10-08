// Strands UI/UX integration client
export interface StrandsMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  agent?: string
  metadata?: any
}

export interface StrandsSession {
  id: string
  title: string
  messages: StrandsMessage[]
  activeAgent?: string
  lastActivity: Date
}

export class StrandsClient {
  private apiEndpoint: string
  
  constructor(apiEndpoint: string) {
    this.apiEndpoint = apiEndpoint
  }
  
  async sendMessage(
    sessionId: string, 
    message: string, 
    files?: File[]
  ): Promise<StrandsMessage> {
    const response = await fetch(`${this.apiEndpoint}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message,
        files: files?.map(f => ({ name: f.name, size: f.size }))
      })
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    return {
      id: data.messageId,
      role: 'assistant',
      content: data.response,
      timestamp: new Date(),
      agent: data.activeAgent,
      metadata: data.metadata
    }
  }
  
  async createSession(): Promise<string> {
    const response = await fetch(`${this.apiEndpoint}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    const data = await response.json()
    return data.sessionId
  }
  
  async getSessions(): Promise<StrandsSession[]> {
    const response = await fetch(`${this.apiEndpoint}/sessions`)
    const data = await response.json()
    
    return data.sessions.map((s: any) => ({
      id: s.id,
      title: s.title,
      messages: s.messages,
      activeAgent: s.activeAgent,
      lastActivity: new Date(s.lastActivity)
    }))
  }
}