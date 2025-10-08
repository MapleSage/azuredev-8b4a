/**
 * Document Upload API
 * Generates presigned S3 URLs for secure file uploads
 */

import { NextApiRequest, NextApiResponse } from "next";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

interface UploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  specialist?: string;
}

interface UploadResponse {
  uploadUrl: string;
  jobId: string;
  documentKey: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse | { error: string }>
) {
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

    // Validate file size (max 50MB)
    if (fileSize > 50 * 1024 * 1024) {
      return res.status(400).json({ error: "File size exceeds 50MB limit" });
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // Generate unique job ID and document key
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString().split("T")[0];
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const documentKey = `documents/${specialist}/${timestamp}/${jobId}/${sanitizedFileName}`;

    // Get S3 bucket name from environment
    const bucketName =
      process.env.DOCUMENT_UPLOAD_BUCKET || "sageinsure-documents";

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: documentKey,
      ContentType: fileType,
      Metadata: {
        "original-name": fileName,
        "job-id": jobId,
        specialist: specialist,
        "upload-timestamp": new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // Store job metadata (in production, use DynamoDB)
    // For now, we'll rely on S3 metadata and polling

    console.log(`📄 Generated upload URL for ${fileName} (Job: ${jobId})`);

    return res.status(200).json({
      uploadUrl,
      jobId,
      documentKey,
    });
  } catch (error: any) {
    console.error("Document upload error:", error);
    return res.status(500).json({
      error: "Failed to generate upload URL",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};
