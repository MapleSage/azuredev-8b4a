// Mock session manager for Azure frontend
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

interface SessionData {
  conversationId: string;
  userId?: string;
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
      agentCoreState?: any;
      memoryContext?: any;
    }
  >;
  agentCoreRuntime?: any;
  persistentMemory?: any;
}

class SessionManager {
  private static instance: SessionManager;
  private sessionKey = "azins_session";
  private currentSession: SessionData | null = null;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  createSession(userId?: string): SessionData {
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
    };

    this.currentSession = session;
    this.saveSession();
    return session;
  }

  loadSession(): SessionData | null {
    try {
      if (typeof window === "undefined") return null;

      const stored = localStorage.getItem(this.sessionKey);
      if (stored) {
        const session = JSON.parse(stored) as SessionData;
        this.currentSession = session;
        return session;
      }
    } catch (error) {
      console.error("Failed to load session:", error);
    }
    return null;
  }

  saveSession(): void {
    if (this.currentSession) {
      try {
        if (typeof window === "undefined") return;

        localStorage.setItem(
          this.sessionKey,
          JSON.stringify(this.currentSession)
        );
      } catch (error) {
        console.error("Failed to save session:", error);
      }
    }
  }

  getCurrentSession(): SessionData {
    if (!this.currentSession) {
      const loaded = this.loadSession();
      if (loaded) {
        this.currentSession = loaded;
      } else {
        this.createSession();
      }
    }
    return this.currentSession!;
  }

  addMessage(
    message: Omit<SessionMessage, "id">,
    specialist: string
  ): SessionMessage {
    const session = this.getCurrentSession();
    const fullMessage: SessionMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      specialist,
    };

    session.messages.push(fullMessage);
    session.lastActivity = new Date().toISOString();
    session.activeSpecialist = specialist;

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

    this.saveSession();
    return fullMessage;
  }

  getSpecialistMessages(specialist: string): SessionMessage[] {
    const session = this.getCurrentSession();
    return session.messages.filter((msg) => msg.specialist === specialist);
  }

  getSpecialistContext(
    specialist: string,
    maxMessages: number = 10
  ): SessionMessage[] {
    const messages = this.getSpecialistMessages(specialist);
    return messages.slice(-maxMessages);
  }

  getCrossSpecialistContext(
    currentSpecialist: string,
    maxMessages: number = 5
  ): SessionMessage[] {
    const session = this.getCurrentSession();
    const otherMessages = session.messages
      .filter((msg) => msg.specialist !== currentSpecialist)
      .slice(-maxMessages);
    return otherMessages;
  }

  setActiveSpecialist(specialist: string): void {
    const session = this.getCurrentSession();
    session.activeSpecialist = specialist;
    session.lastActivity = new Date().toISOString();
    this.saveSession();
  }

  getSessionStats(): {
    totalMessages: number;
    specialistBreakdown: Record<string, number>;
    sessionDuration: number;
    lastActivity: string;
  } {
    const session = this.getCurrentSession();
    const specialistBreakdown: Record<string, number> = {};

    session.messages.forEach((msg) => {
      specialistBreakdown[msg.specialist] =
        (specialistBreakdown[msg.specialist] || 0) + 1;
    });

    const sessionDuration = Date.now() - new Date(session.createdAt).getTime();

    return {
      totalMessages: session.messages.length,
      specialistBreakdown,
      sessionDuration,
      lastActivity: session.lastActivity,
    };
  }

  clearSession(): void {
    this.currentSession = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.sessionKey);
    }
  }

  isSessionExpired(maxAgeHours: number = 24): boolean {
    const session = this.getCurrentSession();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    const age = Date.now() - new Date(session.lastActivity).getTime();
    return age > maxAge;
  }
}

export default SessionManager;