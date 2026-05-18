import { useEffect, useMemo, useState } from "react";
import { publishWorkflowEvent } from "../lib/workflow-memory";
import { useChatApi, type WorkspaceModuleResponse } from "../lib/api-client";
import ModuleConnectionBanner from "./ModuleConnectionBanner";

interface DocumentUpload {
  file: File;
  status:
    | "pending"
    | "uploading"
    | "intake_received"
    | "evidence_review"
    | "data_capture"
    | "needs_info"
    | "triage"
    | "handoff_ready"
    | "processing"
    | "extracting"
    | "classifying"
    | "routing"
    | "completed"
    | "error";
  classification?: string;
  extractedData?: any;
  executionArn?: string;
  claimId?: string;
  routing?: string;
}

const intakeStages = [
  {
    id: "intake",
    label: "Intake",
    detail: "Documents and loss details received",
    icon: "📥",
  },
  {
    id: "evidence",
    label: "Evidence review",
    detail: "Photos, reports, invoices, and notes checked",
    icon: "🔎",
  },
  {
    id: "extract",
    label: "Data capture",
    detail: "Policy, parties, loss date, and location identified",
    icon: "✍️",
  },
  {
    id: "triage",
    label: "Triage",
    detail: "Severity, missing information, and routing assessed",
    icon: "⚡",
  },
  {
    id: "handoff",
    label: "Adjuster handoff",
    detail: "Claim summary and next actions prepared",
    icon: "🤝",
  },
];

const sampleQueue = [
  {
    id: "FNOL-2026-2219",
    insured: "Elena Garcia",
    type: "Wind / roof",
    status: "Needs severity review",
    priority: "Critical",
    age: "27m",
  },
  {
    id: "FNOL-2026-2198",
    insured: "Bret Morgan",
    type: "Water intrusion",
    status: "Missing photos",
    priority: "High",
    age: "1h",
  },
  {
    id: "FNOL-2026-2182",
    insured: "Anika Shah",
    type: "Auto collision",
    status: "Ready for adjuster",
    priority: "Normal",
    age: "3h",
  },
];

const missingInfoChecklist = [
  "Incident date, time, and full loss location",
  "Policy number and named insured confirmation",
  "Damage photos or supporting repair estimate",
  "Police, fire, or emergency report when applicable",
];

const formatStatus = (status: DocumentUpload["status"]) => {
  switch (status) {
    case "pending":
      return "Queued";
    case "uploading":
      return "Receiving file";
    case "intake_received":
      return "Intake received";
    case "evidence_review":
      return "Evidence review";
    case "data_capture":
      return "Data capture";
    case "needs_info":
      return "Missing info needed";
    case "triage":
      return "Triage review";
    case "handoff_ready":
      return "Handoff ready";
    case "processing":
      return "Reviewing intake";
    case "extracting":
      return "Capturing details";
    case "classifying":
      return "Identifying document type";
    case "routing":
      return "Routing review";
    case "completed":
      return "Review complete";
    case "error":
      return "Needs attention";
  }
};

const statusClass = (status: DocumentUpload["status"]) => {
  switch (status) {
    case "handoff_ready":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "completed":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "needs_info":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "error":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "routing":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "extracting":
    case "classifying":
    case "processing":
    case "uploading":
      return "bg-cyan-50 text-cyan-700 ring-cyan-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
};


const fnolStageIndexByStatus: Partial<Record<DocumentUpload["status"], number>> = {
  pending: 0,
  uploading: 0,
  intake_received: 0,
  processing: 1,
  evidence_review: 1,
  extracting: 2,
  data_capture: 2,
  classifying: 2,
  needs_info: 3,
  routing: 3,
  triage: 3,
  completed: 3,
  handoff_ready: 4,
};

function fnolStageState(status: DocumentUpload["status"] | undefined, index: number) {
  if (!status) return "waiting";
  const activeIndex = fnolStageIndexByStatus[status] ?? 0;
  if (status === "error") return index <= activeIndex ? "blocked" : "waiting";
  if (index < activeIndex || status === "handoff_ready") return "complete";
  if (index === activeIndex) return "running";
  return "waiting";
}

const fnolStageStyles = {
  complete: "border-emerald-200 bg-emerald-50",
  running: "border-cyan-300 bg-cyan-50 shadow-[0_0_0_3px_rgba(8,145,178,0.08)]",
  blocked: "border-rose-200 bg-rose-50",
  waiting: "border-slate-200 bg-slate-50",
} as const;

const fnolStageDotStyles = {
  complete: "bg-emerald-600 text-white",
  running: "bg-cyan-600 text-white animate-pulse",
  blocked: "bg-rose-600 text-white",
  waiting: "bg-white text-slate-400",
} as const;

function fnolStageLabel(state: keyof typeof fnolStageStyles) {
  if (state === "complete") return "Done";
  if (state === "running") return "Running now";
  if (state === "blocked") return "Blocked";
  return "Waiting";
}

const normalizeStepStatus = (stateName: string): DocumentUpload["status"] => {
  const state = String(stateName || "").toLowerCase();
  if (state.includes("missing") || state.includes("checklist") || state.includes("needs_info"))
    return "needs_info";
  if (state.includes("triage") || state.includes("route"))
    return "triage";
  if (state.includes("data") || state.includes("extract") || state.includes("read") || state.includes("parse"))
    return "data_capture";
  if (state.includes("evidence") || state.includes("review"))
    return "evidence_review";
  if (state.includes("handoff_ready"))
    return "handoff_ready";
  if (state.includes("handoff"))
    return "triage";
  return "processing";
};

export default function FNOLProcessor() {
  const [uploads, setUploads] = useState<DocumentUpload[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [queueColumnWidth, setQueueColumnWidth] = useState(320);
  const [workflowColumnWidth, setWorkflowColumnWidth] = useState(340);
  const { getWorkspaceModule } = useChatApi();
  const [moduleContract, setModuleContract] = useState<WorkspaceModuleResponse | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);

  const selectedUpload = uploads[selectedIndex];
  const completedCount = uploads.filter(
    (upload) => upload.status === "handoff_ready",
  ).length;
  const activeCount = uploads.filter(
    (upload) => !["handoff_ready", "error"].includes(upload.status),
  ).length;

  const selectedSummary = useMemo(() => {
    if (!selectedUpload) return null;
    const extractedCount = selectedUpload.extractedData
      ? Object.keys(selectedUpload.extractedData).length
      : 0;
    return {
      title: selectedUpload.classification || "FNOL evidence package",
      claimId: selectedUpload.claimId || "Pending claim reference",
      routing: selectedUpload.routing || "Claims intake review",
      extractedCount,
    };
  }, [selectedUpload]);

  const monitorExecution = async (
    executionArn: string,
    uploadIndex: number,
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/fnol-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ executionArn }),
        });

        if (!response.ok) {
          clearInterval(pollInterval);
          return;
        }

        const status = await response.json();

        setUploads((prev) =>
          prev.map((u, idx) => {
            if (idx === uploadIndex) {
              if (status.status === "SUCCEEDED" && status.currentState === "Adjuster handoff") {
                clearInterval(pollInterval);
                const completedUpload = {
                  ...u,
                  status: "handoff_ready" as const,
                  claimId: status.output?.claimId,
                  routing: status.output?.status,
                };
                publishWorkflowEvent({
                  type: "fnol.completed",
                  title: `FNOL completed: ${u.file.name}`,
                  summary: `Intake review completed${completedUpload.claimId ? ` with claim reference ${completedUpload.claimId}` : ""}${completedUpload.routing ? ` and routing ${completedUpload.routing}` : ""}.`,
                  source: "fnol-intake",
                  workflow: "FNOL",
                  status: "completed",
                  entityId: completedUpload.claimId,
                  payload: {
                    fileName: u.file.name,
                    fileSize: u.file.size,
                    claimId: completedUpload.claimId,
                    routing: completedUpload.routing,
                    output: status.output,
                  },
                });
                return completedUpload;
              } else if (status.status === "NEEDS_INFO") {
                clearInterval(pollInterval);
                return {
                  ...u,
                  status: "needs_info" as const,
                  claimId: status.output?.claimId || u.claimId,
                  routing: status.output?.routing || "claims-intake-missing-info",
                };
              } else if (status.status === "FAILED") {
                clearInterval(pollInterval);
                publishWorkflowEvent({
                  type: "fnol.failed",
                  title: `FNOL failed: ${u.file.name}`,
                  summary: "Intake review could not be completed.",
                  source: "fnol-intake",
                  workflow: "FNOL",
                  status: "failed",
                  payload: { fileName: u.file.name, status },
                });
                return { ...u, status: "error" };
              } else {
                return {
                  ...u,
                  status: normalizeStepStatus(status.currentState),
                };
              }
            }
            return u;
          }),
        );
      } catch (error) {
        console.error("Status polling error:", error);
        clearInterval(pollInterval);
      }
    }, 2000);

    setTimeout(() => clearInterval(pollInterval), 300000);
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newUploads: DocumentUpload[] = Array.from(files).map((file) => ({
      file,
      status: "pending",
    }));

    newUploads.forEach((upload) => {
      publishWorkflowEvent({
        type: "fnol.upload.selected",
        title: `FNOL upload selected: ${upload.file.name}`,
        summary: `User selected ${upload.file.name} (${(upload.file.size / 1024 / 1024).toFixed(2)} MB) for intake review.`,
        source: "fnol-intake",
        workflow: "FNOL",
        status: "started",
        payload: {
          fileName: upload.file.name,
          fileSize: upload.file.size,
          fileType: upload.file.type,
        },
      });
    });

    const startIndex = uploads.length;
    setUploads((prev) => [...prev, ...newUploads]);
    setSelectedIndex(startIndex);
    setIsProcessing(true);

    for (let i = 0; i < newUploads.length; i++) {
      const upload = newUploads[i];
      const uploadIndex = startIndex + i;

      try {
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex ? { ...u, status: "uploading" } : u,
          ),
        );

        const formData = new FormData();
        formData.append("document", upload.file);

        const response = await fetch("/api/fnol-processor", {
          method: "POST",
          body: formData,
        });

        if (!response.ok)
          throw new Error(`Intake review failed: ${response.status}`);

        const result = await response.json();

        publishWorkflowEvent({
          type: "fnol.processing.started",
          title: `FNOL review started: ${upload.file.name}`,
          summary: `Intake review started for ${upload.file.name}${result.classification ? `, identified as ${result.classification}` : ""}${result.routing ? `, routed as ${result.routing}` : ""}.`,
          source: "fnol-intake",
          workflow: "FNOL",
          status: "processing",
          entityId: result.claimId,
          payload: {
            fileName: upload.file.name,
            classification: result.classification,
            extractedData: result.extractedData,
            executionArn: result.executionArn,
            routing: result.routing,
          },
        });

        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex
              ? {
                  ...u,
                  status: result.executionArn ? "intake_received" : "evidence_review",
                  classification: result.classification,
                  extractedData: result.extractedData,
                  executionArn: result.executionArn,
                  claimId: result.claimId,
                  routing: result.routing,
                }
              : u,
          ),
        );

        if (result.executionArn) {
          monitorExecution(result.executionArn, uploadIndex);
        }
      } catch (error) {
        publishWorkflowEvent({
          type: "fnol.upload.error",
          title: `FNOL upload error: ${upload.file.name}`,
          summary:
            error instanceof Error
              ? error.message
              : "Unknown FNOL upload or intake review error.",
          source: "fnol-intake",
          workflow: "FNOL",
          status: "failed",
          payload: { fileName: upload.file.name },
        });
        setUploads((prev) =>
          prev.map((u, idx) =>
            idx === uploadIndex ? { ...u, status: "error" } : u,
          ),
        );
      }
    }

    setIsProcessing(false);
    event.target.value = "";
  };

  const startColumnResize = (
    column: "queue" | "workflow",
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth =
      column === "queue" ? queueColumnWidth : workflowColumnWidth;

    if (typeof window === "undefined") return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      const nextWidth =
        column === "queue" ? startWidth + delta : startWidth - delta;
      const clamped = Math.max(260, Math.min(520, nextWidth));
      if (column === "queue") setQueueColumnWidth(clamped);
      else setWorkflowColumnWidth(clamped);
    };

    const onPointerUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  useEffect(() => {
    if (selectedIndex >= uploads.length && uploads.length > 0)
      setSelectedIndex(uploads.length - 1);
  }, [selectedIndex, uploads.length]);

  useEffect(() => {
    let cancelled = false;
    getWorkspaceModule("fnol-intake")
      .then((contract) => {
        if (!cancelled) {
          setModuleContract(contract);
          setModuleError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setModuleError(error instanceof Error ? error.message : "FNOL module contract unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [getWorkspaceModule]);

  return (
    <div className="h-full overflow-hidden bg-[#f5f8fb] p-4 text-slate-900">
      <div className="flex h-full flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/70 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <ModuleConnectionBanner contract={moduleContract} error={moduleError} compact />
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#0B8FA3]">
              Claims operations
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              FNOL Intake
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Capture first notice details, review supporting evidence, identify
              missing information, and prepare a clean adjuster handoff.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-slate-950">
                {uploads.length || sampleQueue.length}
              </div>
              <div className="text-slate-500">Intake items</div>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-cyan-800">
                {activeCount}
              </div>
              <div className="text-cyan-700">Active</div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 shadow-sm">
              <div className="text-lg font-bold text-emerald-800">
                {completedCount}
              </div>
              <div className="text-emerald-700">Handoff ready</div>
            </div>
          </div>
        </div>

        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-x-auto lg:grid-cols-none"
          style={{
            gridTemplateColumns: `${queueColumnWidth}px minmax(360px, 1fr) ${workflowColumnWidth}px`,
          }}
        >
          <section className="relative flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-950">
                    Intake queue
                  </h2>
                  <p className="text-xs text-slate-500">
                    New submissions and evidence packages
                  </p>
                </div>
                <label
                  className={`rounded-full px-3 py-2 text-xs font-bold text-white shadow-sm ${isProcessing ? "cursor-not-allowed bg-slate-400" : "cursor-pointer bg-[#FF7A59] hover:bg-[#E66A4D]"}`}
                >
                  {isProcessing ? "Reviewing…" : "Add files"}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-3">
              {uploads.length === 0 ? (
                <div className="space-y-3">
                  {sampleQueue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-950">
                            {item.id}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {item.insured} · {item.type}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${item.priority === "Critical" ? "bg-rose-50 text-rose-700" : item.priority === "High" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {item.priority}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          {item.status}
                        </span>
                        <span className="text-slate-400">{item.age}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {uploads.map((upload, index) => (
                    <button
                      key={`${upload.file.name}-${index}`}
                      onClick={() => setSelectedIndex(index)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${selectedIndex === index ? "border-[#0B8FA3] bg-[#EAF7F8]" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                          📄
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-slate-950">
                            {upload.file.name}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500">
                            {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusClass(upload.status)}`}
                          >
                            {formatStatus(upload.status)}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              onPointerDown={(event) => startColumnResize("queue", event)}
              className="absolute -right-3 top-4 z-20 hidden h-[calc(100%-2rem)] w-6 cursor-col-resize items-center justify-center rounded-full bg-transparent lg:flex"
              title="Drag to resize intake queue"
            >
              <span className="h-12 w-1 rounded-full bg-slate-300 transition hover:bg-[#0B8FA3]" />
            </div>
          </section>

          <section className="flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-950">
                Intake review
              </h2>
              <p className="text-xs text-slate-500">
                Evidence, extracted details, and next actions
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-auto p-4">
              {!selectedUpload ? (
                <div className="flex h-full flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <div className="text-4xl">📥</div>
                  <h3 className="mt-4 text-lg font-bold text-slate-950">
                    Drop FNOL documents into intake
                  </h3>
                  <p className="mt-2 max-w-md text-sm text-slate-600">
                    Upload loss notices, photos, police reports, invoices, or
                    broker emails. The workspace will organize the details for
                    review and handoff.
                  </p>
                  <label className="mt-5 cursor-pointer rounded-full bg-[#0B8FA3] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#08798A]">
                    Select evidence files
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isProcessing}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff,#f3f8fb)] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Selected item
                        </div>
                        <h3 className="mt-1 text-xl font-bold text-slate-950">
                          {selectedUpload.file.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedSummary?.title}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ring-1 ${statusClass(selectedUpload.status)}`}
                      >
                        {formatStatus(selectedUpload.status)}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <div className="text-xs text-slate-500">
                          Claim reference
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {selectedSummary?.claimId}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <div className="text-xs text-slate-500">
                          Recommended routing
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {selectedSummary?.routing}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
                        <div className="text-xs text-slate-500">
                          Captured fields
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-950">
                          {selectedSummary?.extractedCount || "Pending"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                      <h4 className="text-sm font-bold text-slate-950">
                        Captured details
                      </h4>
                      {selectedUpload.extractedData ? (
                        <div className="mt-3 max-h-72 overflow-auto rounded-2xl border border-slate-100">
                          {Object.entries(selectedUpload.extractedData).map(
                            ([key, value]) => (
                              <div
                                key={key}
                                className="flex justify-between gap-4 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
                              >
                                <span className="font-semibold text-slate-600">
                                  {key}
                                </span>
                                <span className="text-right text-slate-900">
                                  {String(value)}
                                </span>
                              </div>
                            ),
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                          Captured fields will appear here once the intake
                          review completes.
                        </p>
                      )}
                    </div>

                    <div className="rounded-[22px] border border-slate-200 bg-white p-4">
                      <h4 className="text-sm font-bold text-slate-950">
                        Missing information checklist
                      </h4>
                      <div className="mt-3 space-y-2">
                        {(moduleContract?.actions?.map((item) => item.label) || missingInfoChecklist).map((item, index) => (
                          <label
                            key={item}
                            className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              className="mt-1 rounded border-slate-300 text-[#0B8FA3]"
                              defaultChecked={
                                index <
                                (["needs_info", "triage", "handoff_ready", "completed"].includes(selectedUpload.status) ? 1 : 0)
                              }
                            />
                            <span>{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="relative flex min-h-0 flex-col rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div
              onPointerDown={(event) => startColumnResize("workflow", event)}
              className="absolute -left-3 top-4 z-20 hidden h-[calc(100%-2rem)] w-6 cursor-col-resize items-center justify-center rounded-full bg-transparent lg:flex"
              title="Drag to resize workflow panel"
            >
              <span className="h-12 w-1 rounded-full bg-slate-300 transition hover:bg-[#0B8FA3]" />
            </div>
            <div className="border-b border-slate-100 p-4">
              <h2 className="text-sm font-bold text-slate-950">Workflow</h2>
              <p className="text-xs text-slate-500">
                Operational path; handoff is only final-stage output
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              <div className="space-y-3">
                {intakeStages.map((stage, index) => {
                  const state = fnolStageState(selectedUpload?.status, index) as keyof typeof fnolStageStyles;
                  return (
                    <div
                      key={stage.id}
                      className={`relative rounded-2xl border p-4 transition ${fnolStageStyles[state]}`}
                    >
                      <div className="flex gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${fnolStageDotStyles[state]}`}>
                          {state === "complete" ? "✓" : state === "running" ? "●" : stage.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-sm font-bold text-slate-950">
                              {index + 1}. {stage.label}
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${state === "running" ? "bg-cyan-600 text-white" : state === "complete" ? "bg-emerald-600 text-white" : state === "blocked" ? "bg-rose-600 text-white" : "bg-white text-slate-500"}`}>
                              {fnolStageLabel(state)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs leading-5 text-slate-600">
                            {stage.detail}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[22px] border border-cyan-100 bg-cyan-50 p-4">
                <h3 className="text-sm font-bold text-cyan-950">
                  Handoff rules
                </h3>
                <p className="mt-2 text-sm leading-6 text-cyan-900">
                  Do not mark an upload ready for adjuster until evidence review,
                  data capture, missing-information checks, and triage are complete.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
