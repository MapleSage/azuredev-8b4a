/**
 * SageInsure AgentCore Client
 * Proper implementation following AWS Bedrock AgentCore patterns
 */

interface AgentCoreResponse {
  role: "assistant";
  content: Array<{
    text: string;
  }>;
  agent_info: {
    agent_name: string;
    agent_type: string;
    bedrock_agent_id: string;
    capabilities: string[];
  };
  security_context: {
    tenant_id: string;
    user_id: string;
    microvm_id: string;
    jwt_validated: boolean;
    isolation_level: string;
  };
  session_metadata: {
    routing_decision: string;
    user_role: string;
    timestamp: number;
  };
  azure_metadata?: {
    sources: Array<{
      title: string;
      content: string;
      score: number;
      metadata: any;
      specialist: string;
    }>;
    confidence: number;
    tokens_used: number;
    specialist: string;
  };
}

interface CognitoTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}

class SageInsureAgentCoreClient {
  private agentArn: string;
  private endpointUrl: string;
  private region: string;
  private cognitoPoolId: string;
  private cognitoClientId: string;
  private sessionId: string;

  constructor() {
    this.agentArn = process.env.NEXT_PUBLIC_AGENT_ARN || "";
    this.endpointUrl =
      process.env.NEXT_PUBLIC_BEDROCK_AGENTCORE_ENDPOINT ||
      "https://bedrock-agentcore.us-east-1.amazonaws.com";
    this.region = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
    this.cognitoPoolId = process.env.NEXT_PUBLIC_COGNITO_POOL_ID || "";
    this.cognitoClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";
    this.sessionId = `sageinsure-session-${Date.now()}`;
  }

  /**
   * Authenticate user with Cognito and get JWT tokens
   */
  async authenticateUser(
    username: string,
    password: string
  ): Promise<CognitoTokens> {
    try {
      const response = await fetch("/api/auth/cognito-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          clientId: this.cognitoClientId,
          region: this.region,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Authentication failed");
      }

      const tokens = await response.json();

      // Store tokens securely
      this.storeTokens(tokens);

      return tokens;
    } catch (error) {
      console.error("Cognito authentication failed:", error);
      throw error;
    }
  }

  /**
   * Send query to AgentCore Runtime with JWT authentication
   * Now supports both AWS Bedrock and Azure FastAPI backends
   */
  async sendQuery(
    query: string,
    bearerToken: string,
    specialist?: string
  ): Promise<AgentCoreResponse> {
    try {
      // Check if Azure FastAPI is available and preferred
      const useAzure =
        process.env.NEXT_PUBLIC_USE_AZURE_BACKEND === "true" || specialist;

      if (useAzure && specialist) {
        return await this.sendAzureQuery(query, bearerToken, specialist);
      }

      // Fallback to AWS Bedrock AgentCore
      const escapedArn = this.escapeArn(this.agentArn);
      const url = `${this.endpointUrl}/runtimes/${escapedArn}/invocations?qualifier=DEFAULT`;

      // Extract user context from JWT token
      const userContext = this.extractUserContext(bearerToken);

      const payload = {
        prompt: query,
        user_id: userContext.sub,
        user_email: userContext.email,
        tenant_id: userContext["custom:tenant_id"] || "default",
        user_role: userContext["custom:role"] || "customer",
        issued_at: userContext.iat,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
          "X-Amzn-Trace-Id": `sageinsure-trace-${Date.now()}`,
          "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": this.sessionId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `AgentCore request failed: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("AgentCore query failed:", error);
      throw error;
    }
  }

  /**
   * Send query to Azure FastAPI backend with RAG pipeline
   */
  async sendAzureQuery(
    query: string,
    bearerToken: string,
    specialist: string
  ): Promise<AgentCoreResponse> {
    try {
      const userContext = this.extractUserContext(bearerToken);

      const payload = {
        conversationId: this.sessionId,
        text: query,
        specialist: specialist,
        context: [], // Will be populated by session manager
        max_tokens: 1000,
        temperature: 0.7,
      };

      const response = await fetch(`/api/chat?agent=${specialist}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Azure FastAPI request failed: ${response.status} - ${errorData.error}`
        );
      }

      const azureResult = await response.json();

      // Transform Azure response to AgentCore format
      return {
        role: "assistant",
        content: [
          {
            text: azureResult.response,
          },
        ],
        agent_info: {
          agent_name: specialist,
          agent_type: "azure_rag_specialist",
          bedrock_agent_id: `azure-${specialist.toLowerCase()}`,
          capabilities: [
            "rag_search",
            "domain_expertise",
            "source_attribution",
          ],
        },
        security_context: {
          tenant_id: userContext["custom:tenant_id"] || "default",
          user_id: userContext.sub,
          microvm_id: `azure-${Date.now()}`,
          jwt_validated: true,
          isolation_level: "specialist_domain",
        },
        session_metadata: {
          routing_decision: `azure_${specialist}`,
          user_role: userContext["custom:role"] || "customer",
          timestamp: Date.now(),
        },
        azure_metadata: {
          sources: azureResult.sources || [],
          confidence: azureResult.confidence || 0,
          tokens_used: azureResult.tokens_used || 0,
          specialist: azureResult.specialist,
        },
      };
    } catch (error) {
      console.error("Azure FastAPI query failed:", error);
      throw error;
    }
  }

  /**
   * Send streaming query to AgentCore Runtime
   */
  async *sendStreamingQuery(
    query: string,
    bearerToken: string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const escapedArn = this.escapeArn(this.agentArn);
      const url = `${this.endpointUrl}/runtimes/${escapedArn}/invocations?qualifier=DEFAULT`;

      const userContext = this.extractUserContext(bearerToken);

      const payload = {
        prompt: query,
        user_id: userContext.sub,
        user_email: userContext.email,
        tenant_id: userContext["custom:tenant_id"] || "default",
        user_role: userContext["custom:role"] || "customer",
        issued_at: userContext.iat,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          "Content-Type": "application/json",
          "X-Amzn-Trace-Id": `sageinsure-trace-${Date.now()}`,
          "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": this.sessionId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          `Streaming request failed: ${response.status} ${response.statusText}`
        );
      }

      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data.trim()) {
                  yield data;
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error("Streaming query failed:", error);
      throw error;
    }
  }

  /**
   * Refresh JWT tokens
   */
  async refreshTokens(refreshToken: string): Promise<CognitoTokens> {
    try {
      const response = await fetch("/api/auth/cognito-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
          clientId: this.cognitoClientId,
          region: this.region,
        }),
      });

      if (!response.ok) {
        throw new Error("Token refresh failed");
      }

      const tokens = await response.json();
      this.storeTokens(tokens);

      return tokens;
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Initiate OAuth flow for external services
   */
  async initiateOAuthFlow(
    provider: "google" | "salesforce",
    bearerToken: string
  ): Promise<{ authUrl: string }> {
    const query =
      provider === "google"
        ? "I need to access my Google Drive documents for insurance claims"
        : "I need to access Salesforce CRM data for customer information";

    try {
      const response = await this.sendQuery(query, bearerToken);

      // Extract OAuth URL from response (would be provided by the agent)
      const authUrl = this.extractOAuthUrl(response, provider);

      return { authUrl };
    } catch (error) {
      console.error(`OAuth initiation failed for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get session information
   */
  getSessionInfo(): {
    sessionId: string;
    agentArn: string;
    region: string;
    endpointUrl: string;
  } {
    return {
      sessionId: this.sessionId,
      agentArn: this.agentArn,
      region: this.region,
      endpointUrl: this.endpointUrl,
    };
  }

  /**
   * Refresh session ID
   */
  refreshSession(): void {
    this.sessionId = `sageinsure-session-${Date.now()}`;
  }

  // Private helper methods

  private escapeArn(arn: string): string {
    return arn.replace(/:/g, "%3A").replace(/\//g, "%2F");
  }

  private extractUserContext(token: string): any {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.warn("Failed to decode JWT token:", error);
      return {
        sub: "anonymous",
        email: "unknown@example.com",
        iat: Math.floor(Date.now() / 1000),
      };
    }
  }

  private storeTokens(tokens: CognitoTokens): void {
    // Store tokens securely (consider using secure storage)
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "sageinsure_tokens",
        JSON.stringify({
          ...tokens,
          timestamp: Date.now(),
        })
      );
    }
  }

  private getStoredTokens(): CognitoTokens | null {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("sageinsure_tokens");
      if (stored) {
        const tokens = JSON.parse(stored);

        // Check if tokens are expired
        const now = Date.now();
        const tokenAge = now - tokens.timestamp;
        const maxAge = tokens.expiresIn * 1000; // Convert to milliseconds

        if (tokenAge < maxAge) {
          return tokens;
        } else {
          // Tokens expired, remove them
          sessionStorage.removeItem("sageinsure_tokens");
        }
      }
    }
    return null;
  }

  private extractOAuthUrl(
    response: AgentCoreResponse,
    provider: string
  ): string {
    // Extract OAuth URL from agent response
    // This would be implemented based on how the agent returns OAuth URLs
    const content = response.content[0]?.text || "";

    // Look for URL patterns in the response
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlPattern);

    if (urls && urls.length > 0) {
      return urls[0]; // Return first URL found
    }

    // Fallback URLs for demo
    if (provider === "google") {
      return "https://accounts.google.com/oauth/authorize?client_id=demo&scope=drive.readonly";
    } else {
      return "https://login.salesforce.com/services/oauth2/authorize?client_id=demo&scope=api";
    }
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): boolean {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000);

      return decoded.exp > now;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current valid tokens
   */
  async getCurrentTokens(): Promise<CognitoTokens | null> {
    const stored = this.getStoredTokens();

    if (stored && this.validateToken(stored.accessToken)) {
      return stored;
    }

    // Try to refresh if we have a refresh token
    if (stored?.refreshToken) {
      try {
        return await this.refreshTokens(stored.refreshToken);
      } catch (error) {
        console.warn("Token refresh failed:", error);
      }
    }

    return null;
  }
}

export {
  SageInsureAgentCoreClient,
  type AgentCoreResponse,
  type CognitoTokens,
};
