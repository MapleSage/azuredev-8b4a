/**
 * Document Processing API
 * Starts SageSure greenfield document workflows for FNOL, underwriting,
 * consumer relief, and policy operations.
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
  pipeline: string;
  message: string;
}

const specialistPipelines: Record<string, string> = {
  UNDERWRITING: "underwriting-risk-review",
  FNOL_PROCESSOR: "fnol-evidence-classification",
  CLAIMS_CHAT: "claims-document-review",
  CLAIMS_LIFECYCLE: "claims-lifecycle-evidence",
  CYBER_INSURANCE: "scamshield-fraud-triage",
  POLICY_ASSISTANT: "policy-pulse-review",
  RESEARCH_ASSISTANT: "research-extraction",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProcessResponse | { error: string }>,
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

    const pipeline = getProcessingPipeline(specialist, fileName);

    console.log(`🔄 Starting ${pipeline} for ${fileName} (${jobId})`);
    await triggerProcessing(jobId, fileName, pipeline, specialist);

    return res.status(200).json({
      success: true,
      jobId,
      pipeline,
      message: `Document processing started with ${pipeline}`,
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
  const mappedPipeline = specialistPipelines[specialist];

  if (mappedPipeline) {
    return mappedPipeline;
  }

  if (fileExtension === "pdf") {
    return "document-intelligence-review";
  }

  return "evidence-intake-review";
}

async function triggerProcessing(
  jobId: string,
  fileName: string,
  pipeline: string,
  specialist: string,
): Promise<void> {
  const documentWorkflowUrl = process.env.AGENTCORE_DOCUMENT_WORKFLOW_URL;

  if (!documentWorkflowUrl) {
    await simulateProcessing(jobId, pipeline);
    return;
  }

  const response = await fetch(documentWorkflowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jobId,
      fileName,
      pipeline,
      specialist,
      source: "sagesure-frontend",
    }),
    signal: AbortSignal.timeout(
      Number(process.env.AGENTCORE_DOCUMENT_TIMEOUT_MS || 45000),
    ),
  });

  if (!response.ok) {
    throw new Error(`Document workflow returned ${response.status}`);
  }
}

async function simulateProcessing(
  jobId: string,
  pipeline: string,
): Promise<void> {
  // Local/dev placeholder while the private AgentCore document workflow is wired.
  // Status polling returns deterministic insurance-style sample results.
  console.log(`✅ Queued local document workflow for ${jobId} (${pipeline})`);
}
