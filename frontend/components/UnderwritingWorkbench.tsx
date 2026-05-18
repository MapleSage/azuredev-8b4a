import { useEffect, useMemo, useRef, useState } from "react";
import { useChatApi, type WorkspaceModuleResponse } from "../lib/api-client";
import ModuleConnectionBanner from "./ModuleConnectionBanner";

type JobStatus = "complete" | "processing" | "queued" | "failed";
type AnalysisTab = "document" | "underwriting";
type UwStepId = "intake" | "job" | "extraction" | "risk" | "recommendation" | "result";

interface SubmissionJob {
  id: string;
  fileName: string;
  submittedAt: string;
  producer: string;
  insuranceType: string;
  status: JobStatus;
  riskScore: number;
  premium: string;
  analysisSummary?: string;
  currentStep?: UwStepId;
}

const submissions: SubmissionJob[] = [
  {
    id: "job-c8e6-1142",
    fileName: "harborline-commercial-package.pdf",
    submittedAt: "May 13, 2026 · 10:45 PM",
    producer: "Harborline Logistics",
    insuranceType: "Commercial package",
    status: "complete",
    riskScore: 72,
    premium: "$184K",
    currentStep: "result",
  },
  {
    id: "job-a91f-8307",
    fileName: "mason-property-renewal.pdf",
    submittedAt: "May 13, 2026 · 10:44 PM",
    producer: "Mason Property Group",
    insuranceType: "Property renewal",
    status: "processing",
    riskScore: 58,
    premium: "$96K",
    currentStep: "risk",
  },
  {
    id: "job-7bf4-2210",
    fileName: "crescent-retail-slip.pdf",
    submittedAt: "May 13, 2026 · 10:43 PM",
    producer: "Crescent Retail LLC",
    insuranceType: "Retail package",
    status: "queued",
    riskScore: 41,
    premium: "$42K",
    currentStep: "intake",
  },
];

const extractedFields = [
  { label: "Applicant", value: "Harborline Logistics", confidence: "98%" },
  {
    label: "Coverage requested",
    value: "$5.2M property · $2M liability",
    confidence: "94%",
  },
  { label: "Locations", value: "4 coastal warehouse sites", confidence: "91%" },
  {
    label: "Prior losses",
    value: "2 water intrusion claims in 36 months",
    confidence: "89%",
  },
];

const riskFindings = [
  {
    severity: "high",
    text: "Coastal flood exposure is elevated for two locations without complete mitigation notes.",
  },
  {
    severity: "moderate",
    text: "Prior water losses require updated maintenance evidence before binding.",
  },
  {
    severity: "moderate",
    text: "Requested limit exceeds standard authority and should route to manager referral.",
  },
  {
    severity: "low",
    text: "Security controls and sprinkler inspection documentation are current.",
  },
];


const underwritingStages: Array<{ id: UwStepId; label: string; detail: string }> = [
  { id: "intake", label: "Submission intake", detail: "Broker slip and attachments received" },
  { id: "job", label: "Create underwriting job", detail: "Durable job reference and review queue created" },
  { id: "extraction", label: "Extract submission facts", detail: "Applicant, limits, locations, loss history, and coverage facts captured" },
  { id: "risk", label: "Run risk analysis", detail: "Exposure, authority, appetite, and referral signals evaluated" },
  { id: "recommendation", label: "Generate recommendation", detail: "Decision rationale and producer follow-up prepared" },
  { id: "result", label: "Persist result", detail: "Final score, reference, and next actions saved" },
];

const uwStepIndex = Object.fromEntries(underwritingStages.map((stage, index) => [stage.id, index])) as Record<UwStepId, number>;

function underwritingStepState(job: SubmissionJob | undefined, step: UwStepId) {
  if (!job) return "waiting";
  const currentIndex = uwStepIndex[job.currentStep || (job.status === "complete" ? "result" : job.status === "queued" ? "intake" : "risk")];
  const stepIndex = uwStepIndex[step];
  if (job.status === "failed") return stepIndex <= currentIndex ? "blocked" : "waiting";
  if (job.status === "complete") return "complete";
  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "running";
  return "waiting";
}

const uwStageStyles = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  running: "border-blue-300 bg-blue-50 text-blue-800 shadow-[0_0_0_3px_rgba(37,99,235,0.08)]",
  blocked: "border-red-200 bg-red-50 text-red-800",
  waiting: "border-slate-200 bg-slate-50 text-slate-500",
} as const;

function uwStepLabel(state: keyof typeof uwStageStyles) {
  if (state === "complete") return "Done";
  if (state === "running") return "Running now";
  if (state === "blocked") return "Blocked";
  return "Waiting";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusStyles: Record<JobStatus, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-slate-200 bg-slate-50 text-slate-600",
  failed: "border-red-200 bg-red-50 text-red-700",
};

const severityStyles: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-100",
  moderate: "bg-amber-50 text-amber-700 border-amber-100",
  low: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function StatusPill({ status }: { status: JobStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function RiskBadge({ value }: { value: number }) {
  const tone =
    value >= 70
      ? "bg-red-50 text-red-700 border-red-100"
      : value >= 50
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-emerald-50 text-emerald-700 border-emerald-100";
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tone}`}
    >
      {value}% risk
    </span>
  );
}

export default function UnderwritingWorkbench() {
  const [jobs, setJobs] = useState<SubmissionJob[]>(submissions);
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(submissions[0].id);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("underwriting");
  const [analysisWidth, setAnalysisWidth] = useState(460);
  const [showToast, setShowToast] = useState(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { getWorkspaceModule } = useChatApi();
  const [moduleContract, setModuleContract] = useState<WorkspaceModuleResponse | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWorkspaceModule("underwriting-workbench")
      .then((contract) => {
        if (!cancelled) {
          setModuleContract(contract);
          setModuleError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) setModuleError(error instanceof Error ? error.message : "Underwriting module contract unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [getWorkspaceModule]);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) =>
      [job.fileName, job.producer, job.insuranceType, job.id].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [jobs, search]);

  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) || jobs[0];

  const markJobStep = (jobId: string, currentStep: UwStepId, status: JobStatus = "processing", summary?: string) => {
    setJobs((prev) => prev.map((job) => job.id === jobId ? {
      ...job,
      status,
      currentStep,
      analysisSummary: summary || job.analysisSummary,
    } : job));
  };

  const handleUnderwritingUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const jobId = `job-${Date.now()}`;
    const newJob: SubmissionJob = {
      id: jobId,
      fileName: file.name,
      submittedAt: new Date().toLocaleString(),
      producer: "Uploaded submission",
      insuranceType: "Underwriting submission",
      status: "processing",
      riskScore: 0,
      premium: "Pending",
      analysisSummary: "Submission intake received. Creating underwriting job.",
      currentStep: "intake",
    };
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJobId(jobId);
    setShowToast(false);
    try {
      await sleep(450);
      markJobStep(jobId, "job", "processing", "Underwriting job created. Extracting submission facts.");
      const text = await file.text().catch(() => "");
      await sleep(450);
      markJobStep(jobId, "extraction", "processing", "Submission facts are being extracted from the broker slip.");
      const response = await fetch("/api/underwriting/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "Analyze this broker slip or underwriting submission. Return risk score, recommendation, key risks, confidence, and referral guidance.",
          context: text || `${file.name} (${file.type || "unknown type"}, ${file.size} bytes)`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || `Underwriting analysis failed: ${response.status}`);
      await sleep(450);
      markJobStep(jobId, "risk", "processing", "Risk analysis is running against exposure, authority, and appetite signals.");
      const score = Number(result?.analysis?.score ?? result?.score ?? result?.risk_score ?? 65);
      const summary = result?.answer || result?.analysis?.final_recommendation || result?.recommendation || "Underwriting analysis completed.";
      await sleep(450);
      markJobStep(jobId, "recommendation", "processing", "Recommendation and producer follow-up are being prepared.");
      await sleep(450);
      setJobs((prev) => prev.map((job) => job.id === jobId ? {
        ...job,
        id: result?.jobId || result?.reference || job.id,
        status: "complete",
        currentStep: "result",
        riskScore: Number.isFinite(score) ? score : 65,
        premium: "Review",
        analysisSummary: summary,
      } : job));
      setSelectedJobId(result?.jobId || result?.reference || jobId);
      setShowToast(true);
    } catch (error) {
      setJobs((prev) => prev.map((job) => job.id === jobId ? {
        ...job,
        status: "failed",
        currentStep: job.currentStep || "risk",
        analysisSummary: error instanceof Error ? error.message : "Underwriting analysis failed.",
      } : job));
    } finally {
      event.target.value = "";
    }
  };

  const startAnalysisResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = analysisWidth;

    if (typeof window === "undefined") return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = startX - moveEvent.clientX;
      setAnalysisWidth(Math.max(340, Math.min(680, startWidth + delta)));
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

  return (
    <div className="relative h-full overflow-auto bg-[#EEF5FC] text-[#172B4D]">
      {showToast && selectedJob.status === "complete" && (
        <div className="absolute right-6 top-6 z-30 w-[360px] rounded-2xl border border-[#DDE7F2] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.18)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2FF] text-lg text-[#2563EB]">
                ✓
              </span>
              <div>
                <div className="font-bold text-[#172B4D]">
                  Analysis complete
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Your document has been analyzed and underwriting results are
                  ready for review.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowToast(false)}
              className="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              ×
            </button>
          </div>
          <div className="mt-4 rounded-xl bg-[#EEF6FF] p-3 text-xs text-slate-700">
            <span className="font-bold text-[#F59E0B]">Analysis summary:</span>{" "}
            Manager referral recommended due to coastal exposure and requested
            limits.
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1500px] p-6">
        <div className="mb-4">
          <ModuleConnectionBanner contract={moduleContract} error={moduleError} compact />
        </div>
        <header className="rounded-2xl border border-[#DDE7F2] bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#DDE7F2] bg-white p-1 shadow-sm">
                <img
                  src="/brand/sagesure-mark.png"
                  alt="SageSure"
                  className="h-9 w-9 object-contain"
                />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0B8FA3]">
                  SageSure
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">
                  Underwriting Workbench
                </h1>
                <p className="text-sm text-slate-500">
                  Submission triage, document analysis, risk scoring, and
                  referral workflow.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.doc,.docx,.json,.csv"
                onChange={handleUnderwritingUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1E40AF]"
              >
                Upload New
              </button>
              <button className="rounded-full border border-[#0B1F3A] bg-white px-4 py-2 text-sm font-bold text-[#0B1F3A] hover:bg-[#EAF2FF]">
                View All Jobs
              </button>
              <button className="rounded-full border border-[#CBD6E2] bg-[#F5F8FA] px-3 py-2 text-sm font-bold text-[#33475B]">
                EN
              </button>
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#DDE7F2] bg-white shadow-sm">
              <div className="border-b border-[#EAF0F6] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-[#172B4D]">
                      Your analysis jobs
                    </h2>
                    <p className="text-xs text-slate-500">
                      Grouped by recent submissions
                    </p>
                  </div>
                  <span className="rounded-full bg-[#EAF7F8] px-2.5 py-1 text-xs font-bold text-[#007A8A]">
                    {filteredSubmissions.length} active
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-9 min-w-0 flex-1 rounded-md border border-[#CBD6E2] px-3 text-sm outline-none focus:border-[#0B9CAF] focus:ring-2 focus:ring-[#DDF3F5]"
                    placeholder="Search by filename"
                  />
                  <button
                    onClick={() => setSearch("")}
                    className="rounded-md border border-[#CBD6E2] px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="rounded-xl border-l-4 border-[#2563EB] bg-[#F8FBFD] p-3">
                  <button className="flex w-full items-center justify-between text-left text-sm font-bold text-[#172B4D]">
                    <span>Submission · May 13, 2026</span>
                    <span className="text-slate-400">⌄</span>
                  </button>
                  <div className="mt-3 space-y-2">
                    {filteredSubmissions.map((job) => {
                      const active = job.id === selectedJobId;
                      return (
                        <button
                          key={job.id}
                          onClick={() => {
                            setSelectedJobId(job.id);
                            setShowToast(job.status === "complete");
                          }}
                          className={`flex w-full overflow-hidden rounded-xl border text-left transition hover:border-[#2563EB] hover:shadow-sm ${active ? "border-[#2563EB] bg-[#EAF2FF]" : "border-[#EAF0F6] bg-white"}`}
                        >
                          <span className="flex w-14 shrink-0 items-center justify-center bg-[#2563EB] text-xl text-white">
                            📄
                          </span>
                          <span className="min-w-0 flex-1 p-3">
                            <span className="block truncate text-sm font-bold text-[#172B4D]">
                              {job.fileName}
                            </span>
                            <span className="mt-1 block text-xs text-slate-500">
                              {job.submittedAt}
                            </span>
                            <span className="mt-2 flex flex-wrap items-center gap-2">
                              <StatusPill status={job.status} />
                              <RiskBadge value={job.riskScore} />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#DDE7F2] bg-white p-4 shadow-sm">
              <h3 className="font-bold text-[#172B4D]">Submission setup</h3>
              <div className="mt-3 space-y-2">
                {[
                  "Commercial package",
                  "Property renewal",
                  "Marine cargo",
                  "Cyber liability",
                ].map((type) => (
                  <button
                    key={type}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition ${type === selectedJob.insuranceType ? "border-[#2563EB] bg-[#EAF2FF] text-[#1E40AF]" : "border-[#EAF0F6] hover:border-[#BEE7EA] hover:bg-[#F8FBFD]"}`}
                  >
                    <span className="block font-bold">{type}</span>
                    <span className="text-xs text-slate-500">
                      Risk appetite, limits, and evidence rules
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main
            className="grid min-h-[760px] gap-0 overflow-hidden rounded-2xl border border-[#DDE7F2] bg-white shadow-sm"
            style={{
              gridTemplateColumns: `minmax(360px, 1fr) ${analysisWidth}px`,
            }}
          >
            <section className="min-w-0 bg-[#F4F8FC]">
              <div className="flex items-center justify-between border-b border-[#DDE7F2] bg-white px-4 py-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Processing job {selectedJob.id}
                  </div>
                  <div className="font-bold text-[#172B4D]">
                    {selectedJob.fileName}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                    disabled
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page 1 of 8
                  </span>
                  <button className="rounded-md bg-[#2563EB] px-3 py-1.5 text-xs font-bold text-white">
                    Next
                  </button>
                  <span className="rounded-md border border-[#CBD6E2] bg-white px-2 py-1.5 text-xs font-bold text-slate-600">
                    100%
                  </span>
                </div>
              </div>

              <div className="flex min-h-[690px] items-start justify-center overflow-auto p-8">
                <div className="min-h-[620px] w-full max-w-[720px] rounded-xl border border-[#DDE7F2] bg-white p-8 shadow-sm">
                  <div className="border-b border-slate-200 pb-5">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      Broker slip preview
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-[#172B4D]">
                      {selectedJob.producer}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedJob.insuranceType} · Requested premium indication{" "}
                      {selectedJob.premium}
                    </p>
                  </div>
                  <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
                    <p>
                      This preview area mirrors the WorkBench document viewer
                      pattern while keeping the greenfield app private and
                      native to this frontend.
                    </p>
                    <p>
                      Key submission facts, loss history, location schedules,
                      coverage forms, and prior carrier notes appear here for
                      side-by-side review with the AI analysis panel.
                    </p>
                    <div className="rounded-xl border border-dashed border-[#B7D6F7] bg-[#F8FBFD] p-5 text-center text-slate-500">
                      Source PDF canvas / extracted policy packet placeholder
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="relative border-l border-[#DDE7F2] bg-white">
              <div
                onPointerDown={startAnalysisResize}
                className="absolute -left-3 top-4 z-20 flex h-[calc(100%-2rem)] w-6 cursor-col-resize items-center justify-center rounded-full bg-transparent"
                title="Drag to resize analysis panel"
              >
                <span className="h-14 w-1 rounded-full bg-slate-300 transition hover:bg-[#2563EB]" />
              </div>
              <div className="border-b border-[#EAF0F6] p-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F4F8FC] p-1">
                  <button
                    onClick={() => setAnalysisTab("document")}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${analysisTab === "document" ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Document Analysis
                  </button>
                  <button
                    onClick={() => setAnalysisTab("underwriting")}
                    className={`rounded-lg px-3 py-2 text-sm font-bold ${analysisTab === "underwriting" ? "bg-white text-[#2563EB] shadow-sm" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    Underwriting
                  </button>
                </div>
              </div>

              <div className="h-[690px] overflow-auto p-5">
                {analysisTab === "document" ? (
                  <div className="space-y-3">
                    {extractedFields.map((field) => (
                      <details
                        key={field.label}
                        className="rounded-xl border border-[#EAF0F6] bg-white p-4 shadow-sm"
                        open={field.label === "Applicant"}
                      >
                        <summary className="cursor-pointer list-none font-bold text-[#172B4D]">
                          <span className="mr-2 text-[#2563EB]">▣</span>
                          {field.label}
                          <span className="float-right text-xs font-bold text-[#0B8FA3]">
                            {field.confidence}
                          </span>
                        </summary>
                        <p className="mt-3 text-sm text-slate-600">
                          {field.value}
                        </p>
                      </details>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#DDE7F2] bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-[#172B4D]">Underwriting process</h3>
                          <p className="mt-1 text-xs text-slate-500">Live six-step job path from intake through persisted result.</p>
                        </div>
                        <StatusPill status={selectedJob.status} />
                      </div>
                      <div className="mt-4 space-y-2">
                        {underwritingStages.map((stage, index) => {
                          const state = underwritingStepState(selectedJob, stage.id) as keyof typeof uwStageStyles;
                          return (
                            <div key={stage.id} className={`rounded-xl border p-3 transition ${uwStageStyles[state]}`}>
                              <div className="flex items-start gap-3">
                                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === "complete" ? "bg-emerald-600 text-white" : state === "running" ? "bg-blue-600 text-white animate-pulse" : state === "blocked" ? "bg-red-600 text-white" : "bg-white text-slate-400"}`}>
                                  {state === "complete" ? "✓" : index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-bold">{stage.label}</span>
                                    <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{uwStepLabel(state)}</span>
                                  </span>
                                  <span className="mt-1 block text-xs leading-5 opacity-80">{stage.detail}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#DDE7F2] border-l-4 border-l-[#2563EB] bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3 border-b border-[#EAF0F6] pb-4">
                        <div>
                          <div className="flex items-center gap-2 font-bold text-[#172B4D]">
                            <span className="text-[#2563EB]">▣</span> Risk
                            Assessment
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            AI-assisted recommendation for authority review
                          </p>
                        </div>
                        <RiskBadge value={selectedJob.riskScore} />
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedJob.analysisSummary && (
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-slate-700">
                            {selectedJob.analysisSummary}
                          </div>
                        )}
                        {riskFindings.map((finding) => (
                          <div
                            key={finding.text}
                            className="flex gap-3 text-sm leading-6 text-slate-700"
                          >
                            <span
                              className={`mt-0.5 h-fit rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${severityStyles[finding.severity]}`}
                            >
                              {finding.severity}
                            </span>
                            <span>{finding.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#DDE7F2] bg-[#F8FBFD] p-5">
                      <h3 className="font-bold text-[#172B4D]">
                        Recommended next actions
                      </h3>
                      <div className="mt-3 grid gap-2">
                        {(moduleContract?.actions?.map((item) => item.label) || [
                          "Request updated flood mitigation evidence",
                          "Route to manager referral queue",
                          "Draft producer follow-up email",
                        ]).map((action) => (
                          <button
                            key={action}
                            className="rounded-xl border border-[#DDE7F2] bg-white p-3 text-left text-sm font-semibold text-[#006D84] hover:border-[#7FD1DE] hover:bg-[#EAF7F8]"
                          >
                            ✦ {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </main>
        </section>
      </div>
    </div>
  );
}
