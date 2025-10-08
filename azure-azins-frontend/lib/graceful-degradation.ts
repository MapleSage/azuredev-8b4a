/**
 * Graceful Degradation Handler
 * Provides fallback functionality when Azure services are unavailable
 */

import MonitoringSystem from "./monitoring-system";

interface FallbackResponse {
  response: string;
  specialist: string;
  sources: Array<any>;
  confidence: number;
  tokens_used: number;
  timestamp: string;
  fallback_used: boolean;
  fallback_reason: string;
}

interface ServiceStatus {
  available: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
}

class GracefulDegradationHandler {
  private static instance: GracefulDegradationHandler;
  private monitoring: MonitoringSystem;
  private serviceStatus: Map<string, ServiceStatus> = new Map();
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  private constructor() {
    this.monitoring = MonitoringSystem.getInstance();
    this.initializeServiceStatus();
  }

  static getInstance(): GracefulDegradationHandler {
    if (!GracefulDegradationHandler.instance) {
      GracefulDegradationHandler.instance = new GracefulDegradationHandler();
    }
    return GracefulDegradationHandler.instance;
  }

  private initializeServiceStatus(): void {
    const services = ["azure-fastapi", "azure-search", "azure-openai"];
    services.forEach((service) => {
      this.serviceStatus.set(service, {
        available: true,
        lastCheck: new Date(),
        consecutiveFailures: 0,
      });
    });
  }

  /**
   * Check if a service is available (circuit breaker pattern)
   */
  isServiceAvailable(service: string): boolean {
    const status = this.serviceStatus.get(service);
    if (!status) return true;

    // If service has failed too many times, check if timeout has passed
    if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastCheck = Date.now() - status.lastCheck.getTime();
      if (timeSinceLastCheck < this.CIRCUIT_BREAKER_TIMEOUT) {
        return false; // Circuit breaker is open
      } else {
        // Reset and try again
        status.consecutiveFailures = 0;
        status.available = true;
      }
    }

    return status.available;
  }

  /**
   * Record service failure
   */
  recordServiceFailure(service: string): void {
    const status = this.serviceStatus.get(service);
    if (status) {
      status.consecutiveFailures++;
      status.lastCheck = new Date();

      if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        status.available = false;
        this.monitoring.logError(
          "circuit-breaker",
          `Circuit breaker opened for ${service} after ${status.consecutiveFailures} failures`
        );
      }
    }
  }

  /**
   * Record service success
   */
  recordServiceSuccess(service: string): void {
    const status = this.serviceStatus.get(service);
    if (status) {
      status.consecutiveFailures = 0;
      status.available = true;
      status.lastCheck = new Date();
    }
  }

  /**
   * Handle Azure FastAPI fallback
   */
  async handleAzureFastAPIFallback(
    query: string,
    specialist: string,
    conversationId: string
  ): Promise<FallbackResponse> {
    this.monitoring.logError(
      "azure-fastapi-fallback",
      `Using fallback for Azure FastAPI - specialist: ${specialist}`
    );

    // Try local rule-based responses first
    const ruleBasedResponse = this.generateRuleBasedResponse(query, specialist);
    if (ruleBasedResponse) {
      return {
        response: ruleBasedResponse,
        specialist,
        sources: [],
        confidence: 0.4,
        tokens_used: 0,
        timestamp: new Date().toISOString(),
        fallback_used: true,
        fallback_reason:
          "Azure FastAPI unavailable - using rule-based fallback",
      };
    }

    // Fallback to generic responses
    return {
      response: this.generateGenericFallback(specialist),
      specialist,
      sources: [],
      confidence: 0.2,
      tokens_used: 0,
      timestamp: new Date().toISOString(),
      fallback_used: true,
      fallback_reason: "Azure FastAPI unavailable - using generic fallback",
    };
  }

  /**
   * Generate rule-based responses for common queries
   */
  private generateRuleBasedResponse(
    query: string,
    specialist: string
  ): string | null {
    const lowerQuery = query.toLowerCase();

    const ruleBasedResponses: Record<string, Record<string, string[]>> = {
      CLAIMS_CHAT: {
        "file claim": [
          "To file a claim, you'll need to provide: 1) Policy number, 2) Date and time of incident, 3) Description of what happened, 4) Photos if available, 5) Police report number (if applicable). You can file online, by phone, or through our mobile app.",
          "I can help you start the claims process. Please gather your policy information, incident details, and any supporting documentation. Contact our claims department at 1-800-CLAIMS for immediate assistance.",
        ],
        "claim status": [
          "To check your claim status, you'll need your claim number. You can check online through your account portal, call our claims hotline, or use our mobile app. Claims typically take 3-10 business days to process depending on complexity.",
          "For claim status updates, please have your claim number ready and contact our claims department. We'll provide you with the current status and next steps.",
        ],
        damage: [
          "For damage claims, document everything with photos, get repair estimates, and don't make permanent repairs until we've inspected the damage (unless it's an emergency). Contact us immediately to report the damage.",
          "When reporting damage, please provide detailed photos, a description of how the damage occurred, and any relevant documentation. Our adjusters will guide you through the next steps.",
        ],
      },

      UNDERWRITING: {
        "risk assessment": [
          "Risk assessment involves evaluating factors like location, property type, claims history, and coverage needs. We use actuarial data and industry standards to determine appropriate coverage and pricing.",
          "Our underwriting process considers multiple risk factors to provide you with appropriate coverage. Each application is reviewed individually based on specific risk characteristics.",
        ],
        acord: [
          "ACORD forms are industry-standard applications used for insurance. Common forms include ACORD 125 (Commercial Application) and ACORD 126 (Personal Lines Application). These forms help us gather necessary information for underwriting.",
          "ACORD forms standardize the application process across the insurance industry. Please complete all sections accurately to ensure proper evaluation of your application.",
        ],
        premium: [
          "Premium calculations are based on risk factors, coverage limits, deductibles, and claims history. We use actuarial models to determine fair and competitive pricing for your specific situation.",
          "Your premium is calculated based on various factors including coverage type, limits, location, and risk profile. We strive to provide competitive rates while maintaining adequate coverage.",
        ],
      },

      POLICY_ASSISTANT: {
        coverage: [
          "Your policy coverage depends on the specific type of insurance and policy terms. Common coverages include liability, comprehensive, collision, and various optional coverages. Please refer to your policy documents for specific details.",
          "Coverage varies by policy type and the options you've selected. I recommend reviewing your policy declarations page and coverage summary for specific information about what's included.",
        ],
        deductible: [
          "Your deductible is the amount you pay out-of-pocket before insurance coverage begins. Higher deductibles typically result in lower premiums. You can usually adjust your deductible at renewal.",
          "Deductibles vary by coverage type and can often be customized to fit your budget. Contact your agent to discuss deductible options and how they affect your premium.",
        ],
        "premium payment": [
          "Premium payments can typically be made online, by phone, by mail, or through automatic bank draft. Most insurers offer monthly, quarterly, semi-annual, or annual payment options.",
          "You can pay your premium through various methods including online payments, automatic withdrawal, phone payments, or mailing a check. Contact customer service for specific payment options.",
        ],
      },

      CYBER_INSURANCE: {
        "data breach": [
          "In case of a data breach, immediately contact our cyber claims hotline, preserve evidence, don't delete anything, notify law enforcement if required, and follow your incident response plan. We'll guide you through the process.",
          "Data breach response requires immediate action: secure systems, assess the scope, notify stakeholders, and contact us immediately. Our cyber specialists will help coordinate the response.",
        ],
        "cyber risk": [
          "Cyber risks include data breaches, ransomware, business interruption, and regulatory fines. We assess your security controls, data handling practices, and industry-specific risks to provide appropriate coverage.",
          "Cyber risk assessment considers your industry, data types, security measures, and potential exposure. We work with you to identify vulnerabilities and provide comprehensive coverage.",
        ],
      },

      FNOL_PROCESSOR: {
        emergency: [
          "For emergencies, call 911 first if there are injuries or immediate danger. Then contact our 24/7 emergency claims line at 1-800-EMERGENCY. We'll guide you through immediate steps and claim reporting.",
          "In emergency situations, ensure safety first, then contact emergency services if needed. Call our emergency hotline immediately to report the incident and get guidance on next steps.",
        ],
        "incident report": [
          "To report an incident, provide: date/time, location, description of what happened, parties involved, witnesses, photos if safe to take, and police report number if applicable. Call our FNOL hotline immediately.",
          "When reporting an incident, gather as much information as possible while ensuring safety. Our FNOL specialists will walk you through the reporting process step by step.",
        ],
      },
    };

    const specialistResponses = ruleBasedResponses[specialist];
    if (!specialistResponses) return null;

    // Find matching response category
    for (const [category, responses] of Object.entries(specialistResponses)) {
      if (lowerQuery.includes(category)) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    return null;
  }

  /**
   * Generate generic fallback responses
   */
  private generateGenericFallback(specialist: string): string {
    const genericResponses: Record<string, string[]> = {
      CLAIMS_CHAT: [
        "I'm currently experiencing technical difficulties accessing our claims system. For immediate claims assistance, please contact our claims department directly at 1-800-CLAIMS or visit our website.",
        "Our claims processing system is temporarily unavailable. Please call our 24/7 claims hotline for immediate assistance with your claim needs.",
      ],

      UNDERWRITING: [
        "I'm unable to access our underwriting systems at the moment. Please contact your agent or our underwriting department directly for assistance with your application or policy questions.",
        "Our underwriting resources are currently offline. For immediate assistance with applications or risk assessments, please reach out to our underwriting team directly.",
      ],

      RESEARCH_ASSISTANT: [
        "I'm experiencing connectivity issues with our research databases. For immediate research assistance, please contact our research team directly or try again in a few minutes.",
        "Our research systems are temporarily unavailable. Please check back shortly or contact our research specialists for immediate assistance.",
      ],

      CYBER_INSURANCE: [
        "I'm currently unable to access our cyber insurance resources. For urgent cyber security matters, please contact our specialized cyber team immediately.",
        "Our cyber insurance systems are temporarily offline. For immediate cyber incident response, please call our emergency cyber hotline.",
      ],

      FNOL_PROCESSOR: [
        "I cannot access our FNOL system right now. For immediate incident reporting, please call our emergency claims line at 1-800-EMERGENCY.",
        "Our FNOL processing system is currently down. Please call our emergency hotline immediately to report your incident.",
      ],

      CLAIMS_LIFECYCLE: [
        "I'm unable to access our claims tracking system at the moment. Please contact your claims adjuster directly for status updates.",
        "Our claims lifecycle system is temporarily offline. Please call our claims department for current status information.",
      ],

      POLICY_ASSISTANT: [
        "I'm experiencing technical difficulties accessing policy information. Please contact customer service at 1-800-POLICY for immediate assistance.",
        "Our policy systems are temporarily unavailable. For immediate policy questions, please call our customer service line.",
      ],
    };

    const responses =
      genericResponses[specialist] || genericResponses.POLICY_ASSISTANT;
    const selectedResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return `${selectedResponse}\n\nI apologize for the inconvenience. Our systems will be back online shortly. In the meantime, our customer service team is available to assist you.`;
  }

  /**
   * Handle intent detection fallback
   */
  handleIntentDetectionFallback(query: string): string {
    // Simple keyword-based fallback routing
    const keywordMap: Record<string, string> = {
      claim: "CLAIMS_CHAT",
      damage: "CLAIMS_CHAT",
      accident: "CLAIMS_CHAT",
      settlement: "CLAIMS_CHAT",
      risk: "UNDERWRITING",
      underwriting: "UNDERWRITING",
      acord: "UNDERWRITING",
      premium: "UNDERWRITING",
      research: "RESEARCH_ASSISTANT",
      study: "RESEARCH_ASSISTANT",
      clinical: "RESEARCH_ASSISTANT",
      pubmed: "RESEARCH_ASSISTANT",
      cyber: "CYBER_INSURANCE",
      breach: "CYBER_INSURANCE",
      hack: "CYBER_INSURANCE",
      security: "CYBER_INSURANCE",
      emergency: "FNOL_PROCESSOR",
      incident: "FNOL_PROCESSOR",
      fnol: "FNOL_PROCESSOR",
      workflow: "CLAIMS_LIFECYCLE",
      process: "CLAIMS_LIFECYCLE",
      tracking: "CLAIMS_LIFECYCLE",
      policy: "POLICY_ASSISTANT",
      coverage: "POLICY_ASSISTANT",
    };

    const lowerQuery = query.toLowerCase();

    for (const [keyword, specialist] of Object.entries(keywordMap)) {
      if (lowerQuery.includes(keyword)) {
        this.monitoring.logError(
          "intent-fallback",
          `Using keyword-based fallback routing: ${keyword} -> ${specialist}`
        );
        return specialist;
      }
    }

    // Default fallback
    this.monitoring.logError(
      "intent-fallback",
      "No keyword match found, using default POLICY_ASSISTANT"
    );
    return "POLICY_ASSISTANT";
  }

  /**
   * Get service status summary
   */
  getServiceStatusSummary(): Record<
    string,
    {
      available: boolean;
      consecutiveFailures: number;
      circuitBreakerOpen: boolean;
    }
  > {
    const summary: Record<string, any> = {};

    this.serviceStatus.forEach((status, service) => {
      summary[service] = {
        available: status.available,
        consecutiveFailures: status.consecutiveFailures,
        circuitBreakerOpen:
          status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES,
      };
    });

    return summary;
  }

  /**
   * Reset circuit breaker for a service
   */
  resetCircuitBreaker(service: string): void {
    const status = this.serviceStatus.get(service);
    if (status) {
      status.consecutiveFailures = 0;
      status.available = true;
      status.lastCheck = new Date();

      this.monitoring.logError(
        "circuit-breaker",
        `Circuit breaker manually reset for ${service}`
      );
    }
  }

  /**
   * Check if system is in degraded mode
   */
  isSystemDegraded(): boolean {
    let degradedServices = 0;

    for (const status of this.serviceStatus.values()) {
      if (!status.available || status.consecutiveFailures > 0) {
        degradedServices++;
      }
    }

    return degradedServices > 0;
  }

  /**
   * Get degradation level (0-1, where 1 is fully degraded)
   */
  getDegradationLevel(): number {
    const totalServices = this.serviceStatus.size;
    let degradedServices = 0;

    for (const status of this.serviceStatus.values()) {
      if (!status.available) {
        degradedServices++;
      }
    }

    return totalServices > 0 ? degradedServices / totalServices : 0;
  }
}

export default GracefulDegradationHandler;
export type { FallbackResponse, ServiceStatus };
