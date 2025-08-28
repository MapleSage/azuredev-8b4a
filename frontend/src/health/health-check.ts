/**
 * Health check implementation for SageInsure Next.js frontend
 */

export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime_seconds: number;
  response_time_ms: number;
  version: string;
  environment: string;
  checks?: Record<string, any>;
}

export interface DependencyCheck {
  status: "healthy" | "unhealthy" | "degraded";
  response_time_ms: number;
  timestamp: string;
  error?: string;
}

class HealthChecker {
  private startupTime: Date;
  private checks: Record<string, () => Promise<DependencyCheck>>;

  constructor() {
    this.startupTime = new Date();
    this.checks = {
      api: this.checkAPI.bind(this),
      build: this.checkBuild.bind(this),
      environment: this.checkEnvironment.bind(this),
    };
  }

  async healthCheck(
    includeDetails: boolean = false
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const results: Record<string, DependencyCheck> = {};
    let overallStatus: "healthy" | "unhealthy" | "degraded" = "healthy";

    // Run all health checks
    for (const [checkName, checkFunc] of Object.entries(this.checks)) {
      try {
        const result = await Promise.race([
          checkFunc(),
          this.timeoutPromise(10000), // 10 second timeout
        ]);

        results[checkName] = result;

        if (result.status === "unhealthy") {
          overallStatus = "unhealthy";
        } else if (
          result.status === "degraded" &&
          overallStatus === "healthy"
        ) {
          overallStatus = "degraded";
        }
      } catch (error) {
        results[checkName] = {
          status: "unhealthy",
          response_time_ms: 0,
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        };
        overallStatus = "unhealthy";
      }
    }

    const responseTime = Date.now() - startTime;
    const uptime = Math.floor((Date.now() - this.startupTime.getTime()) / 1000);

    const healthResponse: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_seconds: uptime,
      response_time_ms: responseTime,
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    if (includeDetails) {
      healthResponse.checks = results;
    }

    return healthResponse;
  }

  async readinessCheck(): Promise<HealthCheckResult> {
    // For frontend, readiness mainly depends on API availability
    const startTime = Date.now();

    try {
      const apiCheck = await this.checkAPI();
      const responseTime = Date.now() - startTime;

      return {
        status: apiCheck.status === "healthy" ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(
          (Date.now() - this.startupTime.getTime()) / 1000
        ),
        response_time_ms: responseTime,
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          api: apiCheck,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(
          (Date.now() - this.startupTime.getTime()) / 1000
        ),
        response_time_ms: Date.now() - startTime,
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        checks: {
          api: {
            status: "unhealthy",
            response_time_ms: 0,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      };
    }
  }

  async livenessCheck(): Promise<HealthCheckResult> {
    // Simple liveness check - just verify the app is running
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(
        (Date.now() - this.startupTime.getTime()) / 1000
      ),
      response_time_ms: 0,
      version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };
  }

  private async checkAPI(): Promise<DependencyCheck> {
    const startTime = Date.now();

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Don't include credentials for health checks
        credentials: "omit",
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status === "healthy" ? "healthy" : "degraded",
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
        };
      } else {
        return {
          status: "unhealthy",
          response_time_ms: responseTime,
          timestamp: new Date().toISOString(),
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
    } catch (error) {
      return {
        status: "unhealthy",
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  private async checkBuild(): Promise<DependencyCheck> {
    const startTime = Date.now();

    try {
      // Check if required environment variables are present
      const requiredEnvVars = ["NEXT_PUBLIC_API_URL"];

      const missingVars = requiredEnvVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingVars.length > 0) {
        return {
          status: "degraded",
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Missing environment variables: ${missingVars.join(", ")}`,
        };
      }

      return {
        status: "healthy",
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Build check failed",
      };
    }
  }

  private async checkEnvironment(): Promise<DependencyCheck> {
    const startTime = Date.now();

    try {
      // Check browser capabilities and environment
      const checks = {
        localStorage: typeof localStorage !== "undefined",
        sessionStorage: typeof sessionStorage !== "undefined",
        fetch: typeof fetch !== "undefined",
        webCrypto:
          typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
      };

      const failedChecks = Object.entries(checks)
        .filter(([_, supported]) => !supported)
        .map(([feature, _]) => feature);

      if (failedChecks.length > 0) {
        return {
          status: "degraded",
          response_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: `Unsupported features: ${failedChecks.join(", ")}`,
        };
      }

      return {
        status: "healthy",
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        response_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "Environment check failed",
      };
    }
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Health check timeout")), ms);
    });
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Export health check functions for use in API routes
export async function getHealthStatus(
  includeDetails: boolean = false
): Promise<HealthCheckResult> {
  return healthChecker.healthCheck(includeDetails);
}

export async function getReadinessStatus(): Promise<HealthCheckResult> {
  return healthChecker.readinessCheck();
}

export async function getLivenessStatus(): Promise<HealthCheckResult> {
  return healthChecker.livenessCheck();
}
