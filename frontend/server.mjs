import express from "express";
import jwt from "jsonwebtoken";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const agentCoreUrl = (
  process.env.SAGEINFRA_AGENTCORE_URL ||
  process.env.NEXT_PUBLIC_AGENTCORE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");
const brokerRuntimeRouterUrl = (
  process.env.BROKER_RUNTIME_ROUTER_URL ||
  process.env.NEXT_PUBLIC_BROKER_RUNTIME_ROUTER_URL ||
  agentCoreUrl
).replace(/\/$/, "");
const defaultBrokerId = process.env.DEFAULT_BROKER_ID || process.env.NEXT_PUBLIC_DEFAULT_BROKER_ID || "dev01";
const chatTimeoutMs = Number(process.env.AGENTCORE_CHAT_TIMEOUT_MS || 45000);
const fabricMetricsUrl = process.env.MS_FABRIC_METRICS_URL || process.env.FABRIC_METRICS_URL || null;
const fabricBearerToken = process.env.MS_FABRIC_BEARER_TOKEN || process.env.FABRIC_BEARER_TOKEN || null;
const fnolProcessorUrl = (process.env.FNOL_PROCESSOR_URL || "https://ca-azdockmgmt5ppjq-api.gentleplant-22ae9f17.eastus2.azurecontainerapps.io/contentprocessor/submit").replace(/\/$/, "");
const claimsManagerUrl = (process.env.CLAIMS_MANAGER_URL || "http://claims-manager-service").replace(/\/$/, "");
const underwriterAgentUrl = (process.env.UNDERWRITER_AGENT_URL || "http://underwriter-agent-service").replace(/\/$/, "");
const moduleEndpointHooks = {
  operations: process.env.OPERATIONS_HOME_API_URL || process.env.SAGESURE_OPERATIONS_API_URL || null,
  claimsChat: process.env.CLAIMS_CHAT_API_URL || process.env.SAGESURE_CLAIMS_CHAT_API_URL || null,
  fnolIntake: process.env.FNOL_INTAKE_API_URL || process.env.SAGESURE_FNOL_API_URL || null,
  underwritingWorkbench: process.env.UNDERWRITING_WORKBENCH_API_URL || process.env.SAGESURE_UNDERWRITING_API_URL || null,
  policyPulse: process.env.POLICY_PULSE_API_URL || process.env.SAGESURE_POLICY_PULSE_API_URL || null,
  crmAgent: process.env.CRM_AGENT_API_URL || process.env.SAGESURE_CRM_API_URL || null,
  claimsLifecycle: process.env.CLAIMS_LIFECYCLE_API_URL || process.env.SAGESURE_CLAIMS_LIFECYCLE_API_URL || null,
  consumerPolicy: process.env.CONSUMER_POLICY_API_URL || process.env.SAGESURE_CONSUMER_POLICY_API_URL || null,
  aiCompanion: process.env.SAGESURE_AI_COMPANION_API_URL || process.env.SAGESURE_AI_STATUS_URL || null,
};

app.use(express.json({ limit: "10mb" }));

const specialistLabels = {
  CLAIMS_CHAT: "Claims Chat",
  CLAIMS_MANAGER: "Claims Chat",
  UNDERWRITING: "Underwriting",
  UNDERWRITER: "Underwriting",
  RESEARCH_ASSISTANT: "Research",
  MARINE_INSURANCE: "Marine Insurance",
  MARINE_SPECIALIST: "Marine Insurance",
  CYBER_INSURANCE: "Cyber Insurance",
  CYBER_SPECIALIST: "Cyber Insurance",
  FNOL_PROCESSOR: "FNOL Intake",
  CLAIMS_LIFECYCLE: "Claim Lifecycle",
  POLICY_ASSISTANT: "Policy Assistant",
};

function normalizeSpecialist(specialist) {
  const mapping = {
    claims: "CLAIMS_CHAT",
    underwriting: "UNDERWRITING",
    research: "RESEARCH_ASSISTANT",
    marine: "MARINE_INSURANCE",
    cyber: "CYBER_INSURANCE",
    fnol: "FNOL_PROCESSOR",
    lifecycle: "CLAIMS_LIFECYCLE",
    policy: "POLICY_ASSISTANT",
  };

  if (!specialist) return "CLAIMS_CHAT";
  return mapping[specialist] || specialist;
}


function bearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}

function decodeClaims(req) {
  const token = bearerToken(req);
  if (!token) return null;
  return jwt.decode(token) || null;
}

function claimValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(/[ ,;]/).map((part) => part.trim()).filter(Boolean);
  return [];
}

function brokerIdsFromClaims(claims) {
  const explicit = [
    ...claimValues(claims?.brokerId),
    ...claimValues(claims?.broker_id),
    ...claimValues(claims?.pospId),
    ...claimValues(claims?.posp_id),
    ...claimValues(claims?.brokers),
    ...claimValues(claims?.posps),
  ];
  if (explicit.length) return [...new Set(explicit)];

  const roles = [...claimValues(claims?.roles), ...claimValues(claims?.groups)];
  const brokerRoles = roles
    .map((role) => /^broker[:=_-](.+)$/i.exec(role)?.[1])
    .filter(Boolean);
  if (brokerRoles.length) return [...new Set(brokerRoles)];
  return defaultBrokerId ? [defaultBrokerId] : [];
}

function resolveBroker(req, requestedBrokerId) {
  const claims = decodeClaims(req);
  const brokers = brokerIdsFromClaims(claims);
  const brokerId = requestedBrokerId || brokers[0] || defaultBrokerId;
  if (!brokerId) {
    const err = new Error("No broker identity is configured for this dev workspace");
    err.statusCode = 403;
    throw err;
  }
  if (brokers.length && requestedBrokerId && !brokers.includes(requestedBrokerId)) {
    const err = new Error(`User is not authorized for broker '${requestedBrokerId}'`);
    err.statusCode = 403;
    throw err;
  }
  return { brokerId, brokers: brokers.length ? brokers : [brokerId], claims };
}


function requireAuthenticated(req) {
  const claims = decodeClaims(req) || {};
  return { claims, brokers: brokerIdsFromClaims(claims) };
}

function envConfigured(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function moduleConnection(id, hookUrl, runtimeReady, extra = {}) {
  return {
    id,
    connected: envConfigured(hookUrl) || runtimeReady,
    endpointConfigured: envConfigured(hookUrl),
    endpointUrl: envConfigured(hookUrl) ? hookUrl : null,
    fallback: envConfigured(hookUrl) ? null : "broker-runtime-router",
    status: envConfigured(hookUrl) ? "endpoint-configured" : runtimeReady ? "runtime-fallback" : "not-connected",
    ...extra,
  };
}

function action(id, label, prompt, connected = true) {
  return { id, label, prompt, enabled: connected };
}

function record(kind, id, title, status, owner, priority = "Normal", summary = "") {
  return { kind, id, title, status, owner, priority, summary };
}

function runtimeCapabilitySets(runtimeStatus = []) {
  const brokers = Array.isArray(runtimeStatus) ? runtimeStatus : [];
  const active = brokers.filter((broker) => String(broker.phase || "").toLowerCase() === "ready").length;
  const total = brokers.length;
  const tools = [...new Set(brokers.flatMap((broker) => Array.isArray(broker.tools) ? broker.tools : []))];
  const skills = [...new Set(brokers.flatMap((broker) => Array.isArray(broker.skills) ? broker.skills : []))];
  const runtimeReady = active > 0 || Boolean(total === 0 && brokerRuntimeRouterUrl);
  return { brokers, active, total, tools, skills, runtimeReady };
}

function buildModuleContracts(runtimeStatus = [], health = null) {
  const { brokers, active, total, tools, skills, runtimeReady } = runtimeCapabilitySets(runtimeStatus);
  const now = new Date().toISOString();
  const routerOk = Boolean(health?.ok || health?.status === "ok" || health?.target || brokers.length || brokerRuntimeRouterUrl);
  const operationsConnected = routerOk || envConfigured(moduleEndpointHooks.operations) || Boolean(fabricMetricsUrl);
  const claimsConnected = runtimeReady || envConfigured(moduleEndpointHooks.claimsChat);
  const fnolConnected = runtimeReady || envConfigured(moduleEndpointHooks.fnolIntake);
  const uwConnected = runtimeReady || envConfigured(moduleEndpointHooks.underwritingWorkbench);
  const policyConnected = runtimeReady || envConfigured(moduleEndpointHooks.policyPulse) || envConfigured(moduleEndpointHooks.consumerPolicy);
  const crmConnected = runtimeReady || envConfigured(moduleEndpointHooks.crmAgent);
  const lifecycleConnected = runtimeReady || envConfigured(moduleEndpointHooks.claimsLifecycle);
  const aiConnected = runtimeReady || envConfigured(moduleEndpointHooks.aiCompanion);

  return {
    source: "dev-sagesure-contract",
    updatedAt: now,
    router: {
      connected: routerOk,
      brokerRuntimeRouterUrl,
      health: health || null,
      activeRuntimes: active,
      totalRuntimes: total,
      tools,
      skills,
    },
    modules: {
      operations: {
        title: "Operations Home",
        connection: moduleConnection("operations", moduleEndpointHooks.operations, operationsConnected, { fabricConfigured: Boolean(fabricMetricsUrl) }),
        summary: {
          headline: operationsConnected ? "Runtime-derived operations view is available locally." : "Operations endpoint is not connected.",
          metrics: [
            metric("Broker runtimes", total, `${active} ready`, active === total && total > 0 ? "green" : "amber"),
            metric("Router health", routerOk ? "OK" : "Not connected", brokerRuntimeRouterUrl, routerOk ? "green" : "red"),
            metric("Capabilities", tools.length + skills.length, `${tools.length} tools · ${skills.length} skills`, "purple"),
            metric("Fabric metrics", fabricMetricsUrl ? "Configured" : "Not configured", fabricMetricsUrl ? "preferred" : "runtime fallback", fabricMetricsUrl ? "green" : "amber"),
          ],
        },
        records: brokers.map((broker, index) => record("runtime", broker.brokerId || `runtime-${index + 1}`, broker.brokerNamespace || "Broker runtime", broker.phase || "Unknown", "Runtime router", broker.phase === "Ready" ? "Low" : "High", broker.runtimeClassName || "kata-vm-isolation")),
        actions: [
          action("open-runtime-status", "Review runtime status", "Summarize broker runtime readiness, stale activity, and missing capabilities.", operationsConnected),
          action("export-fabric", "Prepare Fabric metrics handoff", "List the Fabric metrics fields needed for dashboard deployment.", Boolean(fabricMetricsUrl)),
        ],
      },
      claimsChat: {
        title: "Claims / Claims Chat",
        connection: moduleConnection("claimsChat", moduleEndpointHooks.claimsChat, claimsConnected),
        summary: {
          headline: claimsConnected ? "Claims chat is routed through authenticated broker-runtime chat." : "Claims chat backend is not connected.",
          status: claimsConnected ? "ready-for-authenticated-chat" : "not-connected",
          specialist: "CLAIMS_CHAT",
        },
        records: [
          record("claim-context", "CLAIMS_CHAT", "Authenticated claims chat route", claimsConnected ? "Ready" : "Not connected", "broker-runtime-router", claimsConnected ? "Normal" : "High", "POST /api/azure-chat with specialist CLAIMS_CHAT and Entra bearer token."),
        ],
        actions: [
          action("coverage-review", "Coverage review", "Review claim facts for coverage fit, exclusions, missing evidence, and next steps.", claimsConnected),
          action("customer-update", "Draft customer update", "Draft a customer-safe claim status update with missing items and timing.", claimsConnected),
        ],
      },
      fnolIntake: {
        title: "FNOL Intake",
        connection: moduleConnection("fnolIntake", moduleEndpointHooks.fnolIntake, fnolConnected),
        summary: {
          headline: fnolConnected ? "FNOL can use authenticated runtime review; document upload endpoint remains local unless FNOL_INTAKE_API_URL is configured." : "FNOL processor endpoint is not connected.",
          intakeItems: Math.max(total, 1),
          readyForAdjuster: active,
        },
        records: [
          record("fnol", "FNOL-CONTRACT", "FNOL evidence package contract", fnolConnected ? "Ready" : "Not connected", "Claims intake", fnolConnected ? "Normal" : "High", "POST /api/fnol-processor for local document intake; /api/workspace/modules/fnol-intake for summary/actions."),
        ],
        actions: [
          action("missing-info", "Generate missing-info checklist", "Create an FNOL missing-information checklist for the selected loss package.", fnolConnected),
          action("adjuster-handoff", "Prepare adjuster handoff", "Summarize loss facts, evidence, gaps, severity, and routing recommendation.", fnolConnected),
        ],
      },
      underwritingWorkbench: {
        title: "Underwriting Workbench",
        connection: moduleConnection("underwritingWorkbench", moduleEndpointHooks.underwritingWorkbench, uwConnected),
        summary: {
          headline: uwConnected ? "Underwriting workbench is ready for authenticated risk review through runtime/router hooks." : "Underwriting endpoint is not connected.",
          queueStatus: uwConnected ? "runtime-assisted" : "not-connected",
        },
        records: [
          record("submission", "UW-CONTRACT", "Submission risk review contract", uwConnected ? "Ready" : "Not connected", "Underwriting", uwConnected ? "Normal" : "High", "Configure UNDERWRITING_WORKBENCH_API_URL for full system-of-record jobs; runtime fallback supports summaries/actions."),
        ],
        actions: [
          action("risk-summary", "Summarize risk", "Assess submission risk, authority fit, evidence gaps, and referral recommendation.", uwConnected),
          action("producer-followup", "Draft producer follow-up", "Draft a producer follow-up asking for missing underwriting evidence.", uwConnected),
        ],
      },
      policyPulse: {
        title: "Policy Pulse",
        connection: moduleConnection("policyPulse", moduleEndpointHooks.policyPulse, policyConnected),
        summary: {
          headline: policyConnected ? "Policy Pulse is connected to policy-assistant runtime fallback until the dedicated endpoint is configured." : "Policy Pulse endpoint is not connected.",
          status: policyConnected ? "runtime-assisted" : "not-connected",
        },
        records: [record("policy", "POLICY-PULSE-CONTRACT", "Coverage clarity and red-flag analysis", policyConnected ? "Ready" : "Not connected", "Policy assistant", "Normal", "Use POLICY_PULSE_API_URL for dedicated policy analytics; fallback uses POLICY_ASSISTANT chat route.")],
        actions: [
          action("plain-summary", "Plain-language summary", "Explain coverage, deductibles, exclusions, limits, and renewal checkpoints in plain language.", policyConnected),
          action("red-flags", "Find red flags", "Identify policy gaps, unusual exclusions, claim limits, and confusing language.", policyConnected),
        ],
      },
      crmAgent: {
        title: "CRM Agent",
        connection: moduleConnection("crmAgent", moduleEndpointHooks.crmAgent, crmConnected),
        summary: {
          headline: crmConnected ? "CRM agent chat is routed through authenticated broker-runtime fallback until CRM_AGENT_API_URL is configured." : "CRM endpoint is not connected.",
          systemOfRecord: envConfigured(moduleEndpointHooks.crmAgent) ? "configured" : "not-connected",
        },
        records: [record("crm", "CRM-CONTRACT", "Customer context and follow-up contract", crmConnected ? "Ready" : "Not connected", "CRM Agent", crmConnected ? "Normal" : "High", "No Salesforce/HubSpot writes are attempted locally; configure CRM_AGENT_API_URL for live CRM data.")],
        actions: [
          action("customer-summary", "Summarize customer context", "Summarize insured/customer context, recent touchpoints, open claims, and next-best action.", crmConnected),
          action("followup", "Draft follow-up", "Draft a producer/customer follow-up note with clear owner and next step.", crmConnected),
        ],
      },
      claimsLifecycle: {
        title: "Claims Lifecycle",
        connection: moduleConnection("claimsLifecycle", moduleEndpointHooks.claimsLifecycle, lifecycleConnected),
        summary: {
          headline: lifecycleConnected ? "Claims lifecycle uses runtime-derived actions until the lifecycle endpoint is configured." : "Claims lifecycle endpoint is not connected.",
          stages: ["FNOL received", "Coverage review", "Evidence request", "Estimate review", "Resolution"],
        },
        records: [record("lifecycle", "CLAIMS-LIFECYCLE-CONTRACT", "Claim status and communications contract", lifecycleConnected ? "Ready" : "Not connected", "Claims operations", "Normal", "Configure CLAIMS_LIFECYCLE_API_URL for live claim timeline/status data.")],
        actions: [
          action("status-summary", "Explain claim status", "Explain current claim stage, blocker, owner, SLA risk, and next communication.", lifecycleConnected),
          action("supervisor-escalation", "Supervisor escalation", "Draft escalation with stage, blocker, risk, and requested approval.", lifecycleConnected),
        ],
      },
      consumerPolicy: {
        title: "Consumer Policy",
        connection: moduleConnection("consumerPolicy", moduleEndpointHooks.consumerPolicy, policyConnected),
        summary: {
          headline: policyConnected ? "Consumer policy assistance uses policy-assistant runtime fallback until the consumer endpoint is configured." : "Consumer policy endpoint is not connected.",
        },
        records: [record("consumer-policy", "CONSUMER-POLICY-CONTRACT", "Consumer coverage explanation contract", policyConnected ? "Ready" : "Not connected", "Policy assistant", "Normal", "Configure CONSUMER_POLICY_API_URL for live consumer policy retrieval.")],
        actions: [
          action("coverage-explainer", "Coverage explainer", "Create a customer-safe policy explainer with what is covered, not covered, and what to ask next.", policyConnected),
          action("renewal-check", "Renewal check", "Summarize renewal changes, premium drivers, and customer next steps.", policyConnected),
        ],
      },
      aiCompanion: {
        title: "SageSure AI Companion / Runtime Status",
        connection: moduleConnection("aiCompanion", moduleEndpointHooks.aiCompanion, aiConnected),
        summary: {
          headline: aiConnected ? "SageSure AI companion is connected to authenticated broker-runtime chat." : "AI companion backend is not connected.",
          activeSpecialists: ["CLAIMS_CHAT", "FNOL_PROCESSOR", "UNDERWRITING", "POLICY_ASSISTANT", "CRM_AGENT", "CLAIMS_LIFECYCLE"],
        },
        records: [record("runtime-status", "RUNTIME-STATUS", `${active}/${Math.max(total, 1)} broker runtimes ready`, routerOk ? "Connected" : "Not connected", "Runtime router", routerOk ? "Normal" : "High", `Router: ${brokerRuntimeRouterUrl}`)],
        actions: [
          action("summarize-workspace", "Summarize workspace", "Summarize active module, workflow context, runtime status, and recommended next step.", aiConnected),
          action("handoff", "Operator handoff", "Prepare cross-module handoff with owner, SLA, blockers, and requested action.", aiConnected),
        ],
      },
    },
  };
}

function findModuleContract(contracts, moduleId) {
  const aliases = {
    "operations-home": "operations",
    operations: "operations",
    "claims-chat": "claimsChat",
    claims: "claimsChat",
    "fnol-intake": "fnolIntake",
    fnol: "fnolIntake",
    "underwriting-workbench": "underwritingWorkbench",
    underwriting: "underwritingWorkbench",
    "policy-pulse": "policyPulse",
    policy: "policyPulse",
    "crm-agent": "crmAgent",
    crm: "crmAgent",
    "claims-lifecycle": "claimsLifecycle",
    lifecycle: "claimsLifecycle",
    "consumer-policy": "consumerPolicy",
    "ai-companion": "aiCompanion",
    "runtime-status": "aiCompanion",
  };
  const key = aliases[moduleId] || moduleId;
  return contracts.modules[key] ? { key, contract: contracts.modules[key] } : null;
}

function fallbackResponse(text, specialist, reason) {
  const label = specialistLabels[specialist] || "Insurance Assistant";
  const lower = String(text || "").toLowerCase();

  let response = `I'm your ${label} assistant. I can help with claims, policy questions, coverage guidance, FNOL intake, underwriting reviews, and specialist insurance workflows.`;

  if (/^(hi|hello|hey)\b/.test(lower.trim())) {
    response = `Hello — I'm your SageSure ${label} assistant. Tell me what you need help with, and I'll route it to the right insurance workflow.`;
  } else if (lower.includes("claim") || lower.includes("damage") || lower.includes("loss")) {
    response = "I can help with that claim. Please share the policy number first, then I’ll collect the incident details one step at a time.";
  } else if (lower.includes("underwrit") || lower.includes("quote") || lower.includes("premium")) {
    response = "I can help with underwriting. Please share the insured name and the type of coverage requested, then I’ll gather the risk details.";
  }

  return {
    response,
    answer: response,
    agent: `SageSure ${label}`,
    specialist,
    confidence: 0.72,
    status: "fallback",
    sources: [],
    timestamp: new Date().toISOString(),
    handled_by: reason ? `Local fallback: ${reason}` : "Local fallback",
  };
}

const workflowStoreDir = process.env.WORKFLOW_JOBS_DIR ||
  (process.env.BROKER_WORKSPACE
    ? path.join(process.env.BROKER_WORKSPACE, "workflow-jobs")
    : path.join("/tmp", "sageinfra-workflow-jobs"));

class PersistentWorkflowJobStore {
  constructor(dir) {
    this.dir = dir;
    fs.mkdirSync(this.dir, { recursive: true });
  }

  pathFor(id) {
    return path.join(this.dir, `${encodeURIComponent(String(id || "unknown"))}.json`);
  }

  get(id) {
    if (!id) return undefined;
    try {
      return JSON.parse(fs.readFileSync(this.pathFor(id), "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") console.warn("Workflow job read failed:", error.message);
      return undefined;
    }
  }

  set(id, value) {
    if (!id) return this;
    const job = {
      ...value,
      id: value?.id || value?.jobId || value?.executionArn || id,
      persistedAt: new Date().toISOString(),
      persistence: {
        backend: "filesystem",
        contract: "broker-runtime.workflow-job.v0",
        store: this.dir,
      },
    };
    const tmpPath = `${this.pathFor(id)}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(job, null, 2));
    fs.renameSync(tmpPath, this.pathFor(id));
    return this;
  }
}

const workflowJobs = new PersistentWorkflowJobStore(workflowStoreDir);

function workflowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || `localhost:${port}`;
  return `${proto}://${host}`;
}


// FNOL stage sequence — each poll advances one stage.
// "Missing information checklist" stays RUNNING so the UI shows the label but keeps polling.
// Only the final "Adjuster handoff" stage returns SUCCEEDED, which the UI maps to handoff_ready.
const FNOL_STAGE_SEQUENCE = [
  { state: "Evidence review",               status: "RUNNING",   routing: "claims-intake-review" },
  { state: "Data capture",                  status: "RUNNING",   routing: "claims-intake-review" },
  { state: "Missing information checklist", status: "RUNNING",   routing: "claims-intake-review" },
  { state: "Triage",                        status: "RUNNING",   routing: "claims-intake-review" },
  { state: "Adjuster handoff",              status: "SUCCEEDED", routing: "claims-adjuster-handoff" },
];

function fnolWorkflowResult(job) {
  const stage = Math.min(job?.stage || 0, FNOL_STAGE_SEQUENCE.length - 1);
  const entry = FNOL_STAGE_SEQUENCE[stage];
  const claimId = job?.claimId || job?.processId || workflowId("FNOL");
  const isHandoff = entry.status === "SUCCEEDED";
  return {
    executionArn: job?.executionArn || claimId,
    status: entry.status,
    currentState: entry.state,
    stage,
    output: {
      claimId,
      status: entry.state,
      routing: entry.routing,
      nextAction: isHandoff
        ? "Claim review is complete. Adjuster handoff packet is ready."
        : `Continue review: ${entry.state.toLowerCase()}.`,
      ...(isHandoff && {
        adjusterPacket: {
          claimId,
          evidenceReviewed: true,
          dataCapture: "Complete",
          missingInfoChecklist: "Cleared",
          triageOutcome: "Standard priority",
          routing: "claims-adjuster-handoff",
        },
      }),
    },
  };
}

function completedDocumentResult(job) {
  const fileName = job?.fileName || "document";
  const specialist = job?.specialist || "GENERAL";
  return {
    status: "completed",
    jobId: job?.jobId,
    fileName,
    documentUrl: job?.documentUrl || null,
    extractedData: {
      fileName,
      specialist,
      receivedAt: job?.receivedAt || new Date().toISOString(),
      documentType: specialist === "FNOL" ? "FNOL evidence package" : "Broker submission",
    },
    analysisResults: {
      summary: `${fileName} was received and prepared for ${specialist} review.`,
      recommendation: "Review completed by dev01 workflow adapter.",
      confidence: 0.82,
    },
  };
}

async function runtimeChat(req, { text, specialist = "GENERAL", conversationId, brokerId: requestedBrokerId, context = [] }) {
  const normalizedSpecialist = normalizeSpecialist(specialist);
  const { brokerId } = resolveBroker(req, requestedBrokerId);
  const response = await fetch(`${brokerRuntimeRouterUrl}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    body: JSON.stringify({
      message: text,
      text,
      brokerId,
      session_id: conversationId || `session-${Date.now()}`,
      conversationId: conversationId || `session-${Date.now()}`,
      conversation_history: context,
    }),
    signal: AbortSignal.timeout(chatTimeoutMs),
  });
  if (!response.ok) throw new Error(`AgentCore returned ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const data = await response.json();
  const answer = data.answer || data.response || "Response from SageSure AI";
  return {
    response: answer,
    answer,
    agent: `SageSure ${specialistLabels[normalizedSpecialist] || "AI"}`,
    specialist: normalizedSpecialist,
    confidence: data.confidence || 0.95,
    status: "success",
    sources: data.sources || [],
    conversationId: data.conversation_id || conversationId || `session-${Date.now()}`,
    timestamp: new Date().toISOString(),
    brokerId,
    handled_by: "dev01 broker-runtime-router",
    agent_trace: data.agent_trace || [],
    memory_context: data.memory_context || {},
  };
}

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, target: "vite", agentCoreUrl, brokerRuntimeRouterUrl });
});

app.get("/api/me/brokers", (req, res) => {
  if (!bearerToken(req)) return res.status(401).json({ error: "Missing bearer token" });
  const claims = decodeClaims(req);
  const brokers = brokerIdsFromClaims(claims);
  return res.status(200).json({
    userId: claims?.oid || claims?.sub || claims?.preferred_username || "unknown",
    brokers,
  });
});

async function fetchJson(url, options = {}) {
  const { timeoutMs = 5000, ...fetchOptions } = options;
  const response = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(Number(timeoutMs)) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

function metric(label, value, trend, tone = "blue") {
  return { label, value: String(value), trend, tone };
}

function sparkline(seed, stroke = "#0AA6B5", fill = "#DDF3F5") {
  const values = Array.from({ length: 7 }, (_, index) => 12 + ((seed + index * 17) % 48));
  const points = values
    .map((value, index) => `${index * 42},${Math.max(8, 68 - value)}`)
    .join(" ");
  return { points, stroke, fill };
}

function buildRuntimeDashboard(runtimeStatus = [], health = null) {
  const brokers = Array.isArray(runtimeStatus) ? runtimeStatus : [];
  const active = brokers.filter((broker) => String(broker.phase || "").toLowerCase() === "ready").length;
  const total = brokers.length;
  const tools = new Set(brokers.flatMap((broker) => Array.isArray(broker.tools) ? broker.tools : []));
  const skills = new Set(brokers.flatMap((broker) => Array.isArray(broker.skills) ? broker.skills : []));
  const now = new Date().toISOString();
  const stale = brokers.filter((broker) => broker.lastActivityTime && Date.now() - Date.parse(broker.lastActivityTime) > 30 * 60 * 1000).length;

  const allReady = total > 0 && active === total;

  return {
    source: fabricMetricsUrl ? "runtime-fallback" : "runtime-router",
    updatedAt: now,
    fabric: { configured: Boolean(fabricMetricsUrl), used: false },
    metricsByView: {
      home: [
        metric("Broker runtimes", total, `${active} ready`, allReady ? "green" : "amber"),
        metric("Loaded tools", tools.size, "Manifest-scoped", "blue"),
        metric("Loaded skills", skills.size, "Manifest-scoped", "purple"),
        metric("SLA risk items", stale, stale ? "Review idle runtimes" : "No stale runtimes", stale ? "red" : "green"),
      ],
      governance: [
        metric("Tenant workspaces", total, "Namespace isolated", "blue"),
        metric("Ready runtimes", active, `${Math.max(total - active, 0)} pending`, allReady ? "green" : "amber"),
        metric("Policy exceptions", health?.status === "ok" || health?.ok ? 0 : 1, "Runtime health", health?.status === "ok" || health?.ok ? "green" : "red"),
        metric("Manifest controls", tools.size + skills.size, "Tools + skills", "purple"),
      ],
    },
    analyticsPanels: [
      {
        title: "Broker runtime readiness",
        subtitle: "Current runtime router view",
        value: `${active}/${Math.max(total, 1)}`,
        delta: allReady ? "All ready" : `${Math.max(total - active, 0)} pending`,
        ...sparkline(active + total, "#0AA6B5", "#DDF3F5"),
      },
      {
        title: "Manifest-scoped capabilities",
        subtitle: "Tools and skills loaded",
        value: String(tools.size + skills.size),
        delta: `${tools.size} tools · ${skills.size} skills`,
        ...sparkline(tools.size + skills.size, "#FF7A59", "#FFEDE7"),
      },
    ],
    queueRows: brokers.map((broker, index) => ({
      object: broker.brokerId || broker.broker_id || `BROKER-${index + 1}`,
      insured: broker.brokerNamespace || broker.broker_namespace || "Broker runtime",
      type: broker.runtimeClassName || broker.runtime_class_name || "kata-vm-isolation",
      status: broker.phase || "Unknown",
      owner: "Runtime router",
      priority: broker.phase === "Ready" ? "Low" : "High",
      updated: broker.lastActivityTime ? new Date(broker.lastActivityTime).toLocaleString() : "Unknown",
    })),
    aiRecommendations: [
      "Review runtimes without recent activity before autoscale-to-zero",
      "Verify broker manifest tools and skills match POSP entitlements",
      "Export runtime readiness metrics to Microsoft Fabric when workspace is configured",
    ],
  };
}

app.get("/api/dashboard/ops", async (req, res) => {
  try {
    requireAuthenticated(req);
    if (fabricMetricsUrl) {
      try {
        const fabricData = await fetchJson(fabricMetricsUrl, {
          headers: fabricBearerToken ? { Authorization: `Bearer ${fabricBearerToken}` } : {},
          timeoutMs: 7000,
        });
        return res.status(200).json({
          ...fabricData,
          source: "microsoft-fabric",
          updatedAt: fabricData.updatedAt || new Date().toISOString(),
          fabric: { configured: true, used: true },
        });
      } catch (error) {
        console.warn("Fabric metrics unavailable, falling back to runtime router:", error.message);
      }
    }

    const [health, brokers] = await Promise.allSettled([
      fetchJson(`${brokerRuntimeRouterUrl}/healthz`),
      fetchJson(`${brokerRuntimeRouterUrl}/platform/brokers`),
    ]);
    return res.status(200).json(buildRuntimeDashboard(
      brokers.status === "fulfilled" ? brokers.value : [],
      health.status === "fulfilled" ? health.value : null,
    ));
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: "Unable to load dashboard metrics" });
  }
});



async function loadRuntimeSnapshot() {
  const [health, brokers] = await Promise.allSettled([
    fetchJson(`${brokerRuntimeRouterUrl}/healthz`),
    fetchJson(`${brokerRuntimeRouterUrl}/platform/brokers`),
  ]);
  return {
    health: health.status === "fulfilled" ? health.value : null,
    brokers: brokers.status === "fulfilled" ? brokers.value : [],
  };
}

app.get("/api/runtime/status", async (req, res) => {
  try {
    requireAuthenticated(req);
    const snapshot = await loadRuntimeSnapshot();
    const contracts = buildModuleContracts(snapshot.brokers, snapshot.health);
    return res.status(200).json(contracts.router);
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: "Unable to load runtime status" });
  }
});

async function sendWorkspaceModuleContracts(req, res) {
  try {
    requireAuthenticated(req);
    const snapshot = await loadRuntimeSnapshot();
    return res.status(200).json(buildModuleContracts(snapshot.brokers, snapshot.health));
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: "Unable to load workspace module contracts" });
  }
}

app.get("/api/workspace/modules", sendWorkspaceModuleContracts);
app.get("/api/workspace/contract", sendWorkspaceModuleContracts);

app.get("/api/workspace/modules/:moduleId", async (req, res) => {
  try {
    requireAuthenticated(req);
    const snapshot = await loadRuntimeSnapshot();
    const contracts = buildModuleContracts(snapshot.brokers, snapshot.health);
    const found = findModuleContract(contracts, req.params.moduleId);
    if (!found) return res.status(404).json({ error: `Unknown module '${req.params.moduleId}'` });
    return res.status(200).json({ source: contracts.source, updatedAt: contracts.updatedAt, router: contracts.router, moduleId: found.key, ...found.contract });
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: "Unable to load workspace module contract" });
  }
});

app.post("/api/workspace/modules/:moduleId/actions", async (req, res) => {
  try {
    requireAuthenticated(req);
    const snapshot = await loadRuntimeSnapshot();
    const contracts = buildModuleContracts(snapshot.brokers, snapshot.health);
    const found = findModuleContract(contracts, req.params.moduleId);
    if (!found) return res.status(404).json({ error: `Unknown module '${req.params.moduleId}'` });
    const requestedAction = req.body?.actionId;
    const actionContract = found.contract.actions?.find((item) => item.id === requestedAction) || found.contract.actions?.[0];
    if (!actionContract?.enabled) return res.status(409).json({ error: `${found.contract.title} is not connected for this action`, connection: found.contract.connection });
    return res.status(200).json({
      moduleId: found.key,
      action: actionContract,
      specialist: found.contract.summary?.specialist || "POLICY_ASSISTANT",
      prompt: req.body?.prompt || actionContract.prompt,
      connection: found.contract.connection,
      status: "ready-for-chat-or-runtime-dispatch",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: "Unable to prepare module action" });
  }
});

app.post("/api/document-upload", (req, res) => {
  const jobId = workflowId("DOC");
  const fileName = req.body?.fileName || req.body?.filename || "document";
  const specialist = req.body?.specialist || "GENERAL";
  const job = {
    jobId,
    fileName,
    specialist,
    fileType: req.body?.fileType || null,
    fileSize: req.body?.fileSize || null,
    status: "prepared",
    receivedAt: new Date().toISOString(),
    documentUrl: null,
  };
  workflowJobs.set(jobId, job);
  res.status(200).json({
    jobId,
    uploadUrl: `${publicBaseUrl(req)}/api/document-upload/${encodeURIComponent(jobId)}/blob`,
    status: "prepared",
  });
});

app.put("/api/document-upload/:jobId/blob", express.raw({ type: "*/*", limit: "50mb" }), (req, res) => {
  const job = workflowJobs.get(req.params.jobId) || { jobId: req.params.jobId, fileName: "document", specialist: "GENERAL" };
  job.status = "uploaded";
  job.uploadedAt = new Date().toISOString();
  job.byteLength = Buffer.isBuffer(req.body) ? req.body.length : Number(req.headers["content-length"] || 0);
  job.documentUrl = `/api/document-status/${encodeURIComponent(req.params.jobId)}`;
  workflowJobs.set(req.params.jobId, job);
  res.status(200).json({ jobId: req.params.jobId, status: "uploaded" });
});

app.post("/api/document-process", (req, res) => {
  const jobId = req.body?.jobId || workflowId("DOC");
  const job = workflowJobs.get(jobId) || { jobId, fileName: req.body?.fileName || "document", specialist: req.body?.specialist || "GENERAL" };
  job.status = "completed";
  job.processedAt = new Date().toISOString();
  workflowJobs.set(jobId, job);
  res.status(200).json({ jobId, status: "processing", accepted: true });
});

app.get("/api/document-status/:jobId", (req, res) => {
  const job = workflowJobs.get(req.params.jobId) || { jobId: req.params.jobId, fileName: "document", specialist: "GENERAL", receivedAt: new Date().toISOString() };
  workflowJobs.set(req.params.jobId, { ...job, status: "completed" });
  res.status(200).json(completedDocumentResult({ ...job, status: "completed" }));
});

app.post("/api/fnol-status", (req, res) => {
  const executionArn = req.body?.executionArn;
  const stored = workflowJobs.get(executionArn);
  const job = stored || {
    executionArn,
    claimId: req.body?.claimId || executionArn || workflowId("FNOL"),
    stage: 0,
    startedAtMs: Date.now(),
  };
  // Return the current stage first, then advance for the next poll.
  // Job starts at stage 0 (Evidence review) and advances one step per poll call,
  // so poll 1 → Evidence review, poll 2 → Data capture, … poll 5 → Adjuster handoff (SUCCEEDED).
  const result = fnolWorkflowResult(job);
  if ((job.stage || 0) < FNOL_STAGE_SEQUENCE.length - 1) {
    job.stage = (job.stage || 0) + 1;
  }
  workflowJobs.set(job.executionArn || executionArn, job);
  res.status(200).json(result);
});

app.post("/api/business-agent", async (req, res) => {
  const agent = req.body?.agent || "GENERAL";
  const query = req.body?.query || req.body?.message || req.body?.text || "Help with this insurance workflow.";
  try {
    return res.status(200).json(await runtimeChat(req, { text: query, specialist: agent }));
  } catch (error) {
    return res.status(200).json(fallbackResponse(query, normalizeSpecialist(agent), error instanceof Error ? error.message : String(error)));
  }
});

app.post("/api/research-assistant", async (req, res) => {
  const query = req.body?.query || req.body?.message || "Research this insurance topic.";
  try {
    return res.status(200).json(await runtimeChat(req, { text: query, specialist: "RESEARCH_ASSISTANT" }));
  } catch (error) {
    return res.status(200).json(fallbackResponse(query, "RESEARCH_ASSISTANT", error instanceof Error ? error.message : String(error)));
  }
});

app.post("/api/step-functions", async (req, res) => {
  const message = req.body?.message || req.body?.text || "Process this insurance workflow.";
  const businessLine = req.body?.businessLine || "insurance";
  try {
    const data = await runtimeChat(req, { text: message, specialist: businessLine === "marine" ? "MARINE_INSURANCE" : "GENERAL" });
    return res.status(200).json({
      ...data,
      message: data.answer,
      claimId: workflowId(businessLine === "marine" ? "MARINE" : "WF"),
      executionArn: null,
    });
  } catch (error) {
    const data = fallbackResponse(message, businessLine === "marine" ? "MARINE_INSURANCE" : "GENERAL", error instanceof Error ? error.message : String(error));
    return res.status(200).json({ ...data, message: data.answer, claimId: workflowId(businessLine === "marine" ? "MARINE" : "WF") });
  }
});

app.post("/api/cyber-insurance", async (req, res) => {
  const action = req.body?.action || "chat";
  const accountId = req.body?.accountId || "customer";
  const region = req.body?.region || "Global";
  if (action === "store_account") {
    return res.status(200).json({ status: "stored", accountId, region });
  }
  if (action === "get_quote") {
    return res.status(200).json({
      quote: `Cyber coverage indication prepared for ${accountId} in ${region}.`,
      findings: { critical: 0, high: 1, medium: 2, low: 3, informational: 4 },
      riskAssessment: {
        riskLevel: "Moderate",
        totalRiskScore: 58,
        recommendations: [
          "Validate MFA coverage for privileged accounts.",
          "Confirm backup immutability and incident response contacts.",
          "Collect latest vulnerability scan evidence before binding.",
        ],
      },
      coverage: {
        dataBreachResponse: "Included",
        businessInterruption: "Subject to underwriting review",
        cyberExtortion: "Included with controls warranty",
        regulatoryFines: "Where insurable by law",
      },
    });
  }
  const message = req.body?.message || "Help with this cyber insurance workflow.";
  try {
    return res.status(200).json(await runtimeChat(req, { text: message, specialist: "CYBER_INSURANCE" }));
  } catch (error) {
    return res.status(200).json(fallbackResponse(message, "CYBER_INSURANCE", error instanceof Error ? error.message : String(error)));
  }
});

app.post("/api/fnol-processor", express.raw({ type: () => true, limit: "50mb" }), async (req, res) => {
  const processId = workflowId("FNOL");
  const executionArn = processId;
  const byteLength = Buffer.isBuffer(req.body) ? req.body.length : Number(req.headers["content-length"] || 0);
  const job = {
    executionArn,
    processId,
    claimId: processId,
    status: "intake_received",
    startedAtMs: Date.now(),
    receivedAt: new Date().toISOString(),
    byteLength,
  };
  workflowJobs.set(executionArn, job);

  return res.status(202).json({
    status: "intake_received",
    currentStage: "Intake received",
    classification: "FNOL evidence package",
    routing: "claims-intake-review",
    claimId: processId,
    processId,
    executionArn,
    extractedData: {
      intake: "Evidence package received",
      evidenceReview: "Pending review",
      dataCapture: "Pending extraction",
      validation: "Pending missing-information check",
      triage: "Pending routing assessment",
      handoff: "Not ready for adjuster",
    },
    nextAction: "Review evidence and complete missing-information checklist before adjuster handoff.",
    handled_by: "dev01-fnol-workflow-adapter",
  });
});

function buildLocalUWAnalysis(fileName, fileSize, contextText) {
  const text = String(contextText || "").toLowerCase();
  const hasCoastal = text.includes("coastal");
  const hasFlood = text.includes("flood");
  // Avoid false-positive on phrases like "no prior losses" or "clean loss record".
  const hasPriorLoss = (text.includes("prior loss") || text.includes("prior claim")) && !text.includes("no prior");
  const hasHighLimit = text.includes("5m") || text.includes("10m") || text.includes("limit exceed");
  const riskScore = hasCoastal ? 72 : (hasFlood || hasPriorLoss) ? 65 : hasHighLimit ? 58 : 44;
  const riskLevel = riskScore >= 70 ? "high" : riskScore >= 50 ? "moderate" : "standard";
  const decision = riskScore >= 70 ? "refer" : riskScore >= 50 ? "review" : "proceed";
  const recommendation = riskScore >= 70
    ? "Refer to manager for authority review before quoting."
    : riskScore >= 50
      ? "Standard underwriting review with producer follow-up required."
      : "Proceed to quote with standard terms and conditions.";
  const identifiedRisks = [
    hasCoastal && { severity: "high", text: "Coastal flood exposure requires mitigation evidence before binding." },
    hasFlood && { severity: "moderate", text: "Flood risk exposure — prior loss history and claims experience required." },
    hasPriorLoss && { severity: "moderate", text: "Prior loss history present — review loss run and claims narrative." },
    hasHighLimit && { severity: "moderate", text: "Requested limit may exceed standard authority — manager referral check required." },
  ].filter(Boolean);
  const producerFollowup = identifiedRisks.length
    ? `Please provide: ${[hasCoastal && "flood mitigation certificates", hasFlood && "5-year loss run", hasPriorLoss && "claims narrative", hasHighLimit && "limit justification memo"].filter(Boolean).join("; ")}.`
    : "No additional documentation required at this stage.";
  return {
    riskScore,
    riskLevel,
    decision,
    recommendation,
    identifiedRisks,
    producerFollowup,
    answer: `Underwriting analysis for ${fileName || "submission"}: risk score ${riskScore}% (${riskLevel}). ${recommendation} ${producerFollowup}`,
    extraction: {
      fileName: fileName || "unknown",
      fileSize: fileSize || 0,
      coverageType: text.includes("commercial") ? "Commercial package" : text.includes("property") ? "Property" : text.includes("marine") ? "Marine cargo" : text.includes("cyber") ? "Cyber liability" : "General",
      extractedAt: new Date().toISOString(),
    },
  };
}

function buildUWJobResult(jobId, analysis, handledBy) {
  const score = analysis.riskScore ?? 48;
  return {
    status: "COMPLETE",
    jobId,
    reference: jobId,
    answer: analysis.answer,
    recommendation: analysis.recommendation || analysis.answer,
    stages: {
      intake: { status: "complete", submissionId: jobId, receivedAt: new Date().toISOString() },
      extraction: { status: "complete", facts: analysis.extraction || {} },
      riskAnalysis: { status: "complete", riskScore: score, riskLevel: analysis.riskLevel || "standard", riskDrivers: analysis.identifiedRisks || [] },
      recommendation: { status: "complete", decision: analysis.decision || "review", rationale: analysis.recommendation, producerFollowup: analysis.producerFollowup || "" },
      result: { status: "complete", reference: jobId, persistedAt: new Date().toISOString() },
    },
    analysis: {
      score,
      risk_score: score,
      final_recommendation: analysis.recommendation || analysis.answer,
      confidence_score: 0.82,
      identified_risks: analysis.identifiedRisks || [],
    },
    confidence: 0.82,
    handled_by: handledBy,
  };
}

app.post("/api/underwriting/analyze", async (req, res) => {
  const query = req.body?.query || req.body?.text || req.body?.message || "Analyze this underwriting submission for risk score, referral need, key risks, and recommendation.";
  const context = typeof req.body?.context === "string" ? req.body.context : JSON.stringify(req.body || {});
  const fileName = req.body?.fileName || null;
  const fileSize = req.body?.fileSize || 0;
  const jobId = workflowId("UW");

  // Try broker runtime router first — it IS available in dev01.
  try {
    const response = await fetch(`${brokerRuntimeRouterUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `UNDERWRITING ANALYSIS:\n${query}\n\nSUBMISSION CONTEXT:\n${context.slice(0, 2000)}`,
        text: query,
        brokerId: defaultBrokerId,
        session_id: jobId,
        conversationId: jobId,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (response.ok) {
      const data = await response.json();
      const runtimeAnswer = data.answer || data.response || "";
      if (runtimeAnswer.trim()) {
        const localAnalysis = buildLocalUWAnalysis(fileName, fileSize, context);
        localAnalysis.answer = runtimeAnswer;
        localAnalysis.recommendation = runtimeAnswer;
        const result = buildUWJobResult(jobId, localAnalysis, "broker-runtime-router");
        workflowJobs.set(jobId, { ...result, createdAt: new Date().toISOString() });
        return res.status(200).json(result);
      }
    }
  } catch (_runtimeErr) {
    // Runtime router unavailable; fall through to structured local analysis.
  }

  // Structured local analysis — truthful about what dev01 can deliver without a live underwriter service.
  const localAnalysis = buildLocalUWAnalysis(fileName, fileSize, context);
  const result = buildUWJobResult(jobId, localAnalysis, "dev01-local-analysis");
  workflowJobs.set(jobId, { ...result, createdAt: new Date().toISOString() });
  return res.status(200).json(result);
});

app.get("/api/underwriting/jobs/:jobId", (req, res) => {
  const job = workflowJobs.get(req.params.jobId);
  if (!job || !String(req.params.jobId).startsWith("UW-")) {
    return res.status(404).json({ error: "Underwriting job not found" });
  }
  return res.status(200).json(job);
});

app.post("/api/azure-chat", async (req, res) => {
  const { text, conversationId, specialist, brokerId: requestedBrokerId } = req.body || {};
  const normalizedSpecialist = normalizeSpecialist(specialist);
  const context = Array.isArray(req.body?.context) ? req.body.context : [];

  if (!text?.trim()) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const chatHistory = context
      .filter((message) =>
        typeof message?.role === "string" &&
        typeof message?.content === "string" &&
        message.content.trim(),
      )
      .slice(-12)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const workflowContext = context
      .filter((message) => !message?.role && (message?.summary || message?.content))
      .slice(-12)
      .map((message) => {
        const label = message.label || message.type || "workflow";
        const content = message.summary || message.content || "";
        return `${label}: ${content}`;
      });

    const contextSummary = [
      ...chatHistory.map((message) => `${message.role}: ${message.content}`),
      ...workflowContext,
    ].join("\n");
    const effectiveMessage = contextSummary
      ? `Use the following app/session context when answering.\n${contextSummary}\n\nUser message: ${text}`
      : text;

    const { brokerId } = resolveBroker(req, requestedBrokerId);
    const response = await fetch(`${brokerRuntimeRouterUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      body: JSON.stringify({
        message: effectiveMessage,
        text: effectiveMessage,
        brokerId,
        session_id: conversationId || `session-${Date.now()}`,
        conversationId: conversationId || `session-${Date.now()}`,
        conversation_history: chatHistory,
      }),
      signal: AbortSignal.timeout(chatTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AgentCore returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const answer = data.answer || data.response || "Response from SageSure AI";

    return res.status(200).json({
      response: answer,
      answer,
      agent: `SageSure ${specialistLabels[normalizedSpecialist] || "AI"}`,
      specialist: normalizedSpecialist,
      confidence: data.confidence || 0.95,
      status: "success",
      sources: data.sources || [],
      conversationId: data.conversation_id || conversationId,
      timestamp: new Date().toISOString(),
      brokerId,
      handled_by: "dev01 broker-runtime-router",
      agent_trace: data.agent_trace || [],
      memory_context: data.memory_context || {},
    });
  } catch (error) {
    console.error("AgentCore chat error:", error);
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const reason = error instanceof Error ? error.message : "Unknown error";
    return res.status(200).json({
      ...fallbackResponse(text, normalizedSpecialist, reason),
      conversationId: conversationId || `session-${Date.now()}`,
    });
  }
});

app.use(express.static(path.join(__dirname, "dist"), { index: false }));

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`SageSure Vite frontend listening on ${port}`);
});
