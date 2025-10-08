interface SearchIndex {
  name: string;
  fields: Array<{
    name: string;
    type: string;
    key?: boolean;
    searchable?: boolean;
    facetable?: boolean;
    analyzer?: string;
  }>;
  semantic?: {
    configurations: Array<{
      name: string;
      prioritizedFields: {
        titleField?: { fieldName: string };
        prioritizedContentFields?: Array<{ fieldName: string }>;
        prioritizedKeywordsFields?: Array<{ fieldName: string }>;
      };
    }>;
  };
}

class AzureSearchManager {
  private searchEndpoint: string;
  private searchApiKey: string;

  constructor() {
    this.searchEndpoint = process.env.AZURE_SEARCH_ENDPOINT!;
    this.searchApiKey = process.env.AZURE_SEARCH_KEY!;
  }

  async createIndex(indexConfig: SearchIndex): Promise<boolean> {
    const indexUrl = `${this.searchEndpoint}indexes/${indexConfig.name}?api-version=2023-11-01`;

    const headers = {
      "Content-Type": "application/json",
      "api-key": this.searchApiKey,
    };

    try {
      const response = await fetch(indexUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(indexConfig),
      });

      if (response.ok) {
        console.log(`✅ Created Azure Search index: ${indexConfig.name}`);
        return true;
      } else {
        console.error(
          `❌ Failed to create index ${indexConfig.name}:`,
          await response.text()
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Error creating index ${indexConfig.name}:`, error);
      return false;
    }
  }

  async uploadDocuments(indexName: string, documents: any[]): Promise<boolean> {
    const uploadUrl = `${this.searchEndpoint}indexes/${indexName}/docs/index?api-version=2023-11-01`;

    const headers = {
      "Content-Type": "application/json",
      "api-key": this.searchApiKey,
    };

    const uploadBody = {
      value: documents.map((doc) => ({
        "@search.action": "upload",
        ...doc,
      })),
    };

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(uploadBody),
      });

      if (response.ok) {
        console.log(
          `✅ Uploaded ${documents.length} documents to ${indexName}`
        );
        return true;
      } else {
        console.error(
          `❌ Failed to upload documents to ${indexName}:`,
          await response.text()
        );
        return false;
      }
    } catch (error) {
      console.error(`❌ Error uploading documents to ${indexName}:`, error);
      return false;
    }
  }

  getSpecialistIndexConfigs(): Record<string, SearchIndex> {
    return {
      "general-insurance-index": {
        name: "general-insurance-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "claim_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "claim_amount",
            type: "Edm.Double",
            searchable: false,
            facetable: true,
          },
          {
            name: "status",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "general-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "claim_type" },
                  { fieldName: "status" },
                ],
              },
            },
          ],
        },
      },

      "underwriting-index": {
        name: "underwriting-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "risk_level",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "premium",
            type: "Edm.Double",
            searchable: false,
            facetable: true,
          },
          {
            name: "coverage_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "underwriting-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "risk_level" },
                  { fieldName: "coverage_type" },
                ],
              },
            },
          ],
        },
      },

      "research-index": {
        name: "research-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "study_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "publication_date",
            type: "Edm.DateTimeOffset",
            searchable: false,
            facetable: true,
          },
          {
            name: "authors",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "research-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "study_type" },
                  { fieldName: "authors" },
                ],
              },
            },
          ],
        },
      },

      "cyber-insurance-index": {
        name: "cyber-insurance-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "threat_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "severity",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "mitigation",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "cyber-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "threat_type" },
                  { fieldName: "severity" },
                ],
              },
            },
          ],
        },
      },

      "fnol-index": {
        name: "fnol-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "incident_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "location",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "date_reported",
            type: "Edm.DateTimeOffset",
            searchable: false,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "fnol-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "incident_type" },
                  { fieldName: "location" },
                ],
              },
            },
          ],
        },
      },

      "claims-lifecycle-index": {
        name: "claims-lifecycle-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "workflow_stage",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "priority",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "assigned_to",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "lifecycle-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "workflow_stage" },
                  { fieldName: "priority" },
                ],
              },
            },
          ],
        },
      },

      "policy-index": {
        name: "policy-index",
        fields: [
          { name: "id", type: "Edm.String", key: true, searchable: false },
          {
            name: "content",
            type: "Edm.String",
            searchable: true,
            analyzer: "en.microsoft",
          },
          {
            name: "title",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "policy_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "coverage_limits",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
          {
            name: "deductible",
            type: "Edm.Double",
            searchable: false,
            facetable: true,
          },
          {
            name: "document_type",
            type: "Edm.String",
            searchable: true,
            facetable: true,
          },
        ],
        semantic: {
          configurations: [
            {
              name: "policy-semantic-config",
              prioritizedFields: {
                titleField: { fieldName: "title" },
                prioritizedContentFields: [{ fieldName: "content" }],
                prioritizedKeywordsFields: [
                  { fieldName: "policy_type" },
                  { fieldName: "coverage_limits" },
                ],
              },
            },
          ],
        },
      },
    };
  }

  async initializeAllIndices(): Promise<void> {
    const configs = this.getSpecialistIndexConfigs();

    console.log("🔧 Initializing Azure Search indices for all specialists...");

    for (const [specialist, config] of Object.entries(configs)) {
      console.log(`📋 Creating index for ${specialist}...`);
      await this.createIndex(config);

      // Add some sample documents for testing
      await this.uploadSampleDocuments(config.name, specialist);
    }

    console.log("✅ All Azure Search indices initialized!");
  }

  private async uploadSampleDocuments(
    indexName: string,
    specialist: string
  ): Promise<void> {
    const sampleDocs = this.getSampleDocuments(specialist);
    if (sampleDocs.length > 0) {
      await this.uploadDocuments(indexName, sampleDocs);
    }
  }

  private getSampleDocuments(specialist: string): any[] {
    const baseDocs = {
      "general-insurance-index": [
        {
          id: "1",
          title: "General Claims Processing Guide",
          content:
            "This guide covers the standard procedures for processing insurance claims, including documentation requirements, assessment protocols, and settlement procedures.",
          claim_type: "General",
          claim_amount: 5000,
          status: "Active",
          document_type: "Guide",
        },
      ],
      "underwriting-index": [
        {
          id: "1",
          title: "Risk Assessment Framework",
          content:
            "Comprehensive framework for assessing insurance risks, including risk scoring methodologies, premium calculations, and coverage recommendations.",
          risk_level: "Medium",
          premium: 1200,
          coverage_type: "Comprehensive",
          document_type: "Framework",
        },
      ],
      "research-index": [
        {
          id: "1",
          title: "Clinical Trial Methodology",
          content:
            "Best practices for conducting clinical trials in pharmaceutical research, including study design, patient recruitment, and data analysis.",
          study_type: "Clinical Trial",
          publication_date: "2024-01-15T00:00:00Z",
          authors: "Dr. Smith, Dr. Johnson",
          document_type: "Research Paper",
        },
      ],
      "cyber-insurance-index": [
        {
          id: "1",
          title: "Cyber Threat Assessment Guide",
          content:
            "Guide for assessing cyber security threats and determining appropriate insurance coverage for businesses.",
          threat_type: "Ransomware",
          severity: "High",
          mitigation: "Multi-factor Authentication",
          document_type: "Assessment Guide",
        },
      ],
      "fnol-index": [
        {
          id: "1",
          title: "FNOL Processing Procedures",
          content:
            "Standard procedures for processing First Notice of Loss reports, including required documentation and initial assessment steps.",
          incident_type: "Vehicle Accident",
          location: "Highway 101",
          date_reported: "2024-01-20T00:00:00Z",
          document_type: "Procedure",
        },
      ],
      "claims-lifecycle-index": [
        {
          id: "1",
          title: "Claims Workflow Management",
          content:
            "Comprehensive guide to managing claims through their entire lifecycle, from initial report to final settlement.",
          workflow_stage: "Investigation",
          priority: "High",
          assigned_to: "Claims Team A",
          document_type: "Workflow Guide",
        },
      ],
      "policy-index": [
        {
          id: "1",
          title: "Policy Terms and Conditions",
          content:
            "Standard terms and conditions for insurance policies, including coverage details, exclusions, and claim procedures.",
          policy_type: "Auto Insurance",
          coverage_limits: "$100,000",
          deductible: 500,
          document_type: "Policy Document",
        },
      ],
    };

    return baseDocs[specialist as keyof typeof baseDocs] || [];
  }
}

export default AzureSearchManager;
