import express from "express";
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
const chatTimeoutMs = Number(process.env.AGENTCORE_CHAT_TIMEOUT_MS || 45000);

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

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, target: "vite", agentCoreUrl });
});

app.post("/api/azure-chat", async (req, res) => {
  const { text, conversationId, specialist } = req.body || {};
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

    const response = await fetch(`${agentCoreUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: effectiveMessage,
        session_id: conversationId || `session-${Date.now()}`,
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
      handled_by: "dev01 sageinfra-agentcore",
      agent_trace: data.agent_trace || [],
      memory_context: data.memory_context || {},
    });
  } catch (error) {
    console.error("AgentCore chat error:", error);
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
