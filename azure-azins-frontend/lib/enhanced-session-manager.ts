import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

interface SessionMessage {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: string;
  specialist: string;
  agent?: string;
  attachments?: any[];
  metadata?: Record<string, any>;
}

interface AgentCoreState {
  currentContext: any;
  memoryBank: any[];
  activeAgents: string[];
  processingState: any;
}

interface SessionData {
  conversationId: string;
  userId: string;
  createdAt: string;
  lastActivity: string;
  activeSpecialist: string;
  messages: SessionMessage[];
  specialistContexts: Record<
    string,
    {
      lastMessage?: SessionMessage;
      messageCount: number;
      lastActivity: string;
      agentCoreState?: AgentCoreState;
      memoryContext?: any;
    }
  >;
  agentCoreRuntime?: AgentCoreState;
  persistentMemory?: any;
}

class EnhancedSessionManager {
  private static instance: EnhancedSessionManager;
  private sessionKey = "sageinsure_enhanced_session";
  private currentSession: SessionData | null = null;
  private dynamoClient: DynamoDBClient;
  private s3Client: S3Client;
  private tableName = "SageInsure-Sessions";
  private bucketName = "sageinsure-chat-data";

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    });
    this.s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1",
    });
  }

  static getInstance(): EnhancedSessionManager {
    if (!EnhancedSessionManager.instance) {
      EnhancedSessionManager.instance = new EnhancedSessionManager();
    }
    return EnhancedSessionManager.instance;
  }

  // Create a new session with AgentCore integration
  async createSession(userId: string): Promise<SessionData> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const session: SessionData = {
      conversationId,
      userId,
      createdAt: now,
      lastActivity: now,
      activeSpecialist: "POLICY_ASSISTANT",
      messages: [],
      specialistContexts: {},
      agentCoreRuntime: {
        currentContext: {},
        memoryBank: [],
        activeAgents: [],
        processingState: {},
      },
      persistentMemory: {},
    };

    this.currentSession = session;
    await this.saveSession();
    return session;
  }

  // Load session with DynamoDB and S3 integration
  async loadSession(userId: string): Promise<SessionData | null> {
    try {
      // Check if we're on the client side
      if (typeof window === "undefined") return null;

      // First try localStorage for quick access
      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const session = JSON.parse(stored) as SessionData;
        if (session.userId === userId) {
          this.currentSession = session;

          // Sync with DynamoDB in background
          this.syncSessionFromDynamoDB(userId, session.conversationId);

          return session;
        }
      }

      // Load from DynamoDB
      return await this.loadSessionFromDynamoDB(userId);
    } catch (error) {
      console.error("Failed to load session:", error);
    }
    return null;
  }

  // Save session to localStorage, DynamoDB, and S3
  async saveSession(): Promise<void> {
    if (!this.currentSession) return;

    try {
      // Save to localStorage for quick access
      if (typeof window !== "undefined") {
        localStorage.setItem(
          this.sessionKey,
          JSON.stringify(this.currentSession)
        );
      }

      // Save to DynamoDB
      await this.saveSessionToDynamoDB();

      // Save large data (messages, memory) to S3
      await this.saveSessionDataToS3();
    } catch (error) {
      console.error("Failed to save session:", error);
    }
  }

  // Add message with AgentCore state persistence
  async addMessage(
    message: Omit<SessionMessage, "id">,
    specialist: string,
    agentCoreState?: AgentCoreState
  ): Promise<SessionMessage> {
    const session = this.getCurrentSession();
    if (!session) throw new Error("No active session");

    const fullMessage: SessionMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      specialist,
    };

    session.messages.push(fullMessage);
    session.lastActivity = new Date().toISOString();
    session.activeSpecialist = specialist;

    // Update specialist context with AgentCore state
    if (!session.specialistContexts[specialist]) {
      session.specialistContexts[specialist] = {
        messageCount: 0,
        lastActivity: new Date().toISOString(),
      };
    }

    const context = session.specialistContexts[specialist];
    context.lastMessage = fullMessage;
    context.messageCount += 1;
    context.lastActivity = new Date().toISOString();

    if (agentCoreState) {
      context.agentCoreState = agentCoreState;
      session.agentCoreRuntime = agentCoreState;
    }

    await this.saveSession();
    return fullMessage;
  }

  // Get current session or create new one
  getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  // Get messages for a specific specialist with AgentCore context
  getSpecialistMessages(specialist: string): SessionMessage[] {
    const session = this.getCurrentSession();
    if (!session) return [];
    return session.messages.filter((msg) => msg.specialist === specialist);
  }

  // Get AgentCore state for specialist
  getAgentCoreState(specialist: string): AgentCoreState | null {
    const session = this.getCurrentSession();
    if (!session) return null;
    return session.specialistContexts[specialist]?.agentCoreState || null;
  }

  // Update AgentCore runtime state
  async updateAgentCoreState(
    specialist: string,
    state: AgentCoreState
  ): Promise<void> {
    const session = this.getCurrentSession();
    if (!session) return;

    if (!session.specialistContexts[specialist]) {
      session.specialistContexts[specialist] = {
        messageCount: 0,
        lastActivity: new Date().toISOString(),
      };
    }

    session.specialistContexts[specialist].agentCoreState = state;
    session.agentCoreRuntime = state;
    session.lastActivity = new Date().toISOString();

    await this.saveSession();
  }

  // Clear session
  async clearSession(): Promise<void> {
    this.currentSession = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.sessionKey);
    }
  }

  // Private methods for DynamoDB operations
  private async loadSessionFromDynamoDB(
    userId: string
  ): Promise<SessionData | null> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": { S: userId },
        },
        ScanIndexForward: false,
        Limit: 1,
      });

      const response = await this.dynamoClient.send(command);

      if (response.Items && response.Items.length > 0) {
        const item = response.Items[0];

        // Load detailed data from S3
        const sessionData = await this.loadSessionDataFromS3(
          item.userId.S!,
          item.conversationId.S!
        );

        const session: SessionData = {
          conversationId: item.conversationId.S!,
          userId: item.userId.S!,
          createdAt: item.createdAt.S!,
          lastActivity: item.lastActivity.S!,
          activeSpecialist: item.activeSpecialist.S!,
          messages: sessionData?.messages || [],
          specialistContexts: sessionData?.specialistContexts || {},
          agentCoreRuntime: sessionData?.agentCoreRuntime || {},
          persistentMemory: sessionData?.persistentMemory || {},
        };

        this.currentSession = session;
        this.saveSessionToLocalStorage();
        return session;
      }
    } catch (error) {
      console.error("Failed to load session from DynamoDB:", error);
    }
    return null;
  }

  private async saveSessionToDynamoDB(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: {
          userId: { S: this.currentSession.userId },
          conversationId: { S: this.currentSession.conversationId },
          createdAt: { S: this.currentSession.createdAt },
          lastActivity: { S: this.currentSession.lastActivity },
          activeSpecialist: { S: this.currentSession.activeSpecialist },
          messageCount: { N: this.currentSession.messages.length.toString() },
          ttl: {
            N: Math.floor(
              (Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000
            ).toString(),
          }, // 30 days TTL
        },
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error("Failed to save session to DynamoDB:", error);
    }
  }

  private async saveSessionDataToS3(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const sessionData = {
        messages: this.currentSession.messages,
        specialistContexts: this.currentSession.specialistContexts,
        agentCoreRuntime: this.currentSession.agentCoreRuntime,
        persistentMemory: this.currentSession.persistentMemory,
      };

      const key = `sessions/${this.currentSession.userId}/${this.currentSession.conversationId}/data.json`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: JSON.stringify(sessionData),
        ContentType: "application/json",
        ServerSideEncryption: "AES256",
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error("Failed to save session data to S3:", error);
    }
  }

  private async loadSessionDataFromS3(
    userId: string,
    conversationId: string
  ): Promise<any> {
    try {
      const key = `sessions/${userId}/${conversationId}/data.json`;

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (response.Body) {
        const data = await response.Body.transformToString();
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Failed to load session data from S3:", error);
    }
    return null;
  }

  private saveSessionToLocalStorage(): void {
    if (this.currentSession && typeof window !== "undefined") {
      localStorage.setItem(
        this.sessionKey,
        JSON.stringify(this.currentSession)
      );
    }
  }

  private async syncSessionFromDynamoDB(
    userId: string,
    conversationId: string
  ): Promise<void> {
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          userId: { S: userId },
          conversationId: { S: conversationId },
        },
      });

      const response = await this.dynamoClient.send(command);

      if (response.Item) {
        const sessionData = await this.loadSessionDataFromS3(
          userId,
          conversationId
        );

        const session: SessionData = {
          conversationId: response.Item.conversationId.S!,
          userId: response.Item.userId.S!,
          createdAt: response.Item.createdAt.S!,
          lastActivity: response.Item.lastActivity.S!,
          activeSpecialist: response.Item.activeSpecialist.S!,
          messages: sessionData?.messages || [],
          specialistContexts: sessionData?.specialistContexts || {},
          agentCoreRuntime: sessionData?.agentCoreRuntime || {},
          persistentMemory: sessionData?.persistentMemory || {},
        };

        // Update current session if it's newer
        if (
          this.currentSession &&
          new Date(session.lastActivity) >
            new Date(this.currentSession.lastActivity)
        ) {
          this.currentSession = session;
          this.saveSessionToLocalStorage();
        }
      }
    } catch (error) {
      console.error("Failed to sync session from DynamoDB:", error);
    }
  }
}

export default EnhancedSessionManager;
