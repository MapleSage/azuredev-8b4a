import { useMemo, useState } from "react";

type JobStatus = "complete" | "processing" | "queued" | "failed";
type AnalysisTab = "document" | "underwriting";

interface SubmissionJob {
  id: string;
  fileName: string;
  submittedAt: string;
  producer: string;
  insuranceType: string;
  status: JobStatus;
  riskScore: number;
  premium: string;
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
  const [search, setSearch] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(submissions[0].id);
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>("underwriting");
  const [analysisWidth, setAnalysisWidth] = useState(460);
  const [showToast, setShowToast] = useState(true);

  const filteredSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return submissions;
    return submissions.filter((job) =>
      [job.fileName, job.producer, job.insuranceType, job.id].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search]);

  const selectedJob =
    submissions.find((job) => job.id === selectedJobId) || submissions[0];

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
              <button className="rounded-full bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1E40AF]">
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
                        {[
                          "Request updated flood mitigation evidence",
                          "Route to manager referral queue",
                          "Draft producer follow-up email",
                        ].map((action) => (
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
