/**
 * Document Upload Component
 * Handles file uploads for insurance claims with processing status
 */

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "completed" | "error";
  progress: number;
  extractedData?: any;
  analysisResults?: any;
  url?: string;
}

interface DocumentUploadProps {
  onFileProcessed?: (file: UploadedFile) => void;
  onFilesChange?: (files: UploadedFile[]) => void;
  acceptedTypes?: string[];
  maxFiles?: number;
  specialist?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFileProcessed,
  onFilesChange,
  acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
  maxFiles = 10,
  specialist = "CLAIMS_CHAT",
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (files.length + acceptedFiles.length > maxFiles) {
        alert(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setIsUploading(true);

      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
        progress: 0,
      }));

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);

      // Process each file
      for (const [index, file] of acceptedFiles.entries()) {
        const fileId = newFiles[index].id;

        try {
          await processFile(file, fileId);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          updateFileStatus(fileId, "error", 100);
        }
      }

      setIsUploading(false);
    },
    [files, maxFiles, onFilesChange]
  );

  const processFile = async (file: File, fileId: string) => {
    try {
      // Step 1: Get presigned URL for upload
      updateFileStatus(fileId, "uploading", 10);

      const uploadResponse = await fetch("/api/document-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          specialist,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, jobId } = await uploadResponse.json();

      // Step 2: Upload file to S3
      updateFileStatus(fileId, "uploading", 30);

      const s3Response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!s3Response.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Start processing
      updateFileStatus(fileId, "processing", 50);

      const processResponse = await fetch("/api/document-process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          fileName: file.name,
          specialist,
        }),
      });

      if (!processResponse.ok) {
        throw new Error("Failed to start processing");
      }

      // Step 4: Poll for completion
      await pollProcessingStatus(fileId, jobId);
    } catch (error) {
      console.error("File processing error:", error);
      updateFileStatus(fileId, "error", 100);
    }
  };

  const pollProcessingStatus = async (fileId: string, jobId: string) => {
    const maxAttempts = 30; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/document-status/${jobId}`);
        const data = await response.json();

        if (data.status === "completed") {
          updateFileStatus(
            fileId,
            "completed",
            100,
            data.extractedData,
            data.analysisResults,
            data.documentUrl
          );

          const completedFile = files.find((f) => f.id === fileId);
          if (completedFile) {
            onFileProcessed?.({
              ...completedFile,
              status: "completed",
              progress: 100,
              extractedData: data.extractedData,
              analysisResults: data.analysisResults,
              url: data.documentUrl,
            });
          }
          return;
        }

        if (data.status === "failed") {
          updateFileStatus(fileId, "error", 100);
          return;
        }

        // Still processing
        const progress = Math.min(50 + attempts * 2, 95);
        updateFileStatus(fileId, "processing", progress);

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 10000); // Poll every 10 seconds
        } else {
          updateFileStatus(fileId, "error", 100);
        }
      } catch (error) {
        console.error("Polling error:", error);
        updateFileStatus(fileId, "error", 100);
      }
    };

    poll();
  };

  const updateFileStatus = (
    fileId: string,
    status: UploadedFile["status"],
    progress: number,
    extractedData?: any,
    analysisResults?: any,
    url?: string
  ) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.map((file) =>
        file.id === fileId
          ? { ...file, status, progress, extractedData, analysisResults, url }
          : file
      );
      onFilesChange?.(updatedFiles);
      return updatedFiles;
    });
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter((file) => file.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles,
    disabled: isUploading,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "⬆️";
      case "processing":
        return "⚙️";
      case "completed":
        return "✅";
      case "error":
        return "❌";
      default:
        return "📄";
    }
  };

  const getStatusColor = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return "text-blue-600";
      case "processing":
        return "text-yellow-600";
      case "completed":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
        <input {...getInputProps()} />
        <div className="space-y-2">
          <div className="text-4xl">📎</div>
          <div className="text-lg font-medium text-gray-700">
            {isDragActive ? "Drop files here" : "Upload Documents"}
          </div>
          <div className="text-sm text-gray-500">
            Drag & drop files here, or click to select
          </div>
          <div className="text-xs text-gray-400">
            Supported: {acceptedTypes.join(", ")} • Max {maxFiles} files
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Uploaded Files</h3>

          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{getStatusIcon(file.status)}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-500 ml-2">
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                      <p
                        className={`text-xs font-medium ${getStatusColor(file.status)}`}>
                        {file.status.charAt(0).toUpperCase() +
                          file.status.slice(1)}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {(file.status === "uploading" ||
                      file.status === "processing") && (
                      <div className="mt-2">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {file.progress}%
                        </p>
                      </div>
                    )}

                    {/* Results Summary */}
                    {file.status === "completed" && file.extractedData && (
                      <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                        <p className="text-sm font-medium text-green-800 mb-2">
                          Processing Complete
                        </p>
                        <div className="text-xs text-green-700 space-y-1">
                          {file.extractedData.documentType && (
                            <p>📋 Type: {file.extractedData.documentType}</p>
                          )}
                          {file.extractedData.keyFields && (
                            <p>
                              🔑 Fields:{" "}
                              {Object.keys(file.extractedData.keyFields).length}{" "}
                              extracted
                            </p>
                          )}
                          {file.analysisResults?.riskScore && (
                            <p>
                              ⚠️ Risk Score: {file.analysisResults.riskScore}/10
                            </p>
                          )}
                        </div>

                        {file.url && (
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800">
                            View Document →
                          </a>
                        )}
                      </div>
                    )}

                    {/* Error Message */}
                    {file.status === "error" && (
                      <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                        <p className="text-xs text-red-700">
                          Processing failed. Please try uploading again.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
