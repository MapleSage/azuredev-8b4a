/**
 * Specialist Configuration for SageInsure
 * Defines domain-specific knowledge bases, guardrails, and UI customizations
 */

export interface SpecialistConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: string[];
  guardrails: string[];
  knowledgeBase: string;
  promptTemplate: string;
  examples: string[];
  uiConfig: {
    placeholder: string;
    welcomeMessage: string;
    sourceDisplayFormat: "citations" | "inline" | "sidebar";
    showConfidence: boolean;
    showTokenUsage: boolean;
  };
}

export const SPECIALIST_CONFIGS: Record<string, SpecialistConfig> = {
  CLAIMS_CHAT: {
    id: "CLAIMS_CHAT",
    name: "Claims Processing",
    description:
      "Specialized in claim creation, status tracking, and settlement processes",
    icon: "📋",
    color: "#3B82F6",
    capabilities: [
      "Claim creation and validation",
      "Status tracking and updates",
      "Settlement calculations",
      "Document processing",
      "FNOL assistance",
    ],
    guardrails: [
      "No medical advice",
      "No legal advice",
      "Verify policy coverage before commitments",
      "Require proper documentation for claims",
    ],
    knowledgeBase: "claims-general-index",
    promptTemplate: `You are a claims processing specialist for SageInsure. 
    Focus on helping with claim creation, status tracking, and settlement processes.
    Always verify policy coverage and require proper documentation.
    Provide accurate information based on policy documents and claims procedures.`,
    examples: [
      "How do I file a new auto insurance claim?",
      "What documents are needed for a property damage claim?",
      "Check the status of claim #CLM-2024-001234",
      "Calculate settlement amount for total loss vehicle",
    ],
    uiConfig: {
      placeholder:
        "Ask about claims processing, status updates, or settlement calculations...",
      welcomeMessage:
        "Hi! I'm your Claims Processing specialist. I can help you file claims, check status, and understand settlement processes.",
      sourceDisplayFormat: "citations",
      showConfidence: true,
      showTokenUsage: false,
    },
  },

  UNDERWRITING: {
    id: "UNDERWRITING",
    name: "Underwriting",
    description:
      "Expert in risk assessment, policy evaluation, and ACORD forms",
    icon: "📊",
    color: "#10B981",
    capabilities: [
      "Risk assessment and scoring",
      "Policy evaluation and pricing",
      "ACORD form processing",
      "Regulatory compliance",
      "Market analysis",
    ],
    guardrails: [
      "No final underwriting decisions without human review",
      "Always consider regulatory compliance",
      "Document all risk factors",
      "Follow company underwriting guidelines",
    ],
    knowledgeBase: "underwriting-index",
    promptTemplate: `You are an underwriting specialist for SageInsure.
    Focus on risk assessment, policy evaluation, and ACORD forms.
    Analyze applications thoroughly and provide risk-based recommendations.
    Always consider regulatory compliance and document risk factors.`,
    examples: [
      "Assess risk for commercial property application",
      "Help complete ACORD 125 application",
      "What factors affect auto insurance pricing?",
      "Review underwriting guidelines for cyber insurance",
    ],
    uiConfig: {
      placeholder:
        "Ask about risk assessment, policy evaluation, or ACORD forms...",
      welcomeMessage:
        "Hello! I'm your Underwriting specialist. I can help with risk assessment, policy evaluation, and ACORD form processing.",
      sourceDisplayFormat: "sidebar",
      showConfidence: true,
      showTokenUsage: true,
    },
  },

  RESEARCH_ASSISTANT: {
    id: "RESEARCH_ASSISTANT",
    name: "Research Assistant",
    description:
      "Life science research with PubMed searches and clinical trials",
    icon: "🔬",
    color: "#8B5CF6",
    capabilities: [
      "PubMed literature searches",
      "Clinical trial analysis",
      "Drug discovery research",
      "Medical device evaluation",
      "Regulatory pathway guidance",
    ],
    guardrails: [
      "No medical advice",
      "Always cite sources",
      "Distinguish between research and clinical practice",
      "Verify publication credibility",
    ],
    knowledgeBase: "research-index",
    promptTemplate: `You are a life science research assistant for SageInsure.
    Focus on PubMed searches, clinical trials, and drug discovery.
    Provide evidence-based information with proper citations.
    Always distinguish between research findings and clinical practice.`,
    examples: [
      "Search PubMed for diabetes treatment studies",
      "Find clinical trials for cancer immunotherapy",
      "Research FDA approval pathway for medical devices",
      "Analyze safety data for new pharmaceutical",
    ],
    uiConfig: {
      placeholder:
        "Ask about research, clinical trials, or scientific literature...",
      welcomeMessage:
        "Greetings! I'm your Research Assistant. I can help with literature searches, clinical trial analysis, and scientific research.",
      sourceDisplayFormat: "citations",
      showConfidence: true,
      showTokenUsage: true,
    },
  },

  CYBER_INSURANCE: {
    id: "CYBER_INSURANCE",
    name: "Cyber Insurance",
    description:
      "Cyber risk assessment, breach analysis, and security evaluations",
    icon: "🛡️",
    color: "#EF4444",
    capabilities: [
      "Cyber risk assessment",
      "Breach impact analysis",
      "Security control evaluation",
      "Threat intelligence",
      "Compliance frameworks",
    ],
    guardrails: [
      "No specific security implementation advice",
      "Focus on insurance implications",
      "Consider regulatory requirements",
      "Assess business impact of cyber risks",
    ],
    knowledgeBase: "cyber-insurance-index",
    promptTemplate: `You are a cyber insurance specialist for SageInsure.
    Focus on cyber risk assessment, breach analysis, and security evaluations.
    Provide current threat intelligence and risk mitigation strategies.
    Always consider insurance implications and regulatory requirements.`,
    examples: [
      "Assess cyber risk for healthcare organization",
      "Analyze potential breach impact costs",
      "Review security controls for manufacturing company",
      "Understand GDPR compliance requirements",
    ],
    uiConfig: {
      placeholder:
        "Ask about cyber risks, breach analysis, or security assessments...",
      welcomeMessage:
        "Hi there! I'm your Cyber Insurance specialist. I can help assess cyber risks, analyze breaches, and evaluate security measures.",
      sourceDisplayFormat: "inline",
      showConfidence: true,
      showTokenUsage: false,
    },
  },

  FNOL_PROCESSOR: {
    id: "FNOL_PROCESSOR",
    name: "FNOL Processor",
    description: "First Notice of Loss processing and incident reporting",
    icon: "📞",
    color: "#F59E0B",
    capabilities: [
      "FNOL data collection",
      "Incident report processing",
      "Claim initiation",
      "Document validation",
      "Emergency response coordination",
    ],
    guardrails: [
      "Collect all required FNOL data",
      "No claim decisions",
      "Verify policy validity",
      "Ensure accurate incident documentation",
    ],
    knowledgeBase: "fnol-index",
    promptTemplate: `You are a First Notice of Loss processor for SageInsure.
    Focus on incident reporting, document processing, and claim initiation.
    Ensure all required information is collected accurately.
    Verify policy validity and guide through FNOL process.`,
    examples: [
      "Report a vehicle accident that just occurred",
      "File FNOL for property damage from storm",
      "What information is needed for FNOL?",
      "Process emergency claim notification",
    ],
    uiConfig: {
      placeholder: "Report an incident or ask about FNOL requirements...",
      welcomeMessage:
        "Hello! I'm your FNOL Processor. I can help you report incidents and initiate claims quickly and accurately.",
      sourceDisplayFormat: "inline",
      showConfidence: false,
      showTokenUsage: false,
    },
  },

  CLAIMS_LIFECYCLE: {
    id: "CLAIMS_LIFECYCLE",
    name: "Claims Lifecycle",
    description: "Workflow management, status tracking, and process automation",
    icon: "🔄",
    color: "#06B6D4",
    capabilities: [
      "Workflow management",
      "Status tracking",
      "Process automation",
      "Performance analytics",
      "Quality assurance",
    ],
    guardrails: [
      "Follow established workflows",
      "No manual overrides without approval",
      "Maintain audit trails",
      "Ensure process compliance",
    ],
    knowledgeBase: "claims-lifecycle-index",
    promptTemplate: `You are a claims lifecycle specialist for SageInsure.
    Focus on workflow management, status tracking, and process automation.
    Optimize claims processing efficiency while maintaining quality.
    Follow established workflows and maintain proper audit trails.`,
    examples: [
      "Track claim through entire lifecycle",
      "Optimize claims processing workflow",
      "Generate performance analytics report",
      "Identify bottlenecks in claims process",
    ],
    uiConfig: {
      placeholder:
        "Ask about workflow management, process optimization, or analytics...",
      welcomeMessage:
        "Hi! I'm your Claims Lifecycle specialist. I can help optimize workflows, track processes, and improve efficiency.",
      sourceDisplayFormat: "sidebar",
      showConfidence: true,
      showTokenUsage: true,
    },
  },

  POLICY_ASSISTANT: {
    id: "POLICY_ASSISTANT",
    name: "Policy Assistant",
    description:
      "24/7 policy guidance, coverage analysis, and customer support",
    icon: "📄",
    color: "#84CC16",
    capabilities: [
      "Policy lookup and analysis",
      "Coverage explanations",
      "Endorsement processing",
      "Premium calculations",
      "Customer service",
    ],
    guardrails: [
      "No policy modifications",
      "Refer complex issues to agents",
      "Verify customer identity for sensitive information",
      "Provide accurate policy information",
    ],
    knowledgeBase: "policy-index",
    promptTemplate: `You are a policy assistant for SageInsure providing 24/7 policy guidance.
    Focus on policy lookup, coverage analysis, and endorsements.
    Help customers understand their coverage clearly and accurately.
    Refer complex modifications to licensed agents.`,
    examples: [
      "Explain my auto insurance coverage",
      "What does my homeowners policy cover?",
      "How to add a driver to my policy?",
      "Calculate premium for coverage increase",
    ],
    uiConfig: {
      placeholder: "Ask about your policy, coverage, or endorsements...",
      welcomeMessage:
        "Welcome! I'm your Policy Assistant. I'm here 24/7 to help you understand your coverage and answer policy questions.",
      sourceDisplayFormat: "citations",
      showConfidence: false,
      showTokenUsage: false,
    },
  },
};

export const getSpecialistConfig = (specialistId: string): SpecialistConfig => {
  return (
    SPECIALIST_CONFIGS[specialistId] || SPECIALIST_CONFIGS.POLICY_ASSISTANT
  );
};

export const getAllSpecialists = (): SpecialistConfig[] => {
  return Object.values(SPECIALIST_CONFIGS);
};

export const getSpecialistByName = (
  name: string
): SpecialistConfig | undefined => {
  return Object.values(SPECIALIST_CONFIGS).find(
    (config) => config.name.toLowerCase() === name.toLowerCase()
  );
};
