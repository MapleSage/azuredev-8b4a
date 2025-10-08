/**
 * Comprehensive Monitoring and Error Handling System
 * Tracks Azure service health, intent detection accuracy, and performance metrics
 */

interface ServiceHealth {
  service: string;
  status: "healthy" | "degraded" | "unhealthy";
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  details: string;
}

interface IntentAccuracyMetric {
  timestamp: Date;
  query: string;
  detectedIntent: string;
  confidence: number;
  userCorrection?: string;
  actualSpecialist?: string;
  wasCorrect: boolean;
}

interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  specialist?: string;
  errorType?: string;
  errorMessage?: string;
}

interface MonitoringAlert {
  id: string;
  type: "error" | "warning" | "info";
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

class MonitoringSystem {
  private static instance: MonitoringSystem;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private intentMetrics: IntentAccuracyMetric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private alerts: MonitoringAlert[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_METRICS_HISTORY = 1000;

  private constructor() {
    this.initializeServices();
    this.startHealthChecks();
    this.setupErrorHandlers();
  }

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  /**
   * Initialize service monitoring
   */
  private initializeServices(): void {
    const services = [
      "azure-fastapi",
      "azure-search",
      "azure-openai",
      "intent-detection",
      "session-management",
    ];

    services.forEach((service) => {
      this.serviceHealth.set(service, {
        service,
        status: "healthy",
        lastCheck: new Date(),
        responseTime: 0,
        errorRate: 0,
        details: "Initializing...",
      });
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);

    // Initial health check
    setTimeout(() => this.performHealthChecks(), 1000);
  }

  /**
   * Setup global error handlers
   */
  private setupErrorHandlers(): void {
    if (typeof window !== "undefined") {
      // Handle unhandled promise rejections
      window.addEventListener("unhandledrejection", (event) => {
        this.logError("unhandled-promise", event.reason, {
          promise: event.promise,
          url: window.location.href,
        });
      });

      // Handle JavaScript errors
      window.addEventListener("error", (event) => {
        this.logError("javascript-error", event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          url: window.location.href,
        });
      });
    }
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    const healthChecks = [
      this.checkAzureFastAPIHealth(),
      this.checkAzureSearchHealth(),
      this.checkAzureOpenAIHealth(),
      this.checkIntentDetectionHealth(),
      this.checkSessionManagementHealth(),
    ];

    await Promise.allSettled(healthChecks);
  }

  /**
   * Check Azure FastAPI health
   */
  private async checkAzureFastAPIHealth(): Promise<void> {
    const service = "azure-fastapi";
    const startTime = Date.now();

    try {
      const azureUrl =
        process.env.NEXT_PUBLIC_AZURE_FASTAPI_URL || "http://localhost:8000";
      const response = await fetch(`${azureUrl}/healthz`, {
        method: "GET",
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      this.updateServiceHealth(service, {
        status: isHealthy ? "healthy" : "degraded",
        responseTime,
        details: isHealthy
          ? "Service responding normally"
          : `HTTP ${response.status}`,
        errorRate: this.calculateErrorRate(service, !isHealthy),
      });

      if (!isHealthy) {
        this.createAlert(
          "warning",
          service,
          `Health check failed: HTTP ${response.status}`,
          {
            responseTime,
            status: response.status,
          }
        );
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.updateServiceHealth(service, {
        status: "unhealthy",
        responseTime,
        details: `Connection failed: ${error.message}`,
        errorRate: this.calculateErrorRate(service, true),
      });

      this.createAlert(
        "error",
        service,
        `Health check failed: ${error.message}`,
        {
          responseTime,
          error: error.message,
        }
      );
    }
  }

  /**
   * Check Azure Search health (via proxy)
   */
  private async checkAzureSearchHealth(): Promise<void> {
    const service = "azure-search";
    const startTime = Date.now();

    try {
      // Test search functionality through our proxy
      const response = await fetch("/api/chat?agent=POLICY_ASSISTANT", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "health-check",
          text: "health check query",
          specialist: "POLICY_ASSISTANT",
        }),
        signal: AbortSignal.timeout(15000),
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;

      this.updateServiceHealth(service, {
        status: isHealthy ? "healthy" : "degraded",
        responseTime,
        details: isHealthy
          ? "Search service responding"
          : `Proxy error: HTTP ${response.status}`,
        errorRate: this.calculateErrorRate(service, !isHealthy),
      });
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      this.updateServiceHealth(service, {
        status: "unhealthy",
        responseTime,
        details: `Search unavailable: ${error.message}`,
        errorRate: this.calculateErrorRate(service, true),
      });
    }
  }

  /**
   * Check Azure OpenAI health (via proxy)
   */
  private async checkAzureOpenAIHealth(): Promise<void> {
    const service = "azure-openai";
    // This is checked as part of the Azure FastAPI health check
    // We'll monitor it through performance metrics instead

    const recentMetrics = this.performanceMetrics
      .filter(
        (m) =>
          m.operation.includes("openai") &&
          Date.now() - m.timestamp.getTime() < 300000
      ) // Last 5 minutes
      .slice(-10);

    if (recentMetrics.length > 0) {
      const errorRate =
        recentMetrics.filter((m) => !m.success).length / recentMetrics.length;
      const avgResponseTime =
        recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
        recentMetrics.length;

      this.updateServiceHealth(service, {
        status:
          errorRate > 0.5
            ? "unhealthy"
            : errorRate > 0.2
              ? "degraded"
              : "healthy",
        responseTime: avgResponseTime,
        details: `Based on recent API calls (${recentMetrics.length} samples)`,
        errorRate: errorRate * 100,
      });
    }
  }

  /**
   * Check intent detection health
   */
  private async checkIntentDetectionHealth(): Promise<void> {
    const service = "intent-detection";

    // Calculate accuracy from recent metrics
    const recentIntentMetrics = this.intentMetrics
      .filter((m) => Date.now() - m.timestamp.getTime() < 3600000) // Last hour
      .slice(-50);

    if (recentIntentMetrics.length > 0) {
      const accuracy =
        recentIntentMetrics.filter((m) => m.wasCorrect).length /
        recentIntentMetrics.length;
      const avgConfidence =
        recentIntentMetrics.reduce((sum, m) => sum + m.confidence, 0) /
        recentIntentMetrics.length;

      this.updateServiceHealth(service, {
        status:
          accuracy > 0.8
            ? "healthy"
            : accuracy > 0.6
              ? "degraded"
              : "unhealthy",
        responseTime: 0, // Intent detection is synchronous
        details: `Accuracy: ${(accuracy * 100).toFixed(1)}%, Avg Confidence: ${(avgConfidence * 100).toFixed(1)}%`,
        errorRate: (1 - accuracy) * 100,
      });

      if (accuracy < 0.7) {
        this.createAlert(
          "warning",
          service,
          `Intent detection accuracy below threshold: ${(accuracy * 100).toFixed(1)}%`,
          {
            accuracy,
            avgConfidence,
            sampleSize: recentIntentMetrics.length,
          }
        );
      }
    } else {
      this.updateServiceHealth(service, {
        status: "healthy",
        responseTime: 0,
        details: "No recent data available",
        errorRate: 0,
      });
    }
  }

  /**
   * Check session management health
   */
  private async checkSessionManagementHealth(): Promise<void> {
    const service = "session-management";

    try {
      // Test session storage functionality
      const testKey = "health_check_test";
      const testValue = Date.now().toString();

      if (typeof window !== "undefined") {
        sessionStorage.setItem(testKey, testValue);
        const retrieved = sessionStorage.getItem(testKey);
        sessionStorage.removeItem(testKey);

        const isHealthy = retrieved === testValue;

        this.updateServiceHealth(service, {
          status: isHealthy ? "healthy" : "unhealthy",
          responseTime: 0,
          details: isHealthy
            ? "Session storage working"
            : "Session storage failed",
          errorRate: isHealthy ? 0 : 100,
        });
      }
    } catch (error: any) {
      this.updateServiceHealth(service, {
        status: "unhealthy",
        responseTime: 0,
        details: `Session management error: ${error.message}`,
        errorRate: 100,
      });
    }
  }

  /**
   * Update service health status
   */
  private updateServiceHealth(
    service: string,
    updates: Partial<ServiceHealth>
  ): void {
    const current = this.serviceHealth.get(service);
    if (current) {
      this.serviceHealth.set(service, {
        ...current,
        ...updates,
        lastCheck: new Date(),
      });
    }
  }

  /**
   * Calculate error rate for a service
   */
  private calculateErrorRate(service: string, hadError: boolean): number {
    const recentMetrics = this.performanceMetrics
      .filter(
        (m) =>
          m.operation.includes(service) &&
          Date.now() - m.timestamp.getTime() < 300000
      ) // Last 5 minutes
      .slice(-20);

    if (recentMetrics.length === 0) {
      return hadError ? 100 : 0;
    }

    const errors =
      recentMetrics.filter((m) => !m.success).length + (hadError ? 1 : 0);
    return (errors / (recentMetrics.length + 1)) * 100;
  }

  /**
   * Create monitoring alert
   */
  private createAlert(
    type: MonitoringAlert["type"],
    service: string,
    message: string,
    metadata?: Record<string, any>
  ): void {
    const alert: MonitoringAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      service,
      message,
      timestamp: new Date(),
      resolved: false,
      metadata,
    };

    this.alerts.unshift(alert);

    // Keep only recent alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    // Log to console based on type
    const logMessage = `[${service.toUpperCase()}] ${message}`;
    switch (type) {
      case "error":
        console.error("🚨", logMessage, metadata);
        break;
      case "warning":
        console.warn("⚠️", logMessage, metadata);
        break;
      case "info":
        console.info("ℹ️", logMessage, metadata);
        break;
    }
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    specialist?: string,
    error?: Error
  ): void {
    const metric: PerformanceMetric = {
      timestamp: new Date(),
      operation,
      duration,
      success,
      specialist,
      errorType: error?.name,
      errorMessage: error?.message,
    };

    this.performanceMetrics.unshift(metric);

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics = this.performanceMetrics.slice(
        0,
        this.MAX_METRICS_HISTORY
      );
    }

    // Create alert for slow operations
    if (duration > 10000) {
      // 10 seconds
      this.createAlert(
        "warning",
        specialist || "system",
        `Slow operation: ${operation} took ${duration}ms`,
        {
          operation,
          duration,
          success,
        }
      );
    }

    // Create alert for errors
    if (!success && error) {
      this.createAlert(
        "error",
        specialist || "system",
        `Operation failed: ${operation}`,
        {
          operation,
          duration,
          error: error.message,
          errorType: error.name,
        }
      );
    }
  }

  /**
   * Log intent detection accuracy
   */
  logIntentAccuracy(
    query: string,
    detectedIntent: string,
    confidence: number,
    userCorrection?: string
  ): void {
    const wasCorrect = !userCorrection || userCorrection === detectedIntent;

    const metric: IntentAccuracyMetric = {
      timestamp: new Date(),
      query,
      detectedIntent,
      confidence,
      userCorrection,
      actualSpecialist: userCorrection,
      wasCorrect,
    };

    this.intentMetrics.unshift(metric);

    // Keep only recent metrics
    if (this.intentMetrics.length > this.MAX_METRICS_HISTORY) {
      this.intentMetrics = this.intentMetrics.slice(
        0,
        this.MAX_METRICS_HISTORY
      );
    }

    // Log low confidence detections
    if (confidence < 0.5) {
      this.createAlert(
        "warning",
        "intent-detection",
        `Low confidence intent detection: ${(confidence * 100).toFixed(1)}%`,
        {
          query: query.substring(0, 100),
          detectedIntent,
          confidence,
        }
      );
    }
  }

  /**
   * Log general error
   */
  logError(source: string, error: any, metadata?: Record<string, any>): void {
    this.createAlert("error", source, error?.message || "Unknown error", {
      ...metadata,
      error: error?.toString(),
      stack: error?.stack,
    });
  }

  /**
   * Get current service health status
   */
  getServiceHealth(): Map<string, ServiceHealth> {
    return new Map(this.serviceHealth);
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 20): MonitoringAlert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeWindow: number = 3600000): {
    totalOperations: number;
    successRate: number;
    averageResponseTime: number;
    slowOperations: number;
    errorsByType: Record<string, number>;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp.getTime() > cutoff
    );

    if (recentMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 100,
        averageResponseTime: 0,
        slowOperations: 0,
        errorsByType: {},
      };
    }

    const successful = recentMetrics.filter((m) => m.success).length;
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const slowOps = recentMetrics.filter((m) => m.duration > 5000).length;

    const errorsByType: Record<string, number> = {};
    recentMetrics
      .filter((m) => !m.success && m.errorType)
      .forEach((m) => {
        errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1;
      });

    return {
      totalOperations: recentMetrics.length,
      successRate: (successful / recentMetrics.length) * 100,
      averageResponseTime: totalDuration / recentMetrics.length,
      slowOperations: slowOps,
      errorsByType,
    };
  }

  /**
   * Get intent detection accuracy summary
   */
  getIntentAccuracySummary(timeWindow: number = 3600000): {
    totalDetections: number;
    accuracy: number;
    averageConfidence: number;
    lowConfidenceDetections: number;
    correctionsBySpecialist: Record<string, number>;
  } {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.intentMetrics.filter(
      (m) => m.timestamp.getTime() > cutoff
    );

    if (recentMetrics.length === 0) {
      return {
        totalDetections: 0,
        accuracy: 100,
        averageConfidence: 0,
        lowConfidenceDetections: 0,
        correctionsBySpecialist: {},
      };
    }

    const correct = recentMetrics.filter((m) => m.wasCorrect).length;
    const totalConfidence = recentMetrics.reduce(
      (sum, m) => sum + m.confidence,
      0
    );
    const lowConfidence = recentMetrics.filter(
      (m) => m.confidence < 0.7
    ).length;

    const correctionsBySpecialist: Record<string, number> = {};
    recentMetrics
      .filter((m) => m.userCorrection)
      .forEach((m) => {
        const specialist = m.userCorrection!;
        correctionsBySpecialist[specialist] =
          (correctionsBySpecialist[specialist] || 0) + 1;
      });

    return {
      totalDetections: recentMetrics.length,
      accuracy: (correct / recentMetrics.length) * 100,
      averageConfidence: totalConfidence / recentMetrics.length,
      lowConfidenceDetections: lowConfidence,
      correctionsBySpecialist,
    };
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge: number = 86400000): void {
    // 24 hours
    const cutoff = Date.now() - maxAge;
    this.alerts = this.alerts.filter((a) => a.timestamp.getTime() > cutoff);
  }

  /**
   * Cleanup and stop monitoring
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

export default MonitoringSystem;
export type {
  ServiceHealth,
  IntentAccuracyMetric,
  PerformanceMetric,
  MonitoringAlert,
};
