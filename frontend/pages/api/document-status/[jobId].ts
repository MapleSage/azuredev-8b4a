/**
 * Document Status API
 * Checks processing status and returns results
 */

import { NextApiRequest, NextApiResponse } from "next";

interface StatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  extractedData?: any;
  analysisResults?: any;
  documentUrl?: string;
  error?: string;
}

// Mock job storage (in production, use DynamoDB)
const jobStorage = new Map<string, StatusResponse>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    // Check job status
    let jobStatus = jobStorage.get(jobId);

    if (!jobStatus) {
      // Initialize job if not found (first status check)
      jobStatus = {
        jobId,
        status: "processing",
        progress: 25,
      };

      // Simulate processing completion after random delay
      const processingTime = Math.random() * 30000 + 15000; // 15-45 seconds

      setTimeout(() => {
        const completedStatus: StatusResponse = {
          jobId,
          status: "completed",
          progress: 100,
          extractedData: generateMockExtractedData(),
          analysisResults: generateMockAnalysisResults(),
          documentUrl: generateDocumentUrl(jobId),
        };

        jobStorage.set(jobId, completedStatus);
        console.log(`✅ Job ${jobId} completed`);
      }, processingTime);

      jobStorage.set(jobId, jobStatus);
    }

    // Simulate progress updates for processing jobs
    if (jobStatus.status === "processing" && jobStatus.progress < 95) {
      jobStatus.progress = Math.min(
        jobStatus.progress + Math.random() * 10,
        95
      );
      jobStorage.set(jobId, jobStatus);
    }

    return res.status(200).json(jobStatus);
  } catch (error: any) {
    console.error("Status check error:", error);
    return res.status(500).json({
      error: "Failed to check job status",
    });
  }
}

function generateMockExtractedData() {
  const documentTypes = [
    "Auto Insurance Claim",
    "Life Insurance Application",
    "Property Damage Report",
    "Medical Records",
    "Financial Statement",
    "Security Assessment",
  ];

  const randomType =
    documentTypes[Math.floor(Math.random() * documentTypes.length)];

  switch (randomType) {
    case "Auto Insurance Claim":
      return {
        documentType: randomType,
        keyFields: {
          claimNumber: `CLM-${Date.now().toString().slice(-6)}`,
          incidentDate: "2024-01-15",
          policyNumber: "POL-AUTO-789456",
          vehicleYear: "2020",
          vehicleMake: "Honda",
          vehicleModel: "Accord",
          damageDescription: "Front bumper damage from collision",
          estimatedCost: "$8,500",
          driverName: "John Smith",
          incidentLocation: "Main St & Oak Ave, Springfield",
        },
        confidence: 0.92,
      };

    case "Life Insurance Application":
      return {
        documentType: randomType,
        keyFields: {
          applicantName: "Sarah Johnson",
          dateOfBirth: "1985-03-15",
          ssn: "***-**-1234",
          policyAmount: "$500,000",
          beneficiary: "Michael Johnson (Spouse)",
          medicalHistory: "No significant conditions reported",
          occupation: "Software Engineer",
          smoker: "No",
          height: "5'6\"",
          weight: "140 lbs",
        },
        confidence: 0.89,
      };

    case "Property Damage Report":
      return {
        documentType: randomType,
        keyFields: {
          propertyAddress: "123 Elm Street, Springfield, IL",
          damageType: "Water damage from burst pipe",
          incidentDate: "2024-01-20",
          estimatedRepairCost: "$15,000",
          policyNumber: "POL-HOME-456789",
          contactPhone: "(555) 123-4567",
          emergencyServices: "Fire department responded",
          temporaryRepairs: "Plumbing shut off, tarps installed",
        },
        confidence: 0.87,
      };

    default:
      return {
        documentType: randomType,
        keyFields: {
          documentDate: new Date().toISOString().split("T")[0],
          pageCount: Math.floor(Math.random() * 10) + 1,
          wordCount: Math.floor(Math.random() * 2000) + 500,
          language: "English",
        },
        confidence: 0.85,
      };
  }
}

function generateMockAnalysisResults() {
  return {
    riskScore: Math.floor(Math.random() * 10) + 1,
    processingRecommendation: getRandomRecommendation(),
    flags: getRandomFlags(),
    keyInsights: [
      "Document appears authentic and complete",
      "All required fields are present",
      "No obvious discrepancies detected",
    ],
    nextSteps: [
      "Route to appropriate specialist for review",
      "Verify information against policy records",
      "Schedule follow-up if needed",
    ],
    confidence: Math.random() * 0.2 + 0.8, // 0.8 - 1.0
  };
}

function getRandomRecommendation() {
  const recommendations = [
    "Approve for standard processing",
    "Requires additional documentation",
    "Escalate to senior underwriter",
    "Schedule inspection",
    "Request medical examination",
    "Verify with third parties",
  ];

  return recommendations[Math.floor(Math.random() * recommendations.length)];
}

function getRandomFlags() {
  const allFlags = [
    "High claim amount",
    "Recent policy inception",
    "Multiple claims history",
    "Incomplete documentation",
    "Requires verification",
    "Potential fraud indicators",
  ];

  const numFlags = Math.floor(Math.random() * 3); // 0-2 flags
  const selectedFlags = [];

  for (let i = 0; i < numFlags; i++) {
    const randomFlag = allFlags[Math.floor(Math.random() * allFlags.length)];
    if (!selectedFlags.includes(randomFlag)) {
      selectedFlags.push(randomFlag);
    }
  }

  return selectedFlags;
}

function generateDocumentUrl(jobId: string): string {
  // In production, return actual S3 presigned URL
  return `https://sageinsure-documents.s3.amazonaws.com/processed/${jobId}/document.pdf?expires=3600`;
}
