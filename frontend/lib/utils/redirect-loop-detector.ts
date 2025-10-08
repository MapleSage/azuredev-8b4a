/**
 * Redirect Loop Detection Utility
 *
 * This utility helps prevent infinite redirect loops during authentication
 * by tracking authentication attempts and detecting when too many attempts
 * have been made in a short time period.
 */

export interface RedirectLoopDetectorConfig {
  maxAttempts: number;
  timeWindowMs: number;
  storageKey: string;
  enableLogging: boolean;
}

export interface AuthAttempt {
  timestamp: number;
  url: string;
  userAgent: string;
  sessionId: string;
}

export interface RedirectLoopDetectorState {
  attempts: AuthAttempt[];
  isLoopDetected: boolean;
  lastResetTime: number;
  sessionId: string;
}

export class RedirectLoopDetector {
  private config: RedirectLoopDetectorConfig;
  private sessionId: string;

  constructor(config?: Partial<RedirectLoopDetectorConfig>) {
    this.config = {
      maxAttempts: 8, // Increased from 5 to be less aggressive
      timeWindowMs: 10 * 60 * 1000, // Increased to 10 minutes
      storageKey: "msal_redirect_loop_detector",
      enableLogging: process.env.NODE_ENV === "development",
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.log("RedirectLoopDetector initialized", { config: this.config });
  }

  /**
   * Track a new authentication attempt
   */
  trackAuthAttempt(url?: string): void {
    if (!this.isBrowser()) {
      return;
    }

    const attempt: AuthAttempt = {
      timestamp: Date.now(),
      url: url || (typeof window !== "undefined" ? window.location.href : ""),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      sessionId: this.sessionId,
    };

    const state = this.getState();
    state.attempts.push(attempt);

    // Clean up old attempts outside the time window
    const cutoffTime = Date.now() - this.config.timeWindowMs;
    state.attempts = state.attempts.filter((a) => a.timestamp > cutoffTime);

    // Check if loop is detected
    state.isLoopDetected = this.detectLoop(state.attempts);

    this.setState(state);

    this.log("Auth attempt tracked", {
      attempt,
      totalAttempts: state.attempts.length,
      isLoopDetected: state.isLoopDetected,
    });
  }

  /**
   * Check if a redirect loop has been detected
   */
  isLoopDetected(): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    const state = this.getState();
    return state.isLoopDetected;
  }

  /**
   * Get the current number of authentication attempts
   */
  getAttemptCount(): number {
    if (!this.isBrowser()) {
      return 0;
    }

    const state = this.getState();
    const cutoffTime = Date.now() - this.config.timeWindowMs;
    return state.attempts.filter((a) => a.timestamp > cutoffTime).length;
  }

  /**
   * Get all authentication attempts within the time window
   */
  getAttempts(): AuthAttempt[] {
    if (!this.isBrowser()) {
      return [];
    }

    const state = this.getState();
    const cutoffTime = Date.now() - this.config.timeWindowMs;
    return state.attempts.filter((a) => a.timestamp > cutoffTime);
  }

  /**
   * Clear all tracking data and reset the detector
   */
  clearTrackingData(): void {
    if (!this.isBrowser()) {
      return;
    }

    const state: RedirectLoopDetectorState = {
      attempts: [],
      isLoopDetected: false,
      lastResetTime: Date.now(),
      sessionId: this.sessionId,
    };

    this.setState(state);
    this.log("Tracking data cleared");
  }

  /**
   * Clear old attempts that are outside the time window
   */
  cleanupOldAttempts(): void {
    if (!this.isBrowser()) {
      return;
    }

    const state = this.getState();
    const cutoffTime = Date.now() - this.config.timeWindowMs;
    const oldCount = state.attempts.length;

    state.attempts = state.attempts.filter((a) => a.timestamp > cutoffTime);

    // If we removed attempts and no longer have a loop, reset the flag
    if (
      state.attempts.length < this.config.maxAttempts &&
      state.isLoopDetected
    ) {
      state.isLoopDetected = false;
    }

    if (oldCount !== state.attempts.length) {
      this.setState(state);
      this.log("Cleaned up old attempts", {
        removed: oldCount - state.attempts.length,
        remaining: state.attempts.length,
      });
    }
  }

  /**
   * Reset the loop detection flag while keeping attempt history
   */
  resetLoopDetection(): void {
    if (!this.isBrowser()) {
      return;
    }

    const state = this.getState();
    state.isLoopDetected = false;
    state.lastResetTime = Date.now();

    this.setState(state);
    this.log("Loop detection reset");
  }

  /**
   * Get time until the oldest attempt expires (in milliseconds)
   */
  getTimeUntilReset(): number {
    if (!this.isBrowser()) {
      return 0;
    }

    const attempts = this.getAttempts();
    if (attempts.length === 0) {
      return 0;
    }

    const oldestAttempt = Math.min(...attempts.map((a) => a.timestamp));
    const expiryTime = oldestAttempt + this.config.timeWindowMs;
    return Math.max(0, expiryTime - Date.now());
  }

  /**
   * Check if the detector should be bypassed (for testing or emergency access)
   */
  shouldBypass(): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    // Check for bypass flag in URL parameters
    if (typeof window !== "undefined" && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has("bypass_loop_detection");
    }

    return false;
  }

  /**
   * Get diagnostic information about the current state
   */
  getDiagnostics(): {
    config: RedirectLoopDetectorConfig;
    state: RedirectLoopDetectorState;
    timeUntilReset: number;
    shouldBypass: boolean;
  } {
    return {
      config: this.config,
      state: this.getState(),
      timeUntilReset: this.getTimeUntilReset(),
      shouldBypass: this.shouldBypass(),
    };
  }

  /**
   * Detect if a loop pattern exists in the attempts
   */
  private detectLoop(attempts: AuthAttempt[]): boolean {
    // Simple detection: too many attempts in time window
    if (attempts.length >= this.config.maxAttempts) {
      return true;
    }

    // Advanced detection: rapid successive attempts
    if (attempts.length >= 3) {
      const recentAttempts = attempts.slice(-3);
      const timeDiffs = [];

      for (let i = 1; i < recentAttempts.length; i++) {
        timeDiffs.push(
          recentAttempts[i].timestamp - recentAttempts[i - 1].timestamp
        );
      }

      // If all recent attempts are within 10 seconds of each other, it's likely a loop
      const rapidThreshold = 10 * 1000; // 10 seconds
      if (timeDiffs.every((diff) => diff < rapidThreshold)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the current state from session storage
   */
  private getState(): RedirectLoopDetectorState {
    if (!this.isBrowser()) {
      return this.getDefaultState();
    }

    try {
      const stored = sessionStorage.getItem(this.config.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Validate the stored data structure
        if (this.isValidState(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      this.log("Error reading state from storage", error);
    }

    return this.getDefaultState();
  }

  /**
   * Save the current state to session storage
   */
  private setState(state: RedirectLoopDetectorState): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      sessionStorage.setItem(this.config.storageKey, JSON.stringify(state));
    } catch (error) {
      this.log("Error saving state to storage", error);
    }
  }

  /**
   * Get the default state
   */
  private getDefaultState(): RedirectLoopDetectorState {
    return {
      attempts: [],
      isLoopDetected: false,
      lastResetTime: Date.now(),
      sessionId: this.sessionId,
    };
  }

  /**
   * Validate that the stored state has the correct structure
   */
  private isValidState(state: any): state is RedirectLoopDetectorState {
    return (
      state &&
      typeof state === "object" &&
      Array.isArray(state.attempts) &&
      typeof state.isLoopDetected === "boolean" &&
      typeof state.lastResetTime === "number" &&
      typeof state.sessionId === "string"
    );
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if running in browser environment
   */
  private isBrowser(): boolean {
    return (
      typeof window !== "undefined" && typeof sessionStorage !== "undefined"
    );
  }

  /**
   * Log messages if logging is enabled
   */
  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[RedirectLoopDetector] ${message}`, data || "");
    }
  }
}

/**
 * Create a singleton instance of the redirect loop detector
 */
let detectorInstance: RedirectLoopDetector | null = null;

export const getRedirectLoopDetector = (
  config?: Partial<RedirectLoopDetectorConfig>
): RedirectLoopDetector => {
  if (!detectorInstance) {
    detectorInstance = new RedirectLoopDetector(config);
  }
  return detectorInstance;
};

/**
 * Reset the singleton instance (useful for testing)
 */
export const resetRedirectLoopDetector = (): void => {
  detectorInstance = null;
};

/**
 * Convenience function to check if a loop is detected
 */
export const isRedirectLoopDetected = (): boolean => {
  const detector = getRedirectLoopDetector();
  return detector.isLoopDetected();
};

/**
 * Convenience function to track an authentication attempt
 */
export const trackAuthAttempt = (url?: string): void => {
  const detector = getRedirectLoopDetector();
  detector.trackAuthAttempt(url);
};

/**
 * Convenience function to clear tracking data
 */
export const clearRedirectLoopData = (): void => {
  const detector = getRedirectLoopDetector();
  detector.clearTrackingData();
};
