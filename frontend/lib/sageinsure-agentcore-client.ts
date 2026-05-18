/**
 * SageInsure private workflow client.
 * Keeps specialist chat calls aligned with the greenfield dev01 backend contract.
 */

interface AgentCoreResponse {
  role: "assistant";
  content: Array<{
    text: string;
  }>;
  agent_info: {
    agent_name: string;
    agent_type: string;
    backend_workflow_id: string;
    capabilities: string[];
  };
  security_context: {
    tenant_id: string;
    user_id: string;
    workspace_id: string;
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

interface WorkflowTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
}

class SageInsureAgentCoreClient {
  private endpointUrl: string;
  private sessionId: string;

  constructor() {
    this.endpointUrl =
      process.env.NEXT_PUBLIC_FASTAPI_ENDPOINT ||
      process.env.AGENTCORE_BASE_URL ||
      "http://127.0.0.1:8000";
    this.sessionId = `sageinsure-session-${Date.now()}`;
  }

  async authenticateUser(
    username: string,
    password: string,
  ): Promise<WorkflowTokens> {
    const response = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Authentication failed");
    }

    const tokens = await response.json();
    this.storeTokens(tokens);
    return tokens;
  }

  async sendQuery(
    query: string,
    bearerToken: string,
    specialist = "POLICY_ASSISTANT",
  ): Promise<AgentCoreResponse> {
    return this.sendAzureQuery(query, bearerToken, specialist);
  }

  async sendAzureQuery(
    query: string,
    bearerToken: string,
    specialist: string,
  ): Promise<AgentCoreResponse> {
    const userContext = this.extractUserContext(bearerToken);

    const response = await fetch(`/api/azure-chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: this.sessionId,
        text: query,
        specialist,
        brokerId: window.localStorage.getItem("sageinfra.activeBrokerId") || undefined,
        context: [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Private workflow request failed: ${response.status} - ${errorData.error || response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      role: "assistant",
      content: [{ text: result.answer || result.response || "" }],
      agent_info: {
        agent_name: result.agent || specialist,
        agent_type: "private_sagesure_specialist",
        backend_workflow_id: `dev01-${specialist.toLowerCase()}`,
        capabilities: [
          "workflow_orchestration",
          "domain_expertise",
          "source_attribution",
        ],
      },
      security_context: {
        tenant_id: userContext["custom:tenant_id"] || "default",
        user_id: userContext.sub,
        workspace_id: result.handled_by || "dev01-private-workflow",
        jwt_validated: Boolean(bearerToken),
        isolation_level: "tenant_scoped_workflow",
      },
      session_metadata: {
        routing_decision: `private_${specialist}`,
        user_role: userContext["custom:role"] || "customer",
        timestamp: Date.now(),
      },
      azure_metadata: {
        sources: result.sources || result.citations || [],
        confidence: result.confidence || 0,
        tokens_used: result.tokens_used || 0,
        specialist: result.specialist || specialist,
      },
    };
  }

  async *sendStreamingQuery(
    query: string,
    bearerToken: string,
  ): AsyncGenerator<string, void, unknown> {
    const response = await this.sendQuery(query, bearerToken);
    yield response.content[0]?.text || "";
  }

  async refreshTokens(refreshToken: string): Promise<WorkflowTokens> {
    const response = await fetch("/api/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    this.storeTokens(tokens);
    return tokens;
  }

  async initiateOAuthFlow(
    provider: "google" | "salesforce",
    bearerToken: string,
  ): Promise<{ authUrl: string }> {
    const query =
      provider === "google"
        ? "I need to access customer documents for insurance claims"
        : "I need to access CRM data for customer information";

    const response = await this.sendQuery(query, bearerToken);
    return { authUrl: this.extractOAuthUrl(response, provider) };
  }

  getSessionInfo(): {
    sessionId: string;
    endpointUrl: string;
  } {
    return {
      sessionId: this.sessionId,
      endpointUrl: this.endpointUrl,
    };
  }

  refreshSession(): void {
    this.sessionId = `sageinsure-session-${Date.now()}`;
  }

  private extractUserContext(token: string): any {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch {
      return {
        sub: "anonymous",
        email: "unknown@example.com",
        iat: Math.floor(Date.now() / 1000),
      };
    }
  }

  private storeTokens(tokens: WorkflowTokens): void {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "sageinsure_tokens",
        JSON.stringify({ ...tokens, timestamp: Date.now() }),
      );
    }
  }

  private getStoredTokens(): WorkflowTokens | null {
    if (typeof window === "undefined") return null;

    const stored = sessionStorage.getItem("sageinsure_tokens");
    if (!stored) return null;

    const tokens = JSON.parse(stored);
    const tokenAge = Date.now() - tokens.timestamp;
    const maxAge = tokens.expiresIn * 1000;

    if (tokenAge < maxAge) return tokens;

    sessionStorage.removeItem("sageinsure_tokens");
    return null;
  }

  private extractOAuthUrl(
    response: AgentCoreResponse,
    provider: string,
  ): string {
    const content = response.content[0]?.text || "";
    const urls = content.match(/https?:\/\/[^\s]+/g);

    if (urls && urls.length > 0) return urls[0];

    return provider === "google"
      ? "/api/oauth/google/start"
      : "/api/oauth/salesforce/start";
  }

  validateToken(token: string): boolean {
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch {
      return false;
    }
  }

  async getCurrentTokens(): Promise<WorkflowTokens | null> {
    const stored = this.getStoredTokens();

    if (stored && this.validateToken(stored.accessToken)) {
      return stored;
    }

    if (stored?.refreshToken) {
      try {
        return await this.refreshTokens(stored.refreshToken);
      } catch {
        return null;
      }
    }

    return null;
  }
}

export {
  SageInsureAgentCoreClient,
  type AgentCoreResponse,
  type WorkflowTokens,
};
