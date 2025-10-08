/**
 * Intent Detection and Routing System
 * Advanced intent classification with confidence scoring and routing logic
 */

interface IntentPattern {
  keywords: string[];
  phrases: RegExp[];
  contextClues: string[];
  weight: number;
  requiredConfidence: number;
}

interface IntentResult {
  specialist: string;
  confidence: number;
  matchedPatterns: string[];
  reasoning: string;
  alternativeSpecialists: Array<{
    specialist: string;
    confidence: number;
  }>;
}

interface RoutingRule {
  condition: (query: string, context: any) => boolean;
  specialist: string;
  priority: number;
  description: string;
}

class IntentDetectionRouter {
  private static instance: IntentDetectionRouter;

  private readonly intentPatterns: Record<string, IntentPattern> = {
    CLAIMS_CHAT: {
      keywords: [
        "claim",
        "claims",
        "settlement",
        "damage",
        "accident",
        "incident",
        "collision",
        "theft",
        "vandalism",
        "fire",
        "flood",
        "storm",
        "adjuster",
        "estimate",
        "repair",
        "replacement",
        "deductible",
        "coverage",
        "liability",
        "comprehensive",
        "collision",
      ],
      phrases: [
        /file\s+a?\s*claim/gi,
        /claim\s+(number|status|update)/gi,
        /damage\s+(assessment|report)/gi,
        /accident\s+(report|happened|occurred)/gi,
        /settlement\s+(amount|offer|negotiation)/gi,
        /insurance\s+claim/gi,
        /total\s+loss/gi,
        /claim\s+denied/gi,
      ],
      contextClues: [
        "happened",
        "occurred",
        "damaged",
        "broken",
        "stolen",
        "hit",
        "crashed",
        "flooded",
        "burned",
        "vandalized",
        "injured",
      ],
      weight: 1.0,
      requiredConfidence: 0.7,
    },

    UNDERWRITING: {
      keywords: [
        "underwriting",
        "risk",
        "assessment",
        "application",
        "premium",
        "pricing",
        "acord",
        "form",
        "quote",
        "rate",
        "coverage",
        "eligibility",
        "approval",
        "decline",
        "bind",
        "policy",
        "exposure",
        "hazard",
        "peril",
        "actuarial",
      ],
      phrases: [
        /risk\s+(assessment|analysis|evaluation)/gi,
        /underwriting\s+(guidelines|decision|review)/gi,
        /acord\s+(form|application)/gi,
        /premium\s+(calculation|quote|rate)/gi,
        /coverage\s+(limits|options|types)/gi,
        /policy\s+(application|binding)/gi,
        /eligibility\s+(requirements|criteria)/gi,
      ],
      contextClues: [
        "apply",
        "application",
        "qualify",
        "eligible",
        "approve",
        "decline",
        "bind",
        "quote",
        "rate",
        "premium",
      ],
      weight: 1.0,
      requiredConfidence: 0.75,
    },

    RESEARCH_ASSISTANT: {
      keywords: [
        "research",
        "study",
        "clinical",
        "trial",
        "pubmed",
        "literature",
        "drug",
        "pharmaceutical",
        "medical",
        "device",
        "fda",
        "approval",
        "efficacy",
        "safety",
        "adverse",
        "events",
        "biomarker",
        "protocol",
        "endpoint",
        "placebo",
        "randomized",
      ],
      phrases: [
        /pubmed\s+search/gi,
        /clinical\s+(trial|study)/gi,
        /drug\s+(discovery|development)/gi,
        /fda\s+(approval|pathway)/gi,
        /literature\s+(review|search)/gi,
        /medical\s+(device|research)/gi,
        /safety\s+(data|profile)/gi,
        /efficacy\s+(study|data)/gi,
      ],
      contextClues: [
        "study",
        "research",
        "investigate",
        "analyze",
        "examine",
        "evaluate",
        "assess",
        "review",
        "compare",
      ],
      weight: 1.0,
      requiredConfidence: 0.8,
    },

    CYBER_INSURANCE: {
      keywords: [
        "cyber",
        "security",
        "breach",
        "hack",
        "malware",
        "ransomware",
        "phishing",
        "data",
        "privacy",
        "gdpr",
        "hipaa",
        "pci",
        "firewall",
        "encryption",
        "vulnerability",
        "threat",
        "incident",
        "response",
        "forensics",
        "recovery",
      ],
      phrases: [
        /cyber\s+(attack|breach|incident)/gi,
        /data\s+(breach|theft|loss)/gi,
        /security\s+(incident|breach|vulnerability)/gi,
        /ransomware\s+(attack|incident)/gi,
        /privacy\s+(violation|breach)/gi,
        /cyber\s+(insurance|coverage|risk)/gi,
        /information\s+security/gi,
      ],
      contextClues: [
        "hacked",
        "breached",
        "compromised",
        "infected",
        "attacked",
        "stolen",
        "leaked",
        "exposed",
        "vulnerable",
      ],
      weight: 1.0,
      requiredConfidence: 0.8,
    },

    FNOL_PROCESSOR: {
      keywords: [
        "fnol",
        "first",
        "notice",
        "loss",
        "report",
        "incident",
        "emergency",
        "urgent",
        "immediate",
        "just",
        "happened",
        "occurred",
        "now",
        "today",
        "recently",
        "minutes",
        "hours",
        "ago",
        "need",
        "help",
      ],
      phrases: [
        /first\s+notice\s+of\s+loss/gi,
        /just\s+(happened|occurred)/gi,
        /need\s+to\s+report/gi,
        /incident\s+(report|occurred)/gi,
        /emergency\s+(claim|report)/gi,
        /happened\s+(today|yesterday|this\s+morning)/gi,
        /urgent\s+(claim|report)/gi,
      ],
      contextClues: [
        "urgent",
        "emergency",
        "immediate",
        "now",
        "just",
        "happened",
        "occurred",
        "minutes",
        "hours",
        "today",
      ],
      weight: 1.2, // Higher weight for urgency
      requiredConfidence: 0.6,
    },

    CLAIMS_LIFECYCLE: {
      keywords: [
        "workflow",
        "process",
        "lifecycle",
        "status",
        "tracking",
        "stage",
        "phase",
        "progress",
        "automation",
        "assignment",
        "queue",
        "priority",
        "escalation",
        "sla",
        "performance",
        "metrics",
        "analytics",
        "dashboard",
        "reporting",
      ],
      phrases: [
        /claims?\s+(workflow|process|lifecycle)/gi,
        /status\s+(tracking|update|check)/gi,
        /process\s+(automation|optimization)/gi,
        /workflow\s+(management|stage)/gi,
        /performance\s+(metrics|analytics)/gi,
        /claims?\s+(queue|assignment)/gi,
      ],
      contextClues: [
        "track",
        "monitor",
        "manage",
        "optimize",
        "automate",
        "assign",
        "escalate",
        "prioritize",
        "analyze",
      ],
      weight: 0.9,
      requiredConfidence: 0.75,
    },

    POLICY_ASSISTANT: {
      keywords: [
        "policy",
        "coverage",
        "endorsement",
        "premium",
        "deductible",
        "limit",
        "exclusion",
        "renewal",
        "cancellation",
        "payment",
        "billing",
        "certificate",
        "id",
        "card",
        "document",
        "explanation",
        "understand",
        "mean",
        "cover",
      ],
      phrases: [
        /my\s+(policy|coverage)/gi,
        /what\s+(does|is)\s+(covered|my\s+policy)/gi,
        /policy\s+(renewal|cancellation|payment)/gi,
        /coverage\s+(limits|options|explanation)/gi,
        /add\s+(driver|vehicle|coverage)/gi,
        /premium\s+(payment|due|amount)/gi,
        /deductible\s+(amount|change)/gi,
      ],
      contextClues: [
        "my",
        "understand",
        "explain",
        "mean",
        "cover",
        "include",
        "exclude",
        "pay",
        "cost",
        "amount",
      ],
      weight: 0.8, // Lower weight as fallback
      requiredConfidence: 0.5,
    },
  };

  private readonly routingRules: RoutingRule[] = [
    {
      condition: (query: string) =>
        /emergency|urgent|immediate|now|just\s+happened/gi.test(query),
      specialist: "FNOL_PROCESSOR",
      priority: 10,
      description: "Emergency/urgent situations route to FNOL",
    },
    {
      condition: (query: string) =>
        /claim\s+number|claim\s+#|clm-\d+/gi.test(query),
      specialist: "CLAIMS_CHAT",
      priority: 9,
      description: "Specific claim numbers route to Claims",
    },
    {
      condition: (query: string) => /acord\s+(form|\d+)/gi.test(query),
      specialist: "UNDERWRITING",
      priority: 8,
      description: "ACORD forms route to Underwriting",
    },
    {
      condition: (query: string) => /pubmed|clinical\s+trial|fda/gi.test(query),
      specialist: "RESEARCH_ASSISTANT",
      priority: 8,
      description: "Research terms route to Research Assistant",
    },
    {
      condition: (query: string) =>
        /cyber|breach|hack|malware|ransomware/gi.test(query),
      specialist: "CYBER_INSURANCE",
      priority: 7,
      description: "Cyber security terms route to Cyber Insurance",
    },
  ];

  private constructor() {}

  static getInstance(): IntentDetectionRouter {
    if (!IntentDetectionRouter.instance) {
      IntentDetectionRouter.instance = new IntentDetectionRouter();
    }
    return IntentDetectionRouter.instance;
  }

  /**
   * Detect intent and route to appropriate specialist
   */
  detectIntent(
    query: string,
    conversationHistory: Array<{ content: string; specialist?: string }> = [],
    currentSpecialist?: string
  ): IntentResult {
    const normalizedQuery = query.toLowerCase().trim();

    // Check routing rules first (highest priority)
    const routingRule = this.checkRoutingRules(query);
    if (routingRule) {
      return {
        specialist: routingRule.specialist,
        confidence: 0.95,
        matchedPatterns: [routingRule.description],
        reasoning: `Matched high-priority routing rule: ${routingRule.description}`,
        alternativeSpecialists: [],
      };
    }

    // Calculate scores for each specialist
    const scores: Record<
      string,
      {
        score: number;
        matchedPatterns: string[];
        details: string[];
      }
    > = {};

    for (const [specialist, pattern] of Object.entries(this.intentPatterns)) {
      const result = this.calculateSpecialistScore(
        normalizedQuery,
        pattern,
        conversationHistory
      );
      scores[specialist] = result;
    }

    // Apply context boost if user is already in a specialist conversation
    if (currentSpecialist && scores[currentSpecialist]) {
      scores[currentSpecialist].score *= 1.2; // 20% boost for current specialist
      scores[currentSpecialist].details.push(
        "Context boost for current specialist"
      );
    }

    // Sort specialists by score
    const sortedSpecialists = Object.entries(scores)
      .map(([specialist, data]) => ({
        specialist,
        confidence: Math.min(data.score, 1.0),
        matchedPatterns: data.matchedPatterns,
        details: data.details,
      }))
      .sort((a, b) => b.confidence - a.confidence);

    const topSpecialist = sortedSpecialists[0];
    const alternatives = sortedSpecialists.slice(1, 4).map((s) => ({
      specialist: s.specialist,
      confidence: s.confidence,
    }));

    // Check if confidence meets threshold
    const pattern = this.intentPatterns[topSpecialist.specialist];
    if (topSpecialist.confidence < pattern.requiredConfidence) {
      // Fall back to Policy Assistant for low confidence
      return {
        specialist: "POLICY_ASSISTANT",
        confidence: 0.6,
        matchedPatterns: ["Low confidence fallback"],
        reasoning: `Low confidence (${topSpecialist.confidence.toFixed(2)}) for ${topSpecialist.specialist}, routing to Policy Assistant`,
        alternativeSpecialists: alternatives,
      };
    }

    return {
      specialist: topSpecialist.specialist,
      confidence: topSpecialist.confidence,
      matchedPatterns: topSpecialist.matchedPatterns,
      reasoning: this.buildReasoning(topSpecialist),
      alternativeSpecialists: alternatives,
    };
  }

  /**
   * Get routing confidence for a specific specialist
   */
  getRoutingConfidence(query: string, specialist: string): number {
    const pattern = this.intentPatterns[specialist];
    if (!pattern) return 0;

    const result = this.calculateSpecialistScore(
      query.toLowerCase(),
      pattern,
      []
    );
    return Math.min(result.score, 1.0);
  }

  /**
   * Get all available specialists with their descriptions
   */
  getAvailableSpecialists(): Array<{
    id: string;
    name: string;
    keywords: string[];
    confidence_threshold: number;
  }> {
    const specialistNames: Record<string, string> = {
      CLAIMS_CHAT: "Claims Processing",
      UNDERWRITING: "Underwriting",
      RESEARCH_ASSISTANT: "Research Assistant",
      CYBER_INSURANCE: "Cyber Insurance",
      FNOL_PROCESSOR: "FNOL Processor",
      CLAIMS_LIFECYCLE: "Claims Lifecycle",
      POLICY_ASSISTANT: "Policy Assistant",
    };

    return Object.entries(this.intentPatterns).map(([id, pattern]) => ({
      id,
      name: specialistNames[id] || id,
      keywords: pattern.keywords.slice(0, 10), // Top 10 keywords
      confidence_threshold: pattern.requiredConfidence,
    }));
  }

  // Private helper methods

  private checkRoutingRules(query: string): RoutingRule | null {
    const applicableRules = this.routingRules
      .filter((rule) => rule.condition(query, {}))
      .sort((a, b) => b.priority - a.priority);

    return applicableRules[0] || null;
  }

  private calculateSpecialistScore(
    query: string,
    pattern: IntentPattern,
    conversationHistory: Array<{ content: string; specialist?: string }>
  ): { score: number; matchedPatterns: string[]; details: string[] } {
    let score = 0;
    const matchedPatterns: string[] = [];
    const details: string[] = [];

    // Keyword matching
    const keywordMatches = pattern.keywords.filter((keyword) =>
      query.includes(keyword.toLowerCase())
    );

    if (keywordMatches.length > 0) {
      const keywordScore =
        (keywordMatches.length / pattern.keywords.length) * 0.4;
      score += keywordScore;
      matchedPatterns.push(`Keywords: ${keywordMatches.join(", ")}`);
      details.push(`Matched ${keywordMatches.length} keywords`);
    }

    // Phrase matching
    const phraseMatches = pattern.phrases.filter((phrase) =>
      phrase.test(query)
    );
    if (phraseMatches.length > 0) {
      const phraseScore = Math.min(phraseMatches.length * 0.3, 0.6);
      score += phraseScore;
      matchedPatterns.push(`Phrases: ${phraseMatches.length} matches`);
      details.push(`Matched ${phraseMatches.length} phrase patterns`);
    }

    // Context clue matching
    const contextMatches = pattern.contextClues.filter((clue) =>
      query.includes(clue.toLowerCase())
    );

    if (contextMatches.length > 0) {
      const contextScore =
        (contextMatches.length / pattern.contextClues.length) * 0.2;
      score += contextScore;
      matchedPatterns.push(`Context: ${contextMatches.join(", ")}`);
      details.push(`Matched ${contextMatches.length} context clues`);
    }

    // Conversation history boost
    const historyBoost = this.calculateHistoryBoost(
      conversationHistory,
      pattern
    );
    if (historyBoost > 0) {
      score += historyBoost;
      details.push(`History boost: +${historyBoost.toFixed(2)}`);
    }

    // Apply pattern weight
    score *= pattern.weight;

    return { score, matchedPatterns, details };
  }

  private calculateHistoryBoost(
    history: Array<{ content: string; specialist?: string }>,
    pattern: IntentPattern
  ): number {
    if (history.length === 0) return 0;

    const recentMessages = history.slice(-3); // Last 3 messages
    let boost = 0;

    for (const message of recentMessages) {
      const messageKeywords = pattern.keywords.filter((keyword) =>
        message.content.toLowerCase().includes(keyword.toLowerCase())
      );

      if (messageKeywords.length > 0) {
        boost += 0.1; // Small boost for related conversation history
      }
    }

    return Math.min(boost, 0.3); // Cap at 0.3
  }

  private buildReasoning(result: {
    specialist: string;
    confidence: number;
    matchedPatterns: string[];
    details: string[];
  }): string {
    const specialistNames: Record<string, string> = {
      CLAIMS_CHAT: "Claims Processing",
      UNDERWRITING: "Underwriting",
      RESEARCH_ASSISTANT: "Research Assistant",
      CYBER_INSURANCE: "Cyber Insurance",
      FNOL_PROCESSOR: "FNOL Processor",
      CLAIMS_LIFECYCLE: "Claims Lifecycle",
      POLICY_ASSISTANT: "Policy Assistant",
    };

    const name = specialistNames[result.specialist] || result.specialist;
    const confidencePercent = (result.confidence * 100).toFixed(1);

    return `Routed to ${name} with ${confidencePercent}% confidence. ${result.details.join(", ")}.`;
  }
}

export default IntentDetectionRouter;
export type { IntentResult, RoutingRule };
