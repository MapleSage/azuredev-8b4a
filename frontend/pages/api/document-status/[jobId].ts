/**
 * Document Status API
 * Returns SageSure-style document workflow status and sample analysis results.
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

const jobStorage = new Map<string, StatusResponse>();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse | { error: string }>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== "string") {
      return res.status(400).json({ error: "Invalid job ID" });
    }

    let jobStatus = jobStorage.get(jobId);

    if (!jobStatus) {
      jobStatus = {
        jobId,
        status: "processing",
        progress: 35,
      };

      const processingTime = Math.random() * 12000 + 8000;

      setTimeout(() => {
        const completedStatus: StatusResponse = {
          jobId,
          status: "completed",
          progress: 100,
          extractedData: generateExtractedData(jobId),
          analysisResults: generateAnalysisResults(jobId),
          documentUrl: generateDocumentUrl(jobId),
        };

        jobStorage.set(jobId, completedStatus);
        console.log(`✅ Document workflow ${jobId} completed`);
      }, processingTime);

      jobStorage.set(jobId, jobStatus);
    }

    if (jobStatus.status === "processing" && jobStatus.progress < 95) {
      jobStatus.progress = Math.min(
        jobStatus.progress + Math.random() * 14,
        95,
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

function generateExtractedData(jobId: string) {
  const scenarios = [
    {
      documentType: "Property FNOL Evidence Packet",
      keyFields: {
        claimNumber: `CLM-${jobId.slice(-6).toUpperCase()}`,
        incidentDate: "2026-05-12",
        policyNumber: "SSP-PROP-884210",
        damageDescription:
          "Water intrusion and ceiling damage after burst pipe",
        estimatedCost: "$18,500",
        insuredName: "Mason Property Group",
        incidentLocation: "Austin, TX",
      },
      confidence: 0.92,
    },
    {
      documentType: "Commercial Broker Slip",
      keyFields: {
        applicantName: "Harborline Logistics",
        coverageRequested: "$5.2M property / $2M liability",
        priorLosses: "2 water intrusion claims in 36 months",
        locations: "4 coastal warehouse sites",
        producer: "Northstar Brokerage",
        referralReason: "Requested limit exceeds standard authority",
      },
      confidence: 0.9,
    },
    {
      documentType: "Policy Review Packet",
      keyFields: {
        policyNumber: "SSP-HOME-421901",
        renewalDate: "2026-06-30",
        coverageGap: "Roof wear exclusion requires review",
        deductible: "$2,500 wind/hail",
        recommendation: "Prepare plain-language customer explainer",
      },
      confidence: 0.88,
    },
  ];

  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

function generateAnalysisResults() {
  return {
    riskScore: Math.floor(Math.random() * 42) + 48,
    processingRecommendation: getRandomRecommendation(),
    flags: getRandomFlags(),
    keyInsights: [
      "Document is readable and mapped to an insurance workflow",
      "Required identifiers were extracted with high confidence",
      "Human review remains recommended before customer-facing or regulated action",
    ],
    nextSteps: [
      "Route to the assigned claims or underwriting queue",
      "Verify extracted details against policy records",
      "Request missing evidence before submission if any field is uncertain",
    ],
    governance: {
      auditLogged: true,
      humanApprovalRecommended: true,
      dataBoundary: "tenant-scoped-workflow",
    },
    confidence: Math.random() * 0.15 + 0.84,
  };
}

function getRandomRecommendation() {
  const recommendations = [
    "Ready for standard workflow review",
    "Requires additional documentation",
    "Escalate to senior underwriter",
    "Schedule inspection or adjuster follow-up",
    "Prepare customer-facing explanation",
    "Verify with policy administration system",
  ];

  return recommendations[Math.floor(Math.random() * recommendations.length)];
}

function getRandomFlags() {
  const allFlags = [
    "High claim amount",
    "Recent policy inception",
    "Multiple prior losses",
    "Incomplete documentation",
    "Requires policy verification",
    "Potential fraud indicators",
  ];

  const selectedFlags: string[] = [];
  const numFlags = Math.floor(Math.random() * 3);

  for (let i = 0; i < numFlags; i++) {
    const randomFlag = allFlags[Math.floor(Math.random() * allFlags.length)];
    if (!selectedFlags.includes(randomFlag)) {
      selectedFlags.push(randomFlag);
    }
  }

  return selectedFlags;
}

function generateDocumentUrl(jobId: string): string {
  return `/api/document-status/${encodeURIComponent(jobId)}?artifact=document`;
}
