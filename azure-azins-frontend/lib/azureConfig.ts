export interface AzureConfig {
  openaiEndpoint: string;
  searchEndpoint: string;
  openaiApiKey: string;
  searchApiKey: string;
  deployment: string;
  apiVersion: string;
}

export interface SpecialistConfig {
  indexName: string;
  semanticConfig: string;
  fields: string[];
  facets: string[];
  systemPrompt: string;
  searchFilters?: string;
  maxResults?: number;
}

export class AzureConfigManager {
  private static instance: AzureConfigManager;
  private config: AzureConfig;
  private specialistConfigs: Record<string, SpecialistConfig>;

  private constructor() {
    this.config = {
      openaiEndpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      searchEndpoint: process.env.AZURE_SEARCH_ENDPOINT!,
      openaiApiKey: process.env.AZURE_OPENAI_KEY!,
      searchApiKey: process.env.AZURE_SEARCH_KEY!,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o",
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-11-20",
    };

    this.specialistConfigs = {
      CLAIMS_CHAT: {
        indexName: "general-insurance-index",
        semanticConfig: "general-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "claim_amount",
          "claim_type",
          "status",
        ],
        facets: ["document_type", "claim_type", "status"],
        systemPrompt: `You are a claims processing expert specializing in general insurance claims. Help with:
- Claim filing and documentation
- Damage assessment procedures
- Settlement negotiations
- Claim status inquiries
- Policy coverage verification

Provide clear, actionable guidance based on policy terms and industry standards. Always reference specific policy sections when applicable.`,
        maxResults: 5,
      },

      UNDERWRITING: {
        indexName: "underwriting-index",
        semanticConfig: "underwriting-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "risk_level",
          "premium",
          "coverage_type",
          "underwriting_guidelines",
        ],
        facets: ["document_type", "risk_level", "coverage_type"],
        systemPrompt: `You are an underwriting specialist with expertise in risk assessment and policy pricing. Help with:
- Risk factor analysis
- Coverage requirement assessment
- Application review and evaluation
- Premium calculations
- Underwriting guidelines interpretation
- Reinsurance considerations

Use actuarial data and risk assessment methodologies. Provide detailed explanations of underwriting decisions.`,
        maxResults: 7,
      },

      RESEARCH_ASSISTANT: {
        indexName: "research-index",
        semanticConfig: "research-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "study_type",
          "publication_date",
          "authors",
          "journal",
        ],
        facets: ["document_type", "study_type", "publication_date"],
        systemPrompt: `You are a life science research assistant specializing in biomedical research. Help with:
- Drug discovery and development
- Clinical trial design and analysis
- Biomedical literature review
- Research methodology guidance
- Regulatory compliance
- Scientific data interpretation

Provide evidence-based information with proper scientific citations. Always indicate confidence levels and limitations of research findings.`,
        maxResults: 8,
      },

      CYBER_INSURANCE: {
        indexName: "cyber-insurance-index",
        semanticConfig: "cyber-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "threat_type",
          "severity",
          "mitigation",
          "industry_sector",
        ],
        facets: ["document_type", "threat_type", "severity", "industry_sector"],
        systemPrompt: `You are a cyber insurance expert specializing in cybersecurity risk assessment. Help with:
- Cyber risk evaluation and scoring
- Security incident analysis
- Breach impact assessment
- Coverage recommendations
- Threat landscape analysis
- Mitigation strategies

Stay current with cybersecurity threats, regulatory requirements, and industry best practices. Provide actionable security recommendations.`,
        maxResults: 6,
      },

      FNOL_PROCESSOR: {
        indexName: "fnol-index",
        semanticConfig: "fnol-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "incident_type",
          "location",
          "damage_amount",
          "urgency",
        ],
        facets: ["document_type", "incident_type", "location", "urgency"],
        systemPrompt: `You are a First Notice of Loss specialist focused on incident reporting and initial claim processing. Help with:
- Incident reporting procedures
- Required documentation collection
- Initial claim setup and validation
- Emergency response coordination
- Damage assessment guidelines
- Regulatory reporting requirements

Ensure all required information is captured accurately and guide users through proper procedures step-by-step.`,
        maxResults: 5,
      },

      CLAIMS_LIFECYCLE: {
        indexName: "claims-lifecycle-index",
        semanticConfig: "lifecycle-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "workflow_stage",
          "priority",
          "assigned_to",
          "sla_status",
        ],
        facets: ["document_type", "workflow_stage", "priority", "sla_status"],
        systemPrompt: `You are a claims lifecycle management expert specializing in workflow optimization. Help with:
- Claim workflow design and management
- Processing stage tracking
- Assignment and routing decisions
- SLA monitoring and compliance
- Process optimization
- Performance metrics analysis

Focus on efficiency, customer satisfaction, and regulatory compliance. Provide insights for process improvements.`,
        maxResults: 6,
      },

      POLICY_ASSISTANT: {
        indexName: "policy-index",
        semanticConfig: "policy-semantic-config",
        fields: [
          "content",
          "title",
          "document_type",
          "policy_type",
          "coverage_limits",
          "deductible",
          "exclusions",
        ],
        facets: ["document_type", "policy_type", "coverage_limits"],
        systemPrompt: `You are a policy guidance specialist focused on customer education and support. Help with:
- Policy interpretation and explanation
- Coverage analysis and comparisons
- Endorsement recommendations
- Renewal guidance
- Claims coverage verification
- General insurance education

Provide clear, customer-friendly explanations of complex policy terms. Always clarify coverage limitations and exclusions.`,
        maxResults: 5,
      },
    };
  }

  static getInstance(): AzureConfigManager {
    if (!AzureConfigManager.instance) {
      AzureConfigManager.instance = new AzureConfigManager();
    }
    return AzureConfigManager.instance;
  }

  getAzureConfig(): AzureConfig {
    return this.config;
  }

  getSpecialistConfig(specialist: string): SpecialistConfig {
    return (
      this.specialistConfigs[specialist] ||
      this.specialistConfigs["POLICY_ASSISTANT"]
    );
  }

  getAllSpecialists(): string[] {
    return Object.keys(this.specialistConfigs);
  }

  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.openaiEndpoint)
      errors.push("Missing AZURE_OPENAI_ENDPOINT");
    if (!this.config.searchEndpoint)
      errors.push("Missing AZURE_SEARCH_ENDPOINT");
    if (!this.config.openaiApiKey) errors.push("Missing AZURE_OPENAI_KEY");
    if (!this.config.searchApiKey) errors.push("Missing AZURE_SEARCH_KEY");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Dynamic configuration updates
  updateSpecialistConfig(
    specialist: string,
    config: Partial<SpecialistConfig>
  ): void {
    if (this.specialistConfigs[specialist]) {
      this.specialistConfigs[specialist] = {
        ...this.specialistConfigs[specialist],
        ...config,
      };
    }
  }

  // Get search query enhancements based on specialist
  getSearchEnhancements(
    specialist: string,
    query: string
  ): {
    enhancedQuery: string;
    filters: string[];
    boosts: Record<string, number>;
  } {
    const enhancements: Record<string, any> = {
      CLAIMS_CHAT: {
        enhancedQuery: `${query} (claim OR settlement OR damage OR loss)`,
        filters: [
          'document_type eq "claim_procedure" or document_type eq "settlement_guide"',
        ],
        boosts: { claim_type: 2.0, status: 1.5 },
      },
      UNDERWRITING: {
        enhancedQuery: `${query} (risk OR underwriting OR premium OR coverage)`,
        filters: [
          'document_type eq "underwriting_guide" or document_type eq "risk_assessment"',
        ],
        boosts: { risk_level: 2.0, coverage_type: 1.8 },
      },
      CYBER_INSURANCE: {
        enhancedQuery: `${query} (cyber OR security OR breach OR threat)`,
        filters: [
          'document_type eq "cyber_policy" or document_type eq "security_guide"',
        ],
        boosts: { threat_type: 2.0, severity: 1.7 },
      },
    };

    return (
      enhancements[specialist] || {
        enhancedQuery: query,
        filters: [],
        boosts: {},
      }
    );
  }
}

export default AzureConfigManager;
