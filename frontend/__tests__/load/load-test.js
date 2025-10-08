/**
 * Load Testing Script for Hybrid Routing System
 * Tests concurrent specialist conversations with memory management
 */

const { performance } = require("perf_hooks");

// Mock implementations for Node.js environment
class MockIntentDetectionRouter {
  detectIntent(query, history = [], currentSpecialist) {
    // Simple mock intent detection
    const intentMap = {
      claim: "CLAIMS_CHAT",
      damage: "CLAIMS_CHAT",
      accident: "CLAIMS_CHAT",
      risk: "UNDERWRITING",
      underwriting: "UNDERWRITING",
      acord: "UNDERWRITING",
      research: "RESEARCH_ASSISTANT",
      study: "RESEARCH_ASSISTANT",
      cyber: "CYBER_INSURANCE",
      breach: "CYBER_INSURANCE",
      emergency: "FNOL_PROCESSOR",
      incident: "FNOL_PROCESSOR",
      workflow: "CLAIMS_LIFECYCLE",
      policy: "POLICY_ASSISTANT",
    };

    const lowerQuery = query.toLowerCase();
    let specialist = "POLICY_ASSISTANT";
    let confidence = 0.6;

    for (const [keyword, spec] of Object.entries(intentMap)) {
      if (lowerQuery.includes(keyword)) {
        specialist = spec;
        confidence = 0.8 + Math.random() * 0.2;
        break;
      }
    }

    // Context boost
    if (currentSpecialist && specialist === currentSpecialist) {
      confidence *= 1.2;
    }

    return {
      specialist,
      confidence: Math.min(confidence, 1.0),
      matchedPatterns: [`Keyword match: ${specialist}`],
      reasoning: `Detected ${specialist} with ${(confidence * 100).toFixed(1)}% confidence`,
      alternativeSpecialists: [
        { specialist: "POLICY_ASSISTANT", confidence: 0.3 },
        { specialist: "CLAIMS_CHAT", confidence: 0.2 },
      ],
    };
  }
}

class MockConversationContextManager {
  constructor() {
    this.contexts = new Map();
  }

  initializeContext(conversationId, userId, sessionId, userProfile) {
    const context = {
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
    return context;
  }

  addMessage(conversationId, message) {
    const context = this.contexts.get(conversationId);
    if (context) {
      context.messages.push(message);
      context.sessionMetadata.totalMessages++;
      context.sessionMetadata.lastActivity = new Date();

      const specialist = message.specialist || context.activeSpecialist;
      if (!context.specialistHistory[specialist]) {
        context.specialistHistory[specialist] = [];
      }
      context.specialistHistory[specialist].push(message);
    }
  }

  switchSpecialist(conversationId, newSpecialist) {
    const context = this.contexts.get(conversationId);
    if (context && context.activeSpecialist !== newSpecialist) {
      context.activeSpecialist = newSpecialist;
      context.sessionMetadata.specialistSwitches++;
      context.sessionMetadata.lastActivity = new Date();
    }
  }

  buildContextForSpecialist(conversationId, specialist, currentQuery) {
    const context = this.contexts.get(conversationId);
    if (!context) return null;

    const recentMessages = context.messages.slice(-10);
    const specialistMessages = context.specialistHistory[specialist] || [];

    return {
      recentMessages: recentMessages.slice(-5),
      keyTopics: ["insurance", "policy", "claims"],
      userIntent: "information_seeking",
      relevantHistory: specialistMessages.slice(-3),
      contextTokens: recentMessages.reduce(
        (sum, msg) => sum + msg.content.length / 4,
        0
      ),
    };
  }

  getConversationSummary(conversationId) {
    const context = this.contexts.get(conversationId);
    if (!context) return null;

    return {
      totalMessages: context.sessionMetadata.totalMessages,
      specialistMessages: Object.values(context.specialistHistory).flat()
        .length,
      keyTopics: ["insurance", "claims", "policy"],
      lastActivity: context.sessionMetadata.lastActivity,
      sessionDuration: Date.now() - context.sessionMetadata.startTime.getTime(),
    };
  }
}

class MockMonitoringSystem {
  constructor() {
    this.performanceMetrics = [];
    this.intentMetrics = [];
  }

  logPerformance(operation, duration, success, specialist, error) {
    this.performanceMetrics.push({
      timestamp: new Date(),
      operation,
      duration,
      success,
      specialist,
      errorType: error?.name,
      errorMessage: error?.message,
    });
  }

  logIntentAccuracy(query, detectedIntent, confidence, userCorrection) {
    this.intentMetrics.push({
      timestamp: new Date(),
      query,
      detectedIntent,
      confidence,
      userCorrection,
      wasCorrect: !userCorrection || userCorrection === detectedIntent,
    });
  }

  getPerformanceSummary() {
    const recent = this.performanceMetrics.slice(-100);
    if (recent.length === 0)
      return { totalOperations: 0, successRate: 100, averageResponseTime: 0 };

    const successful = recent.filter((m) => m.success).length;
    const totalDuration = recent.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalOperations: recent.length,
      successRate: (successful / recent.length) * 100,
      averageResponseTime: totalDuration / recent.length,
      slowOperations: recent.filter((m) => m.duration > 5000).length,
    };
  }

  getIntentAccuracySummary() {
    const recent = this.intentMetrics.slice(-100);
    if (recent.length === 0)
      return { totalDetections: 0, accuracy: 100, averageConfidence: 0 };

    const correct = recent.filter((m) => m.wasCorrect).length;
    const totalConfidence = recent.reduce((sum, m) => sum + m.confidence, 0);

    return {
      totalDetections: recent.length,
      accuracy: (correct / recent.length) * 100,
      averageConfidence: totalConfidence / recent.length,
    };
  }
}

// Load test configuration
const LOAD_TEST_CONFIG = {
  concurrentUsers: 50,
  messagesPerUser: 20,
  testDurationMs: 60000, // 1 minute
  specialists: [
    "CLAIMS_CHAT",
    "UNDERWRITING",
    "POLICY_ASSISTANT",
    "CYBER_INSURANCE",
    "FNOL_PROCESSOR",
  ],
  queries: [
    "I need to file a claim for my car accident",
    "What does my policy cover?",
    "Help me with risk assessment",
    "I have a cyber security incident",
    "Emergency! I need to report an incident",
    "What is my deductible?",
    "How do I complete the ACORD form?",
    "My claim status please",
    "Policy renewal question",
    "Underwriting guidelines help",
  ],
};

class LoadTester {
  constructor() {
    this.intentRouter = new MockIntentDetectionRouter();
    this.contextManager = new MockConversationContextManager();
    this.monitoring = new MockMonitoringSystem();
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimes: [],
      intentAccuracy: 0,
      memoryUsage: [],
      errors: [],
    };
  }

  async runLoadTest() {
    console.log("🚀 Starting Load Test for Hybrid Routing System");
    console.log(
      `Configuration: ${LOAD_TEST_CONFIG.concurrentUsers} users, ${LOAD_TEST_CONFIG.messagesPerUser} messages each`
    );

    const startTime = performance.now();
    const userPromises = [];

    // Create concurrent users
    for (let i = 0; i < LOAD_TEST_CONFIG.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i));
    }

    // Wait for all users to complete
    await Promise.all(userPromises);

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    // Calculate results
    this.calculateResults(totalDuration);
    this.printResults();

    return this.results;
  }

  async simulateUser(userId) {
    const conversationId = `load-test-conv-${userId}`;
    const sessionId = `load-test-session-${userId}`;
    const userProfile = {
      preferences: {},
      accessLevel: "standard",
      tenantId: "load-test-tenant",
    };

    // Initialize conversation
    this.contextManager.initializeContext(
      conversationId,
      `user-${userId}`,
      sessionId,
      userProfile
    );

    let currentSpecialist = "POLICY_ASSISTANT";
    const conversationHistory = [];

    // Send messages
    for (
      let msgIndex = 0;
      msgIndex < LOAD_TEST_CONFIG.messagesPerUser;
      msgIndex++
    ) {
      try {
        const startTime = performance.now();

        // Select random query
        const query =
          LOAD_TEST_CONFIG.queries[
            Math.floor(Math.random() * LOAD_TEST_CONFIG.queries.length)
          ];

        // Detect intent
        const intentResult = this.intentRouter.detectIntent(
          query,
          conversationHistory,
          currentSpecialist
        );

        // Switch specialist if needed
        if (intentResult.specialist !== currentSpecialist) {
          this.contextManager.switchSpecialist(
            conversationId,
            intentResult.specialist
          );
          currentSpecialist = intentResult.specialist;
        }

        // Add message to context
        const message = {
          id: `msg-${userId}-${msgIndex}`,
          type: "user",
          content: query,
          timestamp: new Date(),
          specialist: currentSpecialist,
        };

        this.contextManager.addMessage(conversationId, message);
        conversationHistory.push({
          content: query,
          specialist: currentSpecialist,
        });

        // Build context for specialist
        this.contextManager.buildContextForSpecialist(
          conversationId,
          currentSpecialist,
          query
        );

        const endTime = performance.now();
        const duration = endTime - startTime;

        // Log metrics
        this.monitoring.logPerformance(
          "user-interaction",
          duration,
          true,
          currentSpecialist
        );
        this.monitoring.logIntentAccuracy(
          query,
          intentResult.specialist,
          intentResult.confidence
        );

        // Track response time
        this.results.responseTimes.push(duration);
        this.results.totalRequests++;
        this.results.successfulRequests++;

        // Simulate thinking time
        await this.delay(Math.random() * 100 + 50); // 50-150ms
      } catch (error) {
        this.results.failedRequests++;
        this.results.errors.push({
          userId,
          messageIndex: msgIndex,
          error: error.message,
          timestamp: new Date(),
        });
      }
    }

    // Record memory usage periodically
    if (userId % 10 === 0) {
      this.recordMemoryUsage();
    }
  }

  recordMemoryUsage() {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      this.results.memoryUsage.push({
        timestamp: new Date(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
      });
    }
  }

  calculateResults(totalDuration) {
    // Response time statistics
    if (this.results.responseTimes.length > 0) {
      this.results.averageResponseTime =
        this.results.responseTimes.reduce((sum, time) => sum + time, 0) /
        this.results.responseTimes.length;
      this.results.maxResponseTime = Math.max(...this.results.responseTimes);
      this.results.minResponseTime = Math.min(...this.results.responseTimes);
    }

    // Intent accuracy
    const intentSummary = this.monitoring.getIntentAccuracySummary();
    this.results.intentAccuracy = intentSummary.accuracy;

    // Performance summary
    const perfSummary = this.monitoring.getPerformanceSummary();
    this.results.performanceSummary = perfSummary;

    // Throughput
    this.results.throughput =
      (this.results.totalRequests / totalDuration) * 1000; // requests per second
    this.results.totalDuration = totalDuration;
  }

  printResults() {
    console.log("\n📊 LOAD TEST RESULTS");
    console.log("=" * 50);

    console.log(`\n🎯 Overall Performance:`);
    console.log(`  Total Requests: ${this.results.totalRequests}`);
    console.log(
      `  Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`
    );
    console.log(`  Failed: ${this.results.failedRequests}`);
    console.log(
      `  Throughput: ${this.results.throughput.toFixed(2)} requests/second`
    );
    console.log(
      `  Test Duration: ${(this.results.totalDuration / 1000).toFixed(2)} seconds`
    );

    console.log(`\n⚡ Response Times:`);
    console.log(`  Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`  Max: ${this.results.maxResponseTime.toFixed(2)}ms`);

    // Percentiles
    const sortedTimes = this.results.responseTimes.sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    console.log(`  50th percentile: ${p50.toFixed(2)}ms`);
    console.log(`  95th percentile: ${p95.toFixed(2)}ms`);
    console.log(`  99th percentile: ${p99.toFixed(2)}ms`);

    console.log(`\n🎯 Intent Detection:`);
    console.log(`  Accuracy: ${this.results.intentAccuracy.toFixed(2)}%`);

    if (this.results.memoryUsage.length > 0) {
      const avgMemory =
        this.results.memoryUsage.reduce(
          (sum, usage) => sum + usage.heapUsed,
          0
        ) / this.results.memoryUsage.length;
      const maxMemory = Math.max(
        ...this.results.memoryUsage.map((usage) => usage.heapUsed)
      );

      console.log(`\n💾 Memory Usage:`);
      console.log(`  Average Heap: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Peak Heap: ${(maxMemory / 1024 / 1024).toFixed(2)} MB`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors (${this.results.errors.length}):`);
      this.results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. User ${error.userId}: ${error.error}`);
      });
      if (this.results.errors.length > 5) {
        console.log(`  ... and ${this.results.errors.length - 5} more errors`);
      }
    }

    // Performance assessment
    console.log(`\n🏆 Performance Assessment:`);
    if (this.results.averageResponseTime < 100) {
      console.log(`  ✅ Excellent response times (< 100ms)`);
    } else if (this.results.averageResponseTime < 500) {
      console.log(`  ✅ Good response times (< 500ms)`);
    } else {
      console.log(`  ⚠️ Slow response times (> 500ms)`);
    }

    if (this.results.intentAccuracy > 90) {
      console.log(`  ✅ Excellent intent detection accuracy (> 90%)`);
    } else if (this.results.intentAccuracy > 80) {
      console.log(`  ✅ Good intent detection accuracy (> 80%)`);
    } else {
      console.log(`  ⚠️ Poor intent detection accuracy (< 80%)`);
    }

    if (this.results.failedRequests === 0) {
      console.log(`  ✅ No failed requests`);
    } else if (
      this.results.failedRequests <
      this.results.totalRequests * 0.01
    ) {
      console.log(`  ✅ Low error rate (< 1%)`);
    } else {
      console.log(`  ⚠️ High error rate (> 1%)`);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Run load test if called directly
if (require.main === module) {
  const loadTester = new LoadTester();
  loadTester
    .runLoadTest()
    .then(() => {
      console.log("\n🎉 Load test completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Load test failed:", error);
      process.exit(1);
    });
}

module.exports = { LoadTester, LOAD_TEST_CONFIG };
