/**
 * Document Upload API
 * Creates greenfield document-intake jobs and accepts browser-managed uploads.
 *
 * The active dev01 posture keeps document handling inside SageSure-controlled
 * private workflows. This route intentionally avoids legacy cloud-demo upload
 * providers and returns an internal upload URL that can later be backed by
 * AgentCore, private Blob storage, or a tenant-scoped document service.
 */

import { NextApiRequest, NextApiResponse } from "next";

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  specialist?: string;
}

interface UploadResponse {
  uploadUrl: string;
  uploadMode: "internal";
  jobId: string;
  documentKey: string;
  expiresInSeconds: number;
}

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function buildJobId() {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    UploadResponse | { ok: true; jobId: string } | { error: string }
  >,
) {
  if (req.method === "PUT") {
    const jobId = typeof req.query.jobId === "string" ? req.query.jobId : "";

    if (!jobId) {
      return res.status(400).json({ error: "Missing jobId" });
    }

    // Browser-managed upload acknowledgement. In production this becomes a
    // private tenant-scoped Blob/AgentCore write, not a public object-store URL.
    console.log(`📄 Received document upload for ${jobId}`);
    return res.status(200).json({ ok: true, jobId });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      fileName,
      fileType,
      fileSize,
      specialist = "CLAIMS_CHAT",
    } = req.body as UploadRequest;

    if (!fileName || !fileType) {
      return res
        .status(400)
        .json({ error: "Missing required fields: fileName, fileType" });
    }

    if (fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds 50MB limit" });
    }

    if (!allowedTypes.has(fileType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    const jobId = buildJobId();
    const timestamp = new Date().toISOString().split("T")[0];
    const documentKey = `documents/${specialist}/${timestamp}/${jobId}/${sanitizeFileName(fileName)}`;

    console.log(`📄 Created document intake job for ${fileName} (${jobId})`);

    return res.status(200).json({
      uploadUrl: `/api/document-upload?jobId=${encodeURIComponent(jobId)}`,
      uploadMode: "internal",
      jobId,
      documentKey,
      expiresInSeconds: 3600,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      error: "Failed to create document upload job",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "55mb",
    },
  },
};
