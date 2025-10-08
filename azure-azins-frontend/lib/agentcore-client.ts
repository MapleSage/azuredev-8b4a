/**
 * AgentCore Runtime Client
 * Secure multi-agent communication with tenant isolation
 */

interface AgentSession {
  session_id: string;
  tenant_id: string;
  user_id: string;
  agent_id: string;
  microvm_id: string;
  expires_at: string;
  agent_type: string;
}

interface AgentResponse {
  success: boolean;
  response?: string;
  agent_id?: string;
  agent_name?: string;
  session_id?: string;
  microvm_id?: string;
  error?: string;
}

class AgentCoreClient {
  private baseUrl: string;
  private tenantId: string;
  private userId: string;
  private sessionId?: string;

  constructor(tenantId: string, userId: string) {
    this.baseUrl = process.env.NEXT_PUBLIC_AGENTCORE_API_URL || '/api/agentcore';
    this.tenantId = tenantId;
    this.userId = userId;
  }

  async createSession(agentId?: string): Promise<AgentSession> {
    // Get Cognito token
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not get Cognito token:', error);
    }

    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tenant_id: this.tenantId,
        user_id: this.userId,
        agent_id: agentId
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const session = await response.json();
    this.sessionId = session.session_id;
    return session;
  }

  async sendQuery(query: string, targetAgent?: string): Promise<AgentResponse> {
    if (!this.sessionId) {
      await this.createSession();
    }

    // Get Cognito token
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Could not get Cognito token:', error);
    }

    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session_id: this.sessionId,
        tenant_id: this.tenantId,
        user_id: this.userId,
        query,
        target_agent: targetAgent
      })
    });

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getSessionStatus(): Promise<AgentSession | null> {
    if (!this.sessionId) return null;

    const response = await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  }

  async cleanupSession(): Promise<void> {
    if (!this.sessionId) return;

    await fetch(`${this.baseUrl}/session/${this.sessionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    this.sessionId = undefined;
  }

  // Specialized agent methods
  async queryUnderwriter(query: string): Promise<AgentResponse> {
    return this.sendQuery(query, 'AXQJSDKH59');
  }

  async queryRetailAgent(query: string): Promise<AgentResponse> {
    return this.sendQuery(query, 'JU9FSWIOCN');
  }

  async queryOrchestrator(query: string): Promise<AgentResponse> {
    return this.sendQuery(query, 'SL48UD1CAD');
  }

  async queryMasterOrchestrator(query: string): Promise<AgentResponse> {
    return this.sendQuery(query, 'CTE4EUTUUY');
  }
}

export { AgentCoreClient, type AgentSession, type AgentResponse };