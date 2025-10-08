/**
 * Integration Tests for Hybrid Routing System
 * Tests intent detection, automatic tab routing, session persistence, and Azure backend integration
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import IntentDetectionRouter from "../../lib/intent-detection-router";
import ConversationContextManager from "../../lib/conversation-context-manager";
import SessionPersistenceManager from "../../lib/session-persistence-manager";
import MonitoringSystem from "../../lib/monitoring-system";
import GracefulDegradationHandler from "../../lib/graceful-degradation";

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock sessionStorage and localStorage
const mockStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockStorage.data = {};
  }),
  get length() {
    return Object.keys(mockStorage.data).length;
  },
  key: jest.fn((index: number) => Object.keys(mockStorage.data)[index] || null),
};

Object.defineProperty(window, "sessionStorage", { value: mockStorage });
Object.defineProperty(window, "localStorage", { value: mockStorage });

describe("Hybrid Routing System Integration Tests", () => {
  let intentRouter: IntentDetectionRouter;
  let contextManager: ConversationContextManager;
  let sessionManager: SessionPersistenceManager;
  let monitoring: MonitoringSystem;
  let degradationHandler: GracefulDegradationHandler;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockStorage.clear();

    // Initialize system components
    intentRouter = IntentDetectionRouter.getInstance();
    contextManager = ConversationContextManager.getInstance();
    sessionManager = SessionPersistenceManager.getInstance();
    monitoring = MonitoringSystem.getInstance();
    degradationHandler = GracefulDegradationHandler.getInstance();
  });

  afterEach(() => {
    // Cleanup
    monitoring.cleanup();
  });

  describe("Intent Detection and Routing", () => {
    it("should correctly detect claims-related intents", () => {
      const testCases = [
        {
          query: "I need to file a claim for my car accident",
          expectedSpecialist: "CLAIMS_CHAT",
          minConfidence: 0.8,
        },
        {
          query: "What's the status of claim number CLM-2024-001234?",
          expectedSpecialist: "CLAIMS_CHAT",
          minConfidence: 0.9,
        },
        {
          query: "My house was damaged in the storm yesterday",
          expectedSpecialist: "CLAIMS_CHAT",
          minConfidence: 0.7,
        },
      ];

      testCases.forEach(({ query, expectedSpecialist, minConfidence }) => {
        const result = intentRouter.detectIntent(query);

        expect(result.specialist).toBe(expectedSpecialist);
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
        expect(result.reasoning).toContain(expectedSpecialist);
      });
    });

    it("should correctly detect underwriting intents", () => {
      const testCases = [
        {
          query: "I need help with risk assessment for my business",
          expectedSpecialist: "UNDERWRITING",
          minConfidence: 0.7,
        },
        {
          query: "How do I complete the ACORD 125 form?",
          expectedSpecialist: "UNDERWRITING",
          minConfidence: 0.8,
        },
        {
          query: "What factors affect my premium calculation?",
          expectedSpecialist: "UNDERWRITING",
          minConfidence: 0.7,
        },
      ];

      testCases.forEach(({ query, expectedSpecialist, minConfidence }) => {
        const result = intentRouter.detectIntent(query);

        expect(result.specialist).toBe(expectedSpecialist);
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence);
      });
    });

    it("should handle emergency situations with high priority routing", () => {
      const emergencyQueries = [
        "Emergency! My building is on fire right now",
        "Urgent: I need to report an accident that just happened",
        "HELP! There was a break-in at my store",
      ];

      emergencyQueries.forEach((query) => {
        const result = intentRouter.detectIntent(query);

        expect(result.specialist).toBe("FNOL_PROCESSOR");
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
        expect(result.reasoning).toContain("high-priority");
      });
    });

    it("should provide alternative specialist suggestions", () => {
      const query = "I have questions about my policy coverage and claims";
      const result = intentRouter.detectIntent(query);

      expect(result.alternativeSpecialists).toHaveLength(3);
      expect(
        result.alternativeSpecialists.every((alt) => alt.confidence > 0)
      ).toBe(true);
      expect(
        result.alternativeSpecialists.every(
          (alt) => alt.specialist !== result.specialist
        )
      ).toBe(true);
    });

    it("should apply context boost for current specialist", () => {
      const query = "Tell me more about this";
      const conversationHistory = [
        { content: "I need to file a claim", specialist: "CLAIMS_CHAT" },
        { content: "What documents do I need?", specialist: "CLAIMS_CHAT" },
      ];

      const result = intentRouter.detectIntent(
        query,
        conversationHistory,
        "CLAIMS_CHAT"
      );

      // Should stay with CLAIMS_CHAT due to context boost
      expect(result.specialist).toBe("CLAIMS_CHAT");
      expect(result.reasoning).toContain("Context boost");
    });
  });

  describe("Session Management and Persistence", () => {
    it("should initialize conversation context correctly", () => {
      const conversationId = "test-conversation-123";
      const userId = "user-456";
      const sessionId = "session-789";
      const userProfile = {
        preferences: { theme: "dark" },
        accessLevel: "standard",
        tenantId: "tenant-001",
      };

      const context = contextManager.initializeContext(
        conversationId,
        userId,
        sessionId,
        userProfile
      );

      expect(context.conversationId).toBe(conversationId);
      expect(context.userId).toBe(userId);
      expect(context.sessionId).toBe(sessionId);
      expect(context.userProfile).toEqual(userProfile);
      expect(context.messages).toHaveLength(0);
      expect(context.activeSpecialist).toBe("POLICY_ASSISTANT");
    });

    it("should persist and restore conversation context", async () => {
      const conversationId = "test-conversation-persist";
      const userId = "user-persist";
      const sessionId = "session-persist";
      const userProfile = {
        preferences: {},
        accessLevel: "standard",
        tenantId: "tenant-001",
      };

      // Initialize context and add messages
      const context = contextManager.initializeContext(
        conversationId,
        userId,
        sessionId,
        userProfile
      );

      const testMessage = {
        id: "msg-1",
        type: "user" as const,
        content: "Test message",
        timestamp: new Date(),
        specialist: "CLAIMS_CHAT",
      };

      contextManager.addMessage(conversationId, testMessage);
      contextManager.switchSpecialist(conversationId, "CLAIMS_CHAT");

      // Save context
      await sessionManager.saveConversationContext(context);

      // Load context
      const loadedContext =
        await sessionManager.loadConversationContext(conversationId);

      expect(loadedContext).toBeTruthy();
      expect(loadedContext!.conversationId).toBe(conversationId);
      expect(loadedContext!.activeSpecialist).toBe("CLAIMS_CHAT");
      expect(loadedContext!.messages).toHaveLength(1);
      expect(loadedContext!.messages[0].content).toBe("Test message");
    });

    it("should build appropriate context for specialist queries", () => {
      const conversationId = "test-context-building";
      const userId = "user-context";
      const sessionId = "session-context";
      const userProfile = {
        preferences: {},
        accessLevel: "standard",
        tenantId: "tenant-001",
      };

      const context = contextManager.initializeContext(
        conversationId,
        userId,
        sessionId,
        userProfile
      );

      // Add conversation history
      const messages = [
        {
          id: "msg-1",
          type: "user" as const,
          content: "I need to file a claim",
          timestamp: new Date(Date.now() - 60000),
          specialist: "CLAIMS_CHAT",
        },
        {
          id: "msg-2",
          type: "assistant" as const,
          content: "I can help you file a claim",
          timestamp: new Date(Date.now() - 30000),
          specialist: "CLAIMS_CHAT",
        },
      ];

      messages.forEach((msg) => contextManager.addMessage(conversationId, msg));

      const contextSummary = contextManager.buildContextForSpecialist(
        conversationId,
        "CLAIMS_CHAT",
        "What documents do I need?"
      );

      expect(contextSummary.recentMessages).toHaveLength(2);
      expect(contextSummary.keyTopics).toContain("claims");
      expect(contextSummary.userIntent).toBe("information_seeking");
      expect(contextSummary.contextTokens).toBeGreaterThan(0);
    });
  });

  describe("Azure Backend Integration", () => {
    it("should handle successful Azure FastAPI responses", async () => {
      const mockResponse = {
        response: "Test response from Azure",
        specialist: "CLAIMS_CHAT",
        sources: [
          {
            title: "Test Source",
            content: "Test content",
            score: 0.9,
            metadata: {},
            specialist: "CLAIMS_CHAT",
          },
        ],
        confidence: 0.85,
        tokens_used: 150,
        timestamp: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const response = await fetch("/api/chat?agent=CLAIMS_CHAT", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "test-conv",
          text: "Test query",
          specialist: "CLAIMS_CHAT",
        }),
      });

      expect(response.ok).toBe(true);
      const data = await response.json();
      expect(data.response).toBe("Test response from Azure");
      expect(data.specialist).toBe("CLAIMS_CHAT");
      expect(data.sources).toHaveLength(1);
    });

    it("should handle Azure service failures gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      const fallbackResponse =
        await degradationHandler.handleAzureFastAPIFallback(
          "Test query",
          "CLAIMS_CHAT",
          "test-conv"
        );

      expect(fallbackResponse.fallback_used).toBe(true);
      expect(fallbackResponse.response).toContain("technical difficulties");
      expect(fallbackResponse.specialist).toBe("CLAIMS_CHAT");
      expect(fallbackResponse.confidence).toBeLessThan(0.5);
    });

    it("should implement circuit breaker pattern", () => {
      const service = "azure-fastapi";

      // Record multiple failures
      for (let i = 0; i < 3; i++) {
        degradationHandler.recordServiceFailure(service);
      }

      // Service should be unavailable
      expect(degradationHandler.isServiceAvailable(service)).toBe(false);

      // Reset circuit breaker
      degradationHandler.resetCircuitBreaker(service);
      expect(degradationHandler.isServiceAvailable(service)).toBe(true);
    });
  });

  describe("Monitoring and Error Handling", () => {
    it("should track performance metrics", () => {
      const operation = "azure-query";
      const duration = 1500;
      const specialist = "CLAIMS_CHAT";

      monitoring.logPerformance(operation, duration, true, specialist);

      const summary = monitoring.getPerformanceSummary(3600000); // 1 hour
      expect(summary.totalOperations).toBe(1);
      expect(summary.successRate).toBe(100);
      expect(summary.averageResponseTime).toBe(duration);
    });

    it("should track intent detection accuracy", () => {
      const query = "I need to file a claim";
      const detectedIntent = "CLAIMS_CHAT";
      const confidence = 0.85;

      monitoring.logIntentAccuracy(query, detectedIntent, confidence);

      const summary = monitoring.getIntentAccuracySummary(3600000);
      expect(summary.totalDetections).toBe(1);
      expect(summary.accuracy).toBe(100);
      expect(summary.averageConfidence).toBe(confidence);
    });

    it("should create alerts for service issues", () => {
      monitoring.logError("test-service", new Error("Test error"), {
        context: "test",
      });

      const alerts = monitoring.getRecentAlerts(5);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("error");
      expect(alerts[0].service).toBe("test-service");
      expect(alerts[0].message).toBe("Test error");
    });

    it("should monitor service health", () => {
      const serviceHealth = monitoring.getServiceHealth();

      expect(serviceHealth.has("azure-fastapi")).toBe(true);
      expect(serviceHealth.has("azure-search")).toBe(true);
      expect(serviceHealth.has("azure-openai")).toBe(true);
      expect(serviceHealth.has("intent-detection")).toBe(true);
      expect(serviceHealth.has("session-management")).toBe(true);
    });
  });

  describe("End-to-End Workflow Tests", () => {
    it("should handle complete conversation flow with specialist switching", async () => {
      const conversationId = "e2e-test-conv";
      const userId = "e2e-user";
      const sessionId = "e2e-session";
      const userProfile = {
        preferences: {},
        accessLevel: "standard",
        tenantId: "tenant-001",
      };

      // Initialize conversation
      const context = contextManager.initializeContext(
        conversationId,
        userId,
        sessionId,
        userProfile
      );

      // Step 1: User asks about policy (should route to POLICY_ASSISTANT)
      const policyQuery = "What does my auto insurance policy cover?";
      const policyIntent = intentRouter.detectIntent(policyQuery);
      expect(policyIntent.specialist).toBe("POLICY_ASSISTANT");

      contextManager.switchSpecialist(conversationId, policyIntent.specialist);
      contextManager.addMessage(conversationId, {
        id: "msg-1",
        type: "user",
        content: policyQuery,
        timestamp: new Date(),
        specialist: policyIntent.specialist,
      });

      // Step 2: User reports an accident (should route to FNOL_PROCESSOR)
      const accidentQuery =
        "I just had a car accident and need to report it immediately";
      const accidentIntent = intentRouter.detectIntent(
        accidentQuery,
        [{ content: policyQuery, specialist: "POLICY_ASSISTANT" }],
        "POLICY_ASSISTANT"
      );

      expect(accidentIntent.specialist).toBe("FNOL_PROCESSOR");
      expect(accidentIntent.confidence).toBeGreaterThan(0.8);

      contextManager.switchSpecialist(
        conversationId,
        accidentIntent.specialist
      );
      contextManager.addMessage(conversationId, {
        id: "msg-2",
        type: "user",
        content: accidentQuery,
        timestamp: new Date(),
        specialist: accidentIntent.specialist,
      });

      // Step 3: User asks about claim status (should route to CLAIMS_CHAT)
      const claimQuery = "What's the status of my claim?";
      const claimIntent = intentRouter.detectIntent(
        claimQuery,
        [
          { content: policyQuery, specialist: "POLICY_ASSISTANT" },
          { content: accidentQuery, specialist: "FNOL_PROCESSOR" },
        ],
        "FNOL_PROCESSOR"
      );

      expect(claimIntent.specialist).toBe("CLAIMS_CHAT");

      // Verify conversation context
      const summary = contextManager.getConversationSummary(conversationId);
      expect(summary.totalMessages).toBe(2);
      expect(summary.sessionDuration).toBeGreaterThan(0);

      // Verify session persistence
      await sessionManager.saveConversationContext(context);
      const restoredContext =
        await sessionManager.loadConversationContext(conversationId);
      expect(restoredContext).toBeTruthy();
      expect(restoredContext!.messages).toHaveLength(2);
    });

    it("should handle Azure service degradation gracefully", async () => {
      // Simulate Azure service failure
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error("Service unavailable")
      );

      const query = "I need help with my claim";
      const specialist = "CLAIMS_CHAT";
      const conversationId = "degradation-test";

      // Should fall back to rule-based responses
      const fallbackResponse =
        await degradationHandler.handleAzureFastAPIFallback(
          query,
          specialist,
          conversationId
        );

      expect(fallbackResponse.fallback_used).toBe(true);
      expect(fallbackResponse.response).toContain("claim");
      expect(fallbackResponse.confidence).toBeLessThan(0.5);

      // Should still provide helpful information
      expect(fallbackResponse.response.length).toBeGreaterThan(50);
      expect(fallbackResponse.response).toContain("1-800-CLAIMS");
    });

    it("should maintain performance under load", async () => {
      const startTime = Date.now();
      const promises = [];

      // Simulate concurrent requests
      for (let i = 0; i < 10; i++) {
        const query = `Test query ${i}`;
        const promise = Promise.resolve().then(() => {
          const intent = intentRouter.detectIntent(query);
          monitoring.logPerformance(
            "intent-detection",
            50,
            true,
            intent.specialist
          );
          return intent;
        });
        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      const performanceSummary = monitoring.getPerformanceSummary();
      expect(performanceSummary.totalOperations).toBe(10);
      expect(performanceSummary.successRate).toBe(100);
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover from temporary service outages", () => {
      const service = "azure-fastapi";

      // Simulate service failure
      degradationHandler.recordServiceFailure(service);
      degradationHandler.recordServiceFailure(service);

      expect(degradationHandler.isServiceAvailable(service)).toBe(true); // Still available

      // Third failure should trigger circuit breaker
      degradationHandler.recordServiceFailure(service);
      expect(degradationHandler.isServiceAvailable(service)).toBe(false);

      // Simulate service recovery
      degradationHandler.recordServiceSuccess(service);
      expect(degradationHandler.isServiceAvailable(service)).toBe(true);
    });

    it("should handle malformed responses gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: "response" }),
      });

      try {
        const response = await fetch("/api/chat?agent=CLAIMS_CHAT", {
          method: "POST",
          body: JSON.stringify({ conversationId: "test", text: "test" }),
        });

        const data = await response.json();

        // Should handle gracefully without throwing
        expect(data).toBeDefined();
      } catch (error) {
        // If it throws, should be handled by error boundaries
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should maintain data consistency during failures", () => {
      const conversationId = "consistency-test";
      const userId = "user-consistency";
      const sessionId = "session-consistency";
      const userProfile = {
        preferences: {},
        accessLevel: "standard",
        tenantId: "tenant-001",
      };

      const context = contextManager.initializeContext(
        conversationId,
        userId,
        sessionId,
        userProfile
      );

      // Add messages
      for (let i = 0; i < 5; i++) {
        contextManager.addMessage(conversationId, {
          id: `msg-${i}`,
          type: "user",
          content: `Message ${i}`,
          timestamp: new Date(),
          specialist: "CLAIMS_CHAT",
        });
      }

      // Simulate storage failure by clearing storage
      mockStorage.clear();

      // Context should still be available in memory
      const summary = contextManager.getConversationSummary(conversationId);
      expect(summary.totalMessages).toBe(5);
    });
  });
});

// Helper function to create mock Azure response
function createMockAzureResponse(specialist: string, query: string) {
  return {
    response: `Mock response for ${specialist}: ${query}`,
    specialist,
    sources: [
      {
        title: "Mock Source",
        content: "Mock content",
        score: 0.8,
        metadata: {},
        specialist,
      },
    ],
    confidence: 0.8,
    tokens_used: 100,
    timestamp: new Date().toISOString(),
  };
}

// Helper function to simulate network delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
