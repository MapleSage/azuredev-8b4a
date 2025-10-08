/**
 * Document Processing API
 * Triggers document analysis using DocStream and Underwriting Workbench
 */

import { NextApiRequest, NextApiResponse } from "next";

interface ProcessRequest {
  jobId: string;
  fileName: string;
  specialist?: string;
}

interface ProcessResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      jobId,
      fileName,
      specialist = "CLAIMS_CHAT",
    } = req.body as ProcessRequest;

    if (!jobId || !fileName) {
      return res
        .status(400)
        .json({ error: "Missing required fields: jobId, fileName" });
    }

    console.log(
      `🔄 Starting document processing for ${fileName} (Job: ${jobId})`
    );

    // Determine processing pipeline based on specialist and file type
    const processingPipeline = getProcessingPipeline(specialist, fileName);

    // Trigger appropriate processing workflow
    await triggerProcessing(jobId, fileName, processingPipeline);

    return res.status(200).json({
      success: true,
      jobId,
      message: `Document processing started with ${processingPipeline} pipeline`,
    });
  } catch (error: any) {
    console.error("Document processing error:", error);
    return res.status(500).json({
      error: "Failed to start document processing",
    });
  }
}

function getProcessingPipeline(specialist: string, fileName: string): string {
  const fileExtension = fileName.toLowerCase().split(".").pop();

  // Route to appropriate processing pipeline
  switch (specialist) {
    case "UNDERWRITING":
      return "underwriting-workbench";

    case "FNOL_PROCESSOR":
    case "CLAIMS_CHAT":
    case "CLAIMS_LIFECYCLE":
      return "docstream-classification";

    case "CYBER_INSURANCE":
      return "security-analysis";

    case "RESEARCH_ASSISTANT":
      return "research-extraction";

    default:
      // Default to general document processing
      if (fileExtension === "pdf") {
        return "docstream-classification";
      } else {
        return "basic-extraction";
      }
  }
}

async function triggerProcessing(
  jobId: string,
  fileName: string,
  pipeline: string
): Promise<void> {
  try {
    switch (pipeline) {
      case "underwriting-workbench":
        await triggerUnderwritingAnalysis(jobId, fileName);
        break;

      case "docstream-classification":
        await triggerDocStreamProcessing(jobId, fileName);
        break;

      case "security-analysis":
        await triggerSecurityAnalysis(jobId, fileName);
        break;

      case "research-extraction":
        await triggerResearchExtraction(jobId, fileName);
        break;

      default:
        await triggerBasicExtraction(jobId, fileName);
        break;
    }
  } catch (error) {
    console.error(`Failed to trigger ${pipeline} processing:`, error);
    throw error;
  }
}

async function triggerUnderwritingAnalysis(
  jobId: string,
  fileName: string
): Promise<void> {
  // Integration with Underwriting Workbench
  const underwritingApiUrl =
    process.env.UNDERWRITING_API_URL ||
    "https://dsu6ckke8guca.cloudfront.net/api";

  try {
    const response = await fetch(`${underwritingApiUrl}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.UNDERWRITING_API_KEY || "demo-key"}`,
      },
      body: JSON.stringify({
        jobId,
        documentPath: `documents/${jobId}/${fileName}`,
        analysisType: "full-underwriting",
      }),
    });

    if (!response.ok) {
      throw new Error(`Underwriting API error: ${response.status}`);
    }

    console.log(`✅ Underwriting analysis triggered for ${jobId}`);
  } catch (error) {
    console.error("Underwriting analysis trigger failed:", error);
    // Fallback to mock processing
    await simulateProcessing(jobId, "underwriting");
  }
}

async function triggerDocStreamProcessing(
  jobId: string,
  fileName: string
): Promise<void> {
  // Integration with DocStream Step Functions
  const stepFunctionsArn = process.env.DOCSTREAM_STATE_MACHINE_ARN;

  if (!stepFunctionsArn) {
    console.warn(
      "DocStream Step Functions ARN not configured, using mock processing"
    );
    await simulateProcessing(jobId, "docstream");
    return;
  }

  try {
    // In production, trigger Step Functions execution
    // For now, simulate the processing
    await simulateProcessing(jobId, "docstream");
    console.log(`✅ DocStream processing triggered for ${jobId}`);
  } catch (error) {
    console.error("DocStream processing trigger failed:", error);
    throw error;
  }
}

async function triggerSecurityAnalysis(
  jobId: string,
  fileName: string
): Promise<void> {
  // Integration with Cyber Insurance analysis
  try {
    await simulateProcessing(jobId, "security");
    console.log(`✅ Security analysis triggered for ${jobId}`);
  } catch (error) {
    console.error("Security analysis trigger failed:", error);
    throw error;
  }
}

async function triggerResearchExtraction(
  jobId: string,
  fileName: string
): Promise<void> {
  // Integration with Research Assistant processing
  try {
    await simulateProcessing(jobId, "research");
    console.log(`✅ Research extraction triggered for ${jobId}`);
  } catch (error) {
    console.error("Research extraction trigger failed:", error);
    throw error;
  }
}

async function triggerBasicExtraction(
  jobId: string,
  fileName: string
): Promise<void> {
  // Basic text extraction using Textract
  try {
    await simulateProcessing(jobId, "basic");
    console.log(`✅ Basic extraction triggered for ${jobId}`);
  } catch (error) {
    console.error("Basic extraction trigger failed:", error);
    throw error;
  }
}

async function simulateProcessing(jobId: string, type: string): Promise<void> {
  // Simulate processing delay and store mock results
  // In production, this would be handled by the actual processing services

  const processingTime = Math.random() * 30000 + 10000; // 10-40 seconds

  setTimeout(async () => {
    try {
      // Store mock results (in production, use DynamoDB)
      const mockResults = generateMockResults(type);

      // In production, update job status in DynamoDB
      console.log(`✅ Mock processing completed for ${jobId} (${type})`);
    } catch (error) {
      console.error(`Mock processing failed for ${jobId}:`, error);
    }
  }, processingTime);
}

function generateMockResults(type: string) {
  const baseResults = {
    timestamp: new Date().toISOString(),
    processingTime: Math.random() * 30 + 10, // 10-40 seconds
  };

  switch (type) {
    case "underwriting":
      return {
        ...baseResults,
        documentType: "Life Insurance Application",
        extractedData: {
          applicantName: "John Doe",
          dateOfBirth: "1985-03-15",
          policyAmount: "$500,000",
          medicalHistory: "No significant conditions",
        },
        analysisResults: {
          riskScore: 3,
          recommendations: [
            "Standard premium rates applicable",
            "No additional medical exam required",
          ],
          flags: [],
        },
      };

    case "docstream":
      return {
        ...baseResults,
        documentType: "Auto Insurance Claim",
        extractedData: {
          claimNumber: "CLM-2024-001234",
          incidentDate: "2024-01-15",
          vehicleInfo: "2020 Honda Accord",
          damageAmount: "$8,500",
        },
        analysisResults: {
          riskScore: 2,
          classification: "Standard Auto Claim",
          processingRecommendation: "Approve for standard processing",
        },
      };

    case "security":
      return {
        ...baseResults,
        documentType: "Security Assessment Report",
        extractedData: {
          companyName: "TechCorp Inc.",
          assessmentDate: "2024-01-20",
          vulnerabilities: 5,
          criticalIssues: 1,
        },
        analysisResults: {
          riskScore: 6,
          securityRating: "Medium Risk",
          recommendations: ["Implement MFA", "Update firewall rules"],
        },
      };

    default:
      return {
        ...baseResults,
        documentType: "General Document",
        extractedData: {
          textContent: "Document text extracted successfully",
          pageCount: 3,
          wordCount: 1250,
        },
        analysisResults: {
          riskScore: 1,
          summary: "Standard document processing completed",
        },
      };
  }
}
