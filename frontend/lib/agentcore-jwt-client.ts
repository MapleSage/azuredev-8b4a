/**
 * SageInsure AgentCore JWT Client
 * Secure multi-agent communication with JWT authorization and tenant isolation
 */

interface JWTClaims {
  sub: string;
  email: string;
  'custom:tenant_id'?: string;
  'custom:role'?: string;
  exp: number;
  iat: number;
}

interface AgentCoreResponse {
  response: string;
  agent_info: {
    agent_id: string;
    agent_name: string;
    tenant_id: string;
    session_context: {
      microvm_id: string;
      isolation_level: string;
      security_context: string;
    };
  };
  security: {
    jwt_validated: boolean;
    tenant_isolated: boolean;
    microvm_active: boolean;
  };
}

class SageInsureAgentCoreClient {
  private agentArn: string;
  private endpointUrl: string;
  private bearerToken: string;
  private sessionId: string;
  private tenantId: string;
  private userId: string;

  constructor(bearerToken: string, tenantId: string = 'default-tenant') {
    this.bearerToken = bearerToken;
    this.tenantId = tenantId;
    this.agentArn = process.env.NEXT_PUBLIC_AGENT_ARN || '';
    this.endpointUrl = process.env.NEXT_PUBLIC_BEDROCK_AGENTCORE_ENDPOINT || 'https://bedrock-agentcore.us-east-1.amazonaws.com';
    this.sessionId = `sageinsure-session-${Date.now()}`;
    this.userId = this.extractUserIdFromToken(bearerToken);
  }

  private extractUserIdFromToken(token: string): string {
    try {
      // Decode JWT payload (base64)
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded.sub || 'anonymous';
    } catch (error) {
      console.warn('Failed to decode JWT token:', error);
      return 'anonymous';
    }
  }

  private escapeArn(arn: string): string {
    return arn.replace(/:/g, '%3A').replace(/\//g, '%2F');
  }

  async sendQuery(query: string, targetAgent?: string): Promise<AgentCoreResponse> {
    try {
      const escapedArn = this.escapeArn(this.agentArn);
      const url = `${this.endpointUrl}/runtimes/${escapedArn}/invocations?qualifier=DEFAULT`;
      
      const payload = {
        prompt: query,
        target_agent: targetAgent,
        user_context: {
          tenant_id: this.tenantId,
          user_id: this.userId
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
          'X-Amzn-Trace-Id': `sageinsure-trace-${Date.now()}`,
          'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': this.sessionId
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`AgentCore request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('AgentCore query failed:', error);
      throw error;
    }
  }

  // Specialized agent methods with JWT authorization
  async queryUnderwriter(query: string): Promise<AgentCoreResponse> {
    return this.sendQuery(query, 'AXQJSDKH59');
  }

  async queryRetailAgent(query: string): Promise<AgentCoreResponse> {
    return this.sendQuery(query, 'JU9FSWIOCN');
  }

  async queryOrchestrator(query: string): Promise<AgentCoreResponse> {
    return this.sendQuery(query, 'SL48UD1CAD');
  }

  async queryMasterOrchestrator(query: string): Promise<AgentCoreResponse> {
    return this.sendQuery(query, 'CTE4EUTUUY');
  }

  // OAuth integration methods
  async initiateGoogleDriveAccess(): Promise<{ authUrl: string }> {
    const query = "I need to access my Google Drive documents for claim processing";
    const response = await this.sendQuery(query);
    
    // Extract auth URL from response (would be provided by OAuth flow)
    return {
      authUrl: "https://accounts.google.com/oauth/authorize?client_id=..."
    };
  }

  async initiateSalesforceAccess(): Promise<{ authUrl: string }> {
    const query = "I need to access Salesforce CRM data for customer information";
    const response = await this.sendQuery(query);
    
    return {
      authUrl: "https://login.salesforce.com/services/oauth2/authorize?client_id=..."
    };
  }

  // Session management
  getSessionInfo(): {
    sessionId: string;
    tenantId: string;
    userId: string;
    hasValidToken: boolean;
  } {
    return {
      sessionId: this.sessionId,
      tenantId: this.tenantId,
      userId: this.userId,
      hasValidToken: !!this.bearerToken
    };
  }

  refreshSession(): void {
    this.sessionId = `sageinsure-session-${Date.now()}`;
  }
}

// Cognito JWT Token Manager
class CognitoTokenManager {
  private poolId: string;
  private clientId: string;
  private region: string;

  constructor() {
    this.poolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID || '';
    this.clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
    this.region = 'us-east-1';
  }

  async authenticateUser(username: string, password: string): Promise<string> {
    try {
      const response = await fetch('/api/auth/cognito-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          clientId: this.clientId
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.accessToken;

    } catch (error) {
      console.error('Cognito authentication failed:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch('/api/auth/cognito-refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          clientId: this.clientId
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.accessToken;

    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  validateToken(token: string): boolean {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000);
      
      return decoded.exp > now;
    } catch (error) {
      return false;
    }
  }
}

export { 
  SageInsureAgentCoreClient, 
  CognitoTokenManager,
  type AgentCoreResponse,
  type JWTClaims 
};