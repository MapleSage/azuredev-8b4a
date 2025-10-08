/**
 * Session Persistence Manager
 * Handles cross-browser session persistence and restoration
 */

import ConversationContextManager, {
  ConversationContext,
} from "./conversation-context-manager";

interface SessionData {
  sessionId: string;
  userId: string;
  activeConversations: string[];
  userPreferences: Record<string, any>;
  lastActivity: string;
  browserFingerprint: string;
}

interface PersistenceOptions {
  useLocalStorage: boolean;
  useIndexedDB: boolean;
  encryptData: boolean;
  maxSessions: number;
  sessionTTL: number; // Time to live in milliseconds
}

class SessionPersistenceManager {
  private static instance: SessionPersistenceManager;
  private contextManager: ConversationContextManager;
  private options: PersistenceOptions;
  private dbName = "SageInsureDB";
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.contextManager = ConversationContextManager.getInstance();
    this.options = {
      useLocalStorage: true,
      useIndexedDB: true,
      encryptData: false, // Set to true in production
      maxSessions: 10,
      sessionTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    this.initializeIndexedDB();
  }

  static getInstance(): SessionPersistenceManager {
    if (!SessionPersistenceManager.instance) {
      SessionPersistenceManager.instance = new SessionPersistenceManager();
    }
    return SessionPersistenceManager.instance;
  }

  /**
   * Initialize IndexedDB for persistent storage
   */
  private async initializeIndexedDB(): Promise<void> {
    if (!this.options.useIndexedDB || typeof window === "undefined") {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn("IndexedDB initialization failed:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log("✅ IndexedDB initialized successfully");
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains("sessions")) {
          const sessionStore = db.createObjectStore("sessions", {
            keyPath: "sessionId",
          });
          sessionStore.createIndex("userId", "userId", { unique: false });
          sessionStore.createIndex("lastActivity", "lastActivity", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("conversations")) {
          const conversationStore = db.createObjectStore("conversations", {
            keyPath: "conversationId",
          });
          conversationStore.createIndex("userId", "userId", { unique: false });
          conversationStore.createIndex("sessionId", "sessionId", {
            unique: false,
          });
        }

        if (!db.objectStoreNames.contains("userPreferences")) {
          db.createObjectStore("userPreferences", { keyPath: "userId" });
        }
      };
    });
  }

  /**
   * Save session data
   */
  async saveSession(sessionData: SessionData): Promise<void> {
    const data = {
      ...sessionData,
      lastActivity: new Date().toISOString(),
      browserFingerprint: await this.getBrowserFingerprint(),
    };

    // Save to localStorage
    if (this.options.useLocalStorage) {
      try {
        const key = `sage_session_${sessionData.sessionId}`;
        const serialized = this.options.encryptData
          ? this.encryptData(JSON.stringify(data))
          : JSON.stringify(data);

        localStorage.setItem(key, serialized);
      } catch (error) {
        console.warn("Failed to save session to localStorage:", error);
      }
    }

    // Save to IndexedDB
    if (this.options.useIndexedDB && this.db) {
      try {
        await this.saveToIndexedDB("sessions", data);
      } catch (error) {
        console.warn("Failed to save session to IndexedDB:", error);
      }
    }
  }

  /**
   * Load session data
   */
  async loadSession(sessionId: string): Promise<SessionData | null> {
    // Try IndexedDB first
    if (this.options.useIndexedDB && this.db) {
      try {
        const data = await this.loadFromIndexedDB("sessions", sessionId);
        if (data && this.isSessionValid(data)) {
          return data;
        }
      } catch (error) {
        console.warn("Failed to load session from IndexedDB:", error);
      }
    }

    // Fallback to localStorage
    if (this.options.useLocalStorage) {
      try {
        const key = `sage_session_${sessionId}`;
        const serialized = localStorage.getItem(key);

        if (serialized) {
          const data = this.options.encryptData
            ? JSON.parse(this.decryptData(serialized))
            : JSON.parse(serialized);

          if (this.isSessionValid(data)) {
            return data;
          }
        }
      } catch (error) {
        console.warn("Failed to load session from localStorage:", error);
      }
    }

    return null;
  }

  /**
   * Save conversation context
   */
  async saveConversationContext(context: ConversationContext): Promise<void> {
    const serializedContext = {
      ...context,
      messages: context.messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
      sessionMetadata: {
        ...context.sessionMetadata,
        startTime: context.sessionMetadata.startTime.toISOString(),
        lastActivity: context.sessionMetadata.lastActivity.toISOString(),
      },
    };

    // Save to IndexedDB
    if (this.options.useIndexedDB && this.db) {
      try {
        await this.saveToIndexedDB("conversations", serializedContext);
      } catch (error) {
        console.warn("Failed to save conversation to IndexedDB:", error);
      }
    }

    // Also save to sessionStorage for quick access
    try {
      const key = `sage_conversation_${context.conversationId}`;
      sessionStorage.setItem(key, JSON.stringify(serializedContext));
    } catch (error) {
      console.warn("Failed to save conversation to sessionStorage:", error);
    }
  }

  /**
   * Load conversation context
   */
  async loadConversationContext(
    conversationId: string
  ): Promise<ConversationContext | null> {
    // Try sessionStorage first (fastest)
    try {
      const key = `sage_conversation_${conversationId}`;
      const serialized = sessionStorage.getItem(key);

      if (serialized) {
        const data = JSON.parse(serialized);
        return this.deserializeConversationContext(data);
      }
    } catch (error) {
      console.warn("Failed to load conversation from sessionStorage:", error);
    }

    // Try IndexedDB
    if (this.options.useIndexedDB && this.db) {
      try {
        const data = await this.loadFromIndexedDB(
          "conversations",
          conversationId
        );
        if (data) {
          const context = this.deserializeConversationContext(data);

          // Cache in sessionStorage for next time
          const key = `sage_conversation_${conversationId}`;
          sessionStorage.setItem(key, JSON.stringify(data));

          return context;
        }
      } catch (error) {
        console.warn("Failed to load conversation from IndexedDB:", error);
      }
    }

    return null;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessions: SessionData[] = [];

    if (this.options.useIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(["sessions"], "readonly");
        const store = transaction.objectStore("sessions");
        const index = store.index("userId");
        const request = index.getAll(userId);

        const results = await new Promise<SessionData[]>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        sessions.push(
          ...results.filter((session) => this.isSessionValid(session))
        );
      } catch (error) {
        console.warn("Failed to get user sessions from IndexedDB:", error);
      }
    }

    return sessions.sort(
      (a, b) =>
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Clean localStorage
    if (this.options.useLocalStorage && typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("sage_session_")) {
          try {
            const serialized = localStorage.getItem(key);
            if (serialized) {
              const data = this.options.encryptData
                ? JSON.parse(this.decryptData(serialized))
                : JSON.parse(serialized);

              if (!this.isSessionValid(data)) {
                expiredKeys.push(key);
              }
            }
          } catch (error) {
            expiredKeys.push(key);
          }
        }
      }

      expiredKeys.forEach((key) => localStorage.removeItem(key));
    }

    // Clean IndexedDB
    if (this.options.useIndexedDB && this.db) {
      try {
        const transaction = this.db.transaction(
          ["sessions", "conversations"],
          "readwrite"
        );
        const sessionStore = transaction.objectStore("sessions");
        const conversationStore = transaction.objectStore("conversations");

        // Get all sessions
        const sessionRequest = sessionStore.getAll();
        sessionRequest.onsuccess = () => {
          const sessions = sessionRequest.result;

          sessions.forEach((session) => {
            if (!this.isSessionValid(session)) {
              sessionStore.delete(session.sessionId);

              // Also delete associated conversations
              session.activeConversations?.forEach((conversationId: string) => {
                conversationStore.delete(conversationId);
              });
            }
          });
        };
      } catch (error) {
        console.warn("Failed to cleanup IndexedDB:", error);
      }
    }

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired sessions`);
    }
  }

  /**
   * Restore session from browser
   */
  async restoreSession(userId: string): Promise<SessionData | null> {
    const sessions = await this.getUserSessions(userId);

    if (sessions.length === 0) {
      return null;
    }

    // Get the most recent session
    const latestSession = sessions[0];

    // Verify browser fingerprint for security
    const currentFingerprint = await this.getBrowserFingerprint();
    if (latestSession.browserFingerprint !== currentFingerprint) {
      console.warn("Browser fingerprint mismatch, creating new session");
      return null;
    }

    // Restore conversation contexts
    for (const conversationId of latestSession.activeConversations) {
      const context = await this.loadConversationContext(conversationId);
      if (context) {
        this.contextManager.initializeContext(
          context.conversationId,
          context.userId,
          context.sessionId,
          context.userProfile
        );
      }
    }

    return latestSession;
  }

  // Private helper methods

  private async saveToIndexedDB(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromIndexedDB(
    storeName: string,
    key: string
  ): Promise<any> {
    if (!this.db) throw new Error("IndexedDB not initialized");

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private isSessionValid(session: SessionData): boolean {
    const now = Date.now();
    const lastActivity = new Date(session.lastActivity).getTime();
    return now - lastActivity < this.options.sessionTTL;
  }

  private deserializeConversationContext(data: any): ConversationContext {
    return {
      ...data,
      messages: data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
      sessionMetadata: {
        ...data.sessionMetadata,
        startTime: new Date(data.sessionMetadata.startTime),
        lastActivity: new Date(data.sessionMetadata.lastActivity),
      },
    };
  }

  private async getBrowserFingerprint(): Promise<string> {
    // Simple browser fingerprinting for session validation
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx!.textBaseline = "top";
    ctx!.font = "14px Arial";
    ctx!.fillText("SageInsure fingerprint", 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  private encryptData(data: string): string {
    // Simple XOR encryption (use proper encryption in production)
    const key = "SageInsureKey2024";
    let encrypted = "";

    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return btoa(encrypted);
  }

  private decryptData(encryptedData: string): string {
    const key = "SageInsureKey2024";
    const data = atob(encryptedData);
    let decrypted = "";

    for (let i = 0; i < data.length; i++) {
      decrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return decrypted;
  }
}

export default SessionPersistenceManager;
export type { SessionData, PersistenceOptions };
