import React from "react";

interface SageSureDashboardProps {
  user?: any;
  role?: string;
  activeView?: string;
  onNavigate: (tab: string) => void;
}

const metricsByView: Record<
  string,
  Array<{ label: string; value: string; trend: string; tone: string }>
> = {
  home: [
    {
      label: "Claims received today",
      value: "142",
      trend: "+8 vs yesterday",
      tone: "blue",
    },
    {
      label: "FNOL pending review",
      value: "37",
      trend: "9 high priority",
      tone: "amber",
    },
    {
      label: "UW submissions",
      value: "21",
      trend: "3 manager referrals",
      tone: "purple",
    },
    {
      label: "SLA risk items",
      value: "14",
      trend: "Needs attention",
      tone: "red",
    },
  ],
  "claims-queue": [
    {
      label: "All open claims",
      value: "284",
      trend: "31 assigned to me",
      tone: "blue",
    },
    {
      label: "CAT claims",
      value: "19",
      trend: "Storm watch active",
      tone: "amber",
    },
    {
      label: "Payment review",
      value: "11",
      trend: "$420K reserves",
      tone: "purple",
    },
    { label: "SLA breach risk", value: "7", trend: "Due today", tone: "red" },
  ],
  "uw-queue": [
    {
      label: "New submissions",
      value: "64",
      trend: "18 unassigned",
      tone: "blue",
    },
    {
      label: "Missing docs",
      value: "22",
      trend: "Producer follow-up",
      tone: "amber",
    },
    { label: "High risk", value: "8", trend: "Manager review", tone: "red" },
    {
      label: "Ready to bind",
      value: "15",
      trend: "Within authority",
      tone: "green",
    },
  ],
  scamshield: [
    {
      label: "Messages screened",
      value: "1,248",
      trend: "42 risky",
      tone: "blue",
    },
    {
      label: "High-risk fraud",
      value: "12",
      trend: "Escalate today",
      tone: "red",
    },
    {
      label: "Safe replies drafted",
      value: "86",
      trend: "WhatsApp ready",
      tone: "green",
    },
    {
      label: "Open evidence packs",
      value: "19",
      trend: "Needs review",
      tone: "amber",
    },
  ],
  "policy-pulse": [
    {
      label: "Policies analyzed",
      value: "386",
      trend: "64 red flags",
      tone: "purple",
    },
    {
      label: "Coverage gaps",
      value: "27",
      trend: "Explain to customer",
      tone: "amber",
    },
    {
      label: "Plain-language summaries",
      value: "142",
      trend: "Ready to send",
      tone: "green",
    },
    { label: "Renewal risk", value: "18", trend: "Act this week", tone: "red" },
  ],
  "claims-defender": [
    {
      label: "Denials reviewed",
      value: "58",
      trend: "11 contestable",
      tone: "blue",
    },
    {
      label: "Evidence gaps",
      value: "23",
      trend: "Checklist generated",
      tone: "amber",
    },
    {
      label: "Complaints drafted",
      value: "9",
      trend: "Ombudsman-ready",
      tone: "purple",
    },
    { label: "Resolved", value: "16", trend: "Customer relief", tone: "green" },
  ],
  "document-vault": [
    {
      label: "Evidence packages",
      value: "734",
      trend: "Indexed",
      tone: "blue",
    },
    {
      label: "Pending signatures",
      value: "21",
      trend: "Mobile follow-up",
      tone: "amber",
    },
    {
      label: "Validated documents",
      value: "412",
      trend: "Ready for workflow",
      tone: "green",
    },
    { label: "Exceptions", value: "7", trend: "Review quality", tone: "red" },
  ],
  renewals: [
    { label: "Renewals due", value: "96", trend: "Next 30 days", tone: "blue" },
    { label: "At-risk churn", value: "14", trend: "Call today", tone: "red" },
    {
      label: "Better-fit options",
      value: "38",
      trend: "Quote assist",
      tone: "purple",
    },
    { label: "Completed", value: "52", trend: "This month", tone: "green" },
  ],
  "buying-assistance": [
    {
      label: "Shopping sessions",
      value: "183",
      trend: "Guided journeys",
      tone: "blue",
    },
    { label: "Missing facts", value: "31", trend: "Ask next", tone: "amber" },
    {
      label: "Recommended products",
      value: "76",
      trend: "Ready to quote",
      tone: "green",
    },
    { label: "Needs advisor", value: "12", trend: "Escalate", tone: "red" },
  ],
  governance: [
    {
      label: "Tenant workspaces",
      value: "24",
      trend: "Namespace isolated",
      tone: "blue",
    },
    {
      label: "Approval gates",
      value: "16",
      trend: "Regulated actions",
      tone: "amber",
    },
    {
      label: "Audit events",
      value: "9.8K",
      trend: "Last 24 hours",
      tone: "purple",
    },
    {
      label: "Policy exceptions",
      value: "0",
      trend: "No critical drift",
      tone: "green",
    },
  ],
};

const toneClasses: Record<string, { card: string; pill: string; dot: string }> =
  {
    blue: {
      card: "border-[#D5EEF1]",
      pill: "bg-[#EAF7F8] text-[#007A8A]",
      dot: "bg-[#0AA6B5]",
    },
    amber: {
      card: "border-[#FFE1D6]",
      pill: "bg-[#FFF1EC] text-[#C85537]",
      dot: "bg-[#FF9B7D]",
    },
    purple: {
      card: "border-[#E1E5F6]",
      pill: "bg-[#F4F6FF] text-[#5F6DA8]",
      dot: "bg-[#7B88C7]",
    },
    red: {
      card: "border-[#F8D8D8]",
      pill: "bg-[#FFF0F0] text-[#B84A4A]",
      dot: "bg-[#D85C5C]",
    },
    green: {
      card: "border-[#D5F0E9]",
      pill: "bg-[#ECFAF6] text-[#0B7F67]",
      dot: "bg-[#0EA487]",
    },
  };

const savedViews = [
  "Assigned to me",
  "High priority",
  "Missing documents",
  "SLA risk",
  "Completed today",
];

const quickActions = [
  {
    id: "claims",
    title: "New claim conversation",
    description: "Lookup policy, explain coverage, or draft notes",
    icon: "⚡",
  },
  {
    id: "fnol",
    title: "Submit FNOL",
    description: "Collect loss details and upload supporting docs",
    icon: "📄",
  },
  {
    id: "underwriting",
    title: "Risk review",
    description: "Analyze submissions and referral exceptions",
    icon: "📋",
  },
  {
    id: "policy-pulse",
    title: "Run Policy Pulse",
    description: "Explain coverage and surface policy red flags",
    icon: "📑",
  },
  {
    id: "scamshield",
    title: "Screen suspicious message",
    description: "Classify fraud risk and draft a safe reply",
    icon: "◈",
  },
];

const queueRows = [
  {
    object: "CLM-2026-10482",
    insured: "Mason Property Group",
    type: "Water damage",
    status: "Pending docs",
    owner: "A. Patel",
    priority: "High",
    updated: "4 min ago",
  },
  {
    object: "UW-2026-7731",
    insured: "Harborline Logistics",
    type: "Marine cargo",
    status: "Risk review",
    owner: "N. Dutta",
    priority: "Medium",
    updated: "18 min ago",
  },
  {
    object: "FNOL-2026-2219",
    insured: "Elena Garcia",
    type: "Wind / roof",
    status: "Extracted",
    owner: "Unassigned",
    priority: "Critical",
    updated: "27 min ago",
  },
  {
    object: "POL-88A421",
    insured: "Crescent Retail LLC",
    type: "Renewal",
    status: "Ready",
    owner: "M. Singh",
    priority: "Low",
    updated: "1 hr ago",
  },
  {
    object: "CLM-2026-10422",
    insured: "Northlake Foods",
    type: "Fire",
    status: "Payment review",
    owner: "R. Chen",
    priority: "High",
    updated: "2 hr ago",
  },
];

const aiRecommendations = [
  "Summarize CLM-2026-10482 and identify missing documents",
  "Draft producer follow-up for UW-2026-7731",
  "Review FNOL-2026-2219 for severity and CAT indicators",
];

const viewTitles: Record<string, string> = {
  home: "Operations Home",
  tasks: "My Tasks",
  ai: "SageSure AI Command Center",
  "claims-queue": "Claims Queue",
  "uw-queue": "Underwriting Queue",
  producer: "Producer Workspace",
  scamshield: "ScamShield",
  "policy-pulse": "Policy Pulse",
  "claims-defender": "Claims Defender",
  "document-vault": "Document Vault",
  renewals: "Renewals",
  "buying-assistance": "Buying Assistance",
  governance: "Governance & Controls",
};

const consumerWorkflows: Record<
  string,
  Array<{ title: string; description: string; action: string; tone: string }>
> = {
  scamshield: [
    {
      title: "Fraud risk classifier",
      description:
        "Analyze suspicious SMS, WhatsApp, email, or call transcript patterns using the ScamShield engine concepts.",
      action: "Screen message",
      tone: "red",
    },
    {
      title: "Safe reply builder",
      description:
        "Generate a calm next-step response that avoids sharing OTPs, policy IDs, or payment details.",
      action: "Draft reply",
      tone: "green",
    },
    {
      title: "Evidence bundle",
      description:
        "Collect screenshots, phone numbers, timestamps, and complaint notes for audit or escalation.",
      action: "Open bundle",
      tone: "blue",
    },
  ],
  "policy-pulse": [
    {
      title: "Plain-language policy summary",
      description:
        "Turn policy PDFs into coverage, exclusions, deductibles, waiting periods, and renewal checkpoints.",
      action: "Analyze policy",
      tone: "blue",
    },
    {
      title: "Red flag report",
      description:
        "Use Policy Pulse style rules to highlight gaps, unusual exclusions, claim limits, and confusing language.",
      action: "Review red flags",
      tone: "amber",
    },
    {
      title: "Customer explainer",
      description:
        "Prepare a WhatsApp-ready explanation with what is covered, what is not, and what to ask next.",
      action: "Draft explainer",
      tone: "green",
    },
  ],
  "claims-defender": [
    {
      title: "Denial letter parser",
      description:
        "Extract denial reasons, cited clauses, deadlines, missing evidence, and appeal opportunities.",
      action: "Parse denial",
      tone: "purple",
    },
    {
      title: "Evidence checklist",
      description:
        "Compute completeness and list documents needed before complaint or escalation.",
      action: "Build checklist",
      tone: "amber",
    },
    {
      title: "Complaint draft",
      description:
        "Create a structured ombudsman or insurer complaint with precedent references and next steps.",
      action: "Draft complaint",
      tone: "red",
    },
  ],
  "document-vault": [
    {
      title: "Mobile evidence intake",
      description:
        "Upload photos, PDFs, email attachments, signatures, and claim/policy packets into one timeline.",
      action: "Add documents",
      tone: "blue",
    },
    {
      title: "Validation queue",
      description:
        "Flag unreadable images, missing signatures, duplicate forms, and policy packet exceptions.",
      action: "Validate docs",
      tone: "amber",
    },
    {
      title: "Workflow handoff",
      description:
        "Route clean packets to FNOL, underwriting, Policy Pulse, or Claims Defender.",
      action: "Route packet",
      tone: "green",
    },
  ],
  renewals: [
    {
      title: "Renewal pulse",
      description:
        "Track policies approaching renewal and explain premium, coverage, and document changes.",
      action: "Review renewals",
      tone: "blue",
    },
    {
      title: "Retention queue",
      description:
        "Prioritize customers with price shock, missing docs, or coverage-risk indicators.",
      action: "Open queue",
      tone: "red",
    },
    {
      title: "Advisor note",
      description:
        "Draft next-best-action scripts for producer/customer follow-up.",
      action: "Draft note",
      tone: "green",
    },
  ],
  "buying-assistance": [
    {
      title: "Needs discovery",
      description:
        "Guide customers through property, motor, health, business, marine, or cyber coverage needs.",
      action: "Start guide",
      tone: "blue",
    },
    {
      title: "Product fit",
      description:
        "Map requirements to recommended coverage categories and explain tradeoffs plainly.",
      action: "Compare options",
      tone: "purple",
    },
    {
      title: "Quote handoff",
      description:
        "Package facts for a producer, broker, or underwriter without losing conversation context.",
      action: "Prepare handoff",
      tone: "green",
    },
  ],
  governance: [
    {
      title: "Tenant isolation posture",
      description:
        "Show per-broker namespace, workload identity, network policy, quota, and runtime isolation status without exposing backend internals to business users.",
      action: "Review posture",
      tone: "blue",
    },
    {
      title: "Human approval controls",
      description:
        "Track claim submission, policy change, customer messaging, payment, and external-write actions that require maker-checker review.",
      action: "Open approvals",
      tone: "amber",
    },
    {
      title: "Audit and policy evidence",
      description:
        "Package tool-call traces, document events, access decisions, image provenance, and policy checks for insurer IT or regulator review.",
      action: "Export evidence",
      tone: "green",
    },
  ],
};

const analyticsPanels = [
  {
    title: "Claims intake trend",
    subtitle: "Last 7 days · daily",
    value: "1,284",
    delta: "+6.8%",
    stroke: "#0AA6B5",
    fill: "#DDF3F5",
    points: "0,58 42,48 84,52 126,33 168,40 210,22 252,28",
  },
  {
    title: "FNOL source mix",
    subtitle: "Portal · WhatsApp · Manual",
    value: "37 pending",
    delta: "9 priority",
    stroke: "#FF7A59",
    fill: "#FFEDE7",
    points: "0,46 42,30 84,38 126,25 168,31 210,18 252,12",
  },
];

function MiniAnalyticsPanel({
  panel,
}: {
  panel: (typeof analyticsPanels)[number];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#24384A]">{panel.title}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {panel.subtitle}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#24384A]">{panel.value}</div>
          <div className="text-xs font-bold text-[#008FA1]">{panel.delta}</div>
        </div>
      </div>
      <svg
        viewBox="0 0 252 76"
        className="mt-4 h-24 w-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d={`M0 70 L${panel.points.replaceAll(" ", " L")} L252 76 L0 76 Z`}
          fill={panel.fill}
          opacity="0.9"
        />
        <polyline
          points={panel.points}
          fill="none"
          stroke={panel.stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {panel.points.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return (
            <circle
              key={point}
              cx={cx}
              cy={cy}
              r="3.5"
              fill="white"
              stroke={panel.stroke}
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}

function badgeClass(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("critical") || lower.includes("high"))
    return "bg-red-50 text-red-700 border-red-100";
  if (lower.includes("pending") || lower.includes("review"))
    return "bg-amber-50 text-amber-700 border-amber-100";
  if (lower.includes("ready") || lower.includes("extracted"))
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function SageSureDashboard({
  user,
  role = "customer",
  activeView = "home",
  onNavigate,
}: SageSureDashboardProps) {
  const displayName = user?.name || user?.username || "there";
  const metrics = metricsByView[activeView] || metricsByView.home;
  const viewTitle = viewTitles[activeView] || "Operations Home";
  const consumerCards = consumerWorkflows[activeView] || [];

  return (
    <div className="h-full overflow-auto bg-[#f5f8fb]">
      <div className="border-b border-slate-200 bg-white px-7 py-6">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#008FA1]">
              <span className="rounded-full bg-[#EAF7F8] px-2 py-1">
                {role}
              </span>
              <span>SageSure Insurance Operations</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#24384A]">
              {viewTitle}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Welcome back
              {displayName !== "there" ? `, ${displayName.split(" ")[0]}` : ""}.
              This workspace adapts to your role and surfaces the queues, AI
              actions, and records you can access.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate("fnol")}
              className="rounded-md bg-[#FF7A59] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#E66A4D]"
            >
              Create FNOL
            </button>
            <button
              onClick={() => onNavigate("underwriting")}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              New UW review
            </button>
            <button
              onClick={() => onNavigate("claims")}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Ask AI
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-7">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const tone = toneClasses[metric.tone];
            return (
              <div
                key={metric.label}
                className={`rounded-xl border bg-white p-5 shadow-sm ${tone.card}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-500">
                    {metric.label}
                  </span>
                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                </div>
                <div className="mt-4 text-3xl font-bold tracking-tight text-[#24384A]">
                  {metric.value}
                </div>
                <span
                  className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone.pill}`}
                >
                  {metric.trend}
                </span>
              </div>
            );
          })}
        </div>

        {consumerCards.length > 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#24384A]">
                  {viewTitle} workflow
                </h2>
                <p className="text-sm text-slate-500">
                  SageSure India consumer relief concepts wired into the
                  greenfield operations cockpit.
                </p>
              </div>
              <button
                onClick={() => onNavigate("ai")}
                className="rounded-md bg-[#24384A] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d3040]"
              >
                Ask SageSure AI
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
              {consumerCards.map((card) => {
                const tone = toneClasses[card.tone];
                return (
                  <button
                    key={card.title}
                    onClick={() => onNavigate("ai")}
                    className={`rounded-xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone.card}`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone.pill}`}
                    >
                      {card.action}
                    </span>
                    <h3 className="mt-4 text-base font-bold text-[#24384A]">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {analyticsPanels.map((panel) => (
              <MiniAnalyticsPanel key={panel.title} panel={panel} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#24384A]">
                    Work queue
                  </h2>
                  <p className="text-sm text-slate-500">
                    HubSpot-style object list with saved views, filters,
                    ownership, and status badges.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedViews.map((view, index) => (
                    <button
                      key={view}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${index === 0 ? "border-[#BEE7EA] bg-[#EAF7F8] text-[#007A8A]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                    >
                      {view}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                <input
                  className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-[#0B9CAF] focus:ring-2 focus:ring-[#DDF3F5]"
                  placeholder="Search claims, submissions, policies, insureds…"
                />
                <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Advanced filters
                </button>
                <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Edit columns
                </button>
                <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Export
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" />
                    </th>
                    <th className="px-4 py-3">Object</th>
                    <th className="px-4 py-3">Insured</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {queueRows.map((row) => (
                    <tr key={row.object} className="hover:bg-[#EAF7F8]/40">
                      <td className="px-4 py-3">
                        <input type="checkbox" />
                      </td>
                      <td className="px-4 py-3 font-bold text-[#007A8A]">
                        {row.object}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {row.insured}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.type}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.owner}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-bold ${badgeClass(row.priority)}`}
                        >
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#24384A]">
                Next best AI actions
              </h2>
              <div className="mt-4 space-y-3">
                {aiRecommendations.map((item) => (
                  <button
                    key={item}
                    onClick={() => onNavigate("claims")}
                    className="block w-full rounded-lg border border-slate-200 p-3 text-left text-sm font-medium text-slate-700 transition hover:border-[#BEE7EA] hover:bg-[#EAF7F8]"
                  >
                    ✦ {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#24384A]">
                Quick actions
              </h2>
              <div className="mt-4 space-y-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => onNavigate(action.id)}
                    className="flex w-full gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="text-xl">{action.icon}</span>
                    <span>
                      <span className="block text-sm font-bold text-slate-900">
                        {action.title}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {action.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800">
              <div className="font-bold">Secure AI context</div>
              <p className="mt-1">
                Responses are role-aware, audited, and scoped to the modules
                your profile can access.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
