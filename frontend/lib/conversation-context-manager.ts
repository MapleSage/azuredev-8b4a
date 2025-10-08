/**
 * Conversation Context Manager
 * Manages conversation memory, context building, and session persistence
 */

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  timestamp: Date;
  specialist?: string;
  sources?: Array<{
    title: string;
    content: string;
    score: number;
    metadata: any;
  }>;
  confidence?: number;
  tokens_used?: number;
}

interface ConversationContext {
  conversationId: string;
  userId: string;
  sessionId: string;
  messages: Message[];
  activeSpecialist: string;
  specialistHistory: Record<string, Message[]>;
  userProfile: {
    preferences: Record<string, any>;
    accessLevel: string;
    tenantId: string;
  };
  sessionMetadata: {
    startTime: Date;
    lastActivity: Date;
    totalMessages: number;
    specialistSwitches: number;
  };
}

interface ContextSummary {
  recentMessages: Message[];
  keyTopics: string[];
  userIntent: string;
  relevantHistory: Message[];
  contextTokens: number;
}

class ConversationContextManager {
  private static instance: ConversationContextManager;
  private contexts: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_MESSAGES = 10;
  private readonly MAX_CONTEXT_TOKENS = 3000;
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    // Load persisted contexts on initialization
    this.loadPersistedContexts();

    // Set up periodic cleanup
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Every 5 minutes
  }

  static getInstance(): ConversationContextManager {
    if (!ConversationContextManager.instance) {
      ConversationContextManager.instance = new ConversationContextManager();
    }
    return ConversationContextManager.instance;
  }

  /**
   * Initialize or get conversation context
   */
  initializeContext(
    conversationId: string,
    userId: string,
    sessionId: string,
    userProfile: ConversationContext["userProfile"]
  ): ConversationContext {
    let context = this.contexts.get(conversationId);

    if (!context) {
      context = {
        conversationId,
        userId,
        sessionId,
        messages: [],
        activeSpecialist: "POLICY_ASSISTANT",
        specialistHistory: {},
        userProfile,
        sessionMetadata: {
          startTime: new Date(),
          lastActivity: new Date(),
          totalMessages: 0,
          specialistSwitches: 0,
        },
      };

      this.contexts.set(conversationId, context);
      this.persistContext(context);
    } else {
      // Update session metadata
      context.sessionMetadata.lastActivity = new Date();
      context.userProfile = { ...context.userProfile, ...userProfile };
    }

    return context;
  }

  /**
   * Add message to conversation context
   */
  addMessage(conversationId: string, message: Message): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    // Add to main message history
    context.messages.push(message);

    // Add to specialist-specific history
    const specialist = message.specialist || context.activeSpecialist;
    if (!context.specialistHistory[specialist]) {
      context.specialistHistory[specialist] = [];
    }
    context.specialistHistory[specialist].push(message);

    // Update metadata
    context.sessionMetadata.lastActivity = new Date();
    context.sessionMetadata.totalMessages++;

    // Persist changes
    this.persistContext(context);
  }

  /**
   * Switch active specialist and track the change
   */
  switchSpecialist(conversationId: string, newSpecialist: string): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    if (context.activeSpecialist !== newSpecialist) {
      context.activeSpecialist = newSpecialist;
      context.sessionMetadata.specialistSwitches++;
      context.sessionMetadata.lastActivity = new Date();

      this.persistContext(context);
    }
  }

  /**
   * Build context for specialist query
   */
  buildContextForSpecialist(
    conversationId: string,
    specialist: string,
    currentQuery: string
  ): ContextSummary {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    // Get recent messages from current specialist
    const specialistMessages = context.specialistHistory[specialist] || [];
    const recentSpecialistMessages = specialistMessages.slice(-5);

    // Get recent messages from overall conversation
    const recentOverallMessages = context.messages.slice(
      -this.MAX_CONTEXT_MESSAGES
    );

    // Extract key topics from conversation history
    const keyTopics = this.extractKeyTopics(recentOverallMessages);

    // Detect user intent from current query and recent messages
    const userIntent = this.detectUserIntent(
      currentQuery,
      recentSpecialistMessages
    );

    // Find relevant historical messages
    const relevantHistory = this.findRelevantHistory(
      context.messages,
      currentQuery,
      specialist
    );

    // Combine and prioritize messages for context
    const contextMessages = this.prioritizeContextMessages(
      recentSpecialistMessages,
      recentOverallMessages,
      relevantHistory
    );

    // Estimate token count
    const contextTokens = this.estimateTokenCount(contextMessages);

    return {
      recentMessages: contextMessages,
      keyTopics,
      userIntent,
      relevantHistory,
      contextTokens,
    };
  }

  /**
   * Get conversation summary for specialist
   */
  getConversationSummary(
    conversationId: string,
    specialist?: string
  ): {
    totalMessages: number;
    specialistMessages: number;
    keyTopics: string[];
    lastActivity: Date;
    sessionDuration: number;
  } {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    const specialistMessages = specialist
      ? (context.specialistHistory[specialist] || []).length
      : 0;

    const sessionDuration =
      Date.now() - context.sessionMetadata.startTime.getTime();
    const keyTopics = this.extractKeyTopics(context.messages.slice(-20));

    return {
      totalMessages: context.sessionMetadata.totalMessages,
      specialistMessages,
      keyTopics,
      lastActivity: context.sessionMetadata.lastActivity,
      sessionDuration,
    };
  }

  /**
   * Get user-specific document access context
   */
  getUserDocumentContext(conversationId: string): {
    tenantId: string;
    userId: string;
    accessLevel: string;
    preferences: Record<string, any>;
  } {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    return {
      tenantId: context.userProfile.tenantId,
      userId: context.userId,
      accessLevel: context.userProfile.accessLevel,
      preferences: context.userProfile.preferences,
    };
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(
    conversationId: string,
    preferences: Record<string, any>
  ): void {
    const context = this.contexts.get(conversationId);
    if (!context) {
      throw new Error(`Context not found for conversation: ${conversationId}`);
    }

    context.userProfile.preferences = {
      ...context.userProfile.preferences,
      ...preferences,
    };

    this.persistContext(context);
  }

  /**
   * Clear conversation context
   */
  clearContext(conversationId: string): void {
    this.contexts.delete(conversationId);
    this.removePersistedContext(conversationId);
  }

  /**
   * Get all active conversations for user
   */
  getUserConversations(userId: string): ConversationContext[] {
    return Array.from(this.contexts.values()).filter(
      (context) => context.userId === userId
    );
  }

  // Private helper methods

  private extractKeyTopics(messages: Message[]): string[] {
    const topicPatterns = {
      claims: /claim|damage|accident|incident|settlement/gi,
      policy: /policy|coverage|premium|deductible|endorsement/gi,
      underwriting: /risk|underwriting|application|assessment/gi,
      cyber: /cyber|security|breach|hack|malware/gi,
      research: /research|study|clinical|trial|drug/gi,
      fnol: /fnol|first notice|report|emergency/gi,
      lifecycle: /workflow|process|status|tracking/gi,
    };

    const topicCounts: Record<string, number> = {};
    const allText = messages.map((m) => m.content).join(" ");

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      const matches = allText.match(pattern);
      topicCounts[topic] = matches ? matches.length : 0;
    }

    return Object.entries(topicCounts)
      .filter(([_, count]) => count > 0)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([topic, _]) => topic);
  }

  private detectUserIntent(query: string, recentMessages: Message[]): string {
    const intentPatterns = {
      information_seeking: /what|how|when|where|why|explain|tell me/gi,
      problem_solving: /help|issue|problem|error|fix|resolve/gi,
      transaction: /file|submit|process|create|update|change/gi,
      status_inquiry: /status|check|track|progress|update/gi,
      comparison: /compare|versus|vs|difference|better|best/gi,
    };

    const queryText =
      query +
      " " +
      recentMessages
        .slice(-3)
        .map((m) => m.content)
        .join(" ");

    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(queryText)) {
        return intent;
      }
    }

    return "general_inquiry";
  }

  private findRelevantHistory(
    messages: Message[],
    currentQuery: string,
    specialist: string
  ): Message[] {
    const queryWords = currentQuery.toLowerCase().split(/\s+/);
    const relevantMessages: Array<{ message: Message; score: number }> = [];

    for (const message of messages) {
      if (message.specialist === specialist || !message.specialist) {
        const content = message.content.toLowerCase();
        let score = 0;

        // Score based on word overlap
        for (const word of queryWords) {
          if (word.length > 3 && content.includes(word)) {
            score += 1;
          }
        }

        // Boost score for recent messages
        const age = Date.now() - message.timestamp.getTime();
        const ageBoost = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
        score += ageBoost;

        if (score > 0.5) {
          relevantMessages.push({ message, score });
        }
      }
    }

    return relevantMessages
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.message);
  }

  private prioritizeContextMessages(
    specialistMessages: Message[],
    overallMessages: Message[],
    relevantHistory: Message[]
  ): Message[] {
    const messageMap = new Map<string, Message>();

    // Add specialist messages (highest priority)
    specialistMessages.forEach((msg) => messageMap.set(msg.id, msg));

    // Add relevant history (medium priority)
    relevantHistory.forEach((msg) => messageMap.set(msg.id, msg));

    // Add recent overall messages (lower priority)
    overallMessages.slice(-5).forEach((msg) => messageMap.set(msg.id, msg));

    // Sort by timestamp and limit
    return Array.from(messageMap.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-this.MAX_CONTEXT_MESSAGES);
  }

  private estimateTokenCount(messages: Message[]): number {
    const totalChars = messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0
    );
    return Math.ceil(totalChars / 4); // Rough estimate: 4 chars per token
  }

  private persistContext(context: ConversationContext): void {
    if (typeof window !== "undefined") {
      try {
        const key = `sage_context_${context.conversationId}`;
        const serialized = JSON.stringify({
          ...context,
          sessionMetadata: {
            ...context.sessionMetadata,
            startTime: context.sessionMetadata.startTime.toISOString(),
            lastActivity: context.sessionMetadata.lastActivity.toISOString(),
          },
          messages: context.messages.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp.toISOString(),
          })),
        });

        sessionStorage.setItem(key, serialized);
      } catch (error) {
        console.warn("Failed to persist context:", error);
      }
    }
  }

  private loadPersistedContexts(): void {
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("sage_context_")) {
            const serialized = sessionStorage.getItem(key);
            if (serialized) {
              const data = JSON.parse(serialized);

              // Deserialize dates
              data.sessionMetadata.startTime = new Date(
                data.sessionMetadata.startTime
              );
              data.sessionMetadata.lastActivity = new Date(
                data.sessionMetadata.lastActivity
              );
              data.messages = data.messages.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));

              this.contexts.set(data.conversationId, data);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to load persisted contexts:", error);
      }
    }
  }

  private removePersistedContext(conversationId: string): void {
    if (typeof window !== "undefined") {
      const key = `sage_context_${conversationId}`;
      sessionStorage.removeItem(key);
    }
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredContexts: string[] = [];

    this.contexts.forEach((context, conversationId) => {
      const lastActivity = context.sessionMetadata.lastActivity.getTime();
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        expiredContexts.push(conversationId);
      }
    });

    expiredContexts.forEach((conversationId) => {
      this.clearContext(conversationId);
    });

    if (expiredContexts.length > 0) {
      console.log(
        `🧹 Cleaned up ${expiredContexts.length} expired conversation contexts`
      );
    }
  }
}

export default ConversationContextManager;
export type { ConversationContext, ContextSummary, Message };
