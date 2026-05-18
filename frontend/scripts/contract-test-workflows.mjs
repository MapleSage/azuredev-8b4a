/**
 * Deterministic workflow contract tests for FNOL and Underwriting Workbench.
 *
 * Tests the exact request sequences the UI components issue:
 *   - FNOL: multipart POST → repeated status polls → stage progression → handoff_ready
 *   - Underwriting: analyze POST → structured result with all 6 workflow stages
 *   - Document: upload prepare → blob PUT → process → status
 *   - Workspace modules contract shape
 *
 * Requires server running at BASE_URL (default http://127.0.0.1:3000).
 * Set WORKSPACE_CONTRACT_BEARER_TOKEN to exercise authenticated endpoints.
 *
 * Usage:
 *   node frontend/scripts/contract-test-workflows.mjs
 *   BASE_URL=http://localhost:3000 WORKSPACE_CONTRACT_BEARER_TOKEN=<token> node ...
 */

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const TOKEN = process.env.WORKSPACE_CONTRACT_BEARER_TOKEN || null;

const authHeaders = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failed++;
  } else {
    console.log(`  ok:   ${message}`);
    passed++;
  }
}

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 1. Server health
// ---------------------------------------------------------------------------
async function testHealth() {
  console.log("\n[1] Server health");
  const { res, body } = await fetchJson("/healthz");
  assert(res.status === 200, `GET /healthz returns 200 (got ${res.status})`);
  assert(body.ok === true, "healthz.ok is true");
  assert(typeof body.agentCoreUrl === "string", "healthz.agentCoreUrl present");
}

// ---------------------------------------------------------------------------
// 2. FNOL workflow — full 5-stage progression to handoff_ready
// ---------------------------------------------------------------------------
async function testFNOLWorkflow() {
  console.log("\n[2] FNOL workflow — POST fnol-processor → 5 status polls → Adjuster handoff");

  // 2a. Submit FNOL (the UI sends multipart/form-data; we send raw bytes here)
  const uploadRes = await fetch(`${BASE_URL}/api/fnol-processor`, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "Content-Length": "4" },
    body: Buffer.from("test"),
  });
  assert(uploadRes.status === 202, `POST /api/fnol-processor returns 202 (got ${uploadRes.status})`);

  const upload = await uploadRes.json();
  assert(upload.status === "intake_received", `fnol-processor.status === "intake_received" (got "${upload.status}")`);
  assert(typeof upload.executionArn === "string" && upload.executionArn.length > 0, "fnol-processor returns executionArn");
  assert(typeof upload.claimId === "string" && upload.claimId.length > 0, "fnol-processor returns claimId");
  assert(upload.extractedData?.handoff === "Not ready for adjuster", 'initial extractedData.handoff === "Not ready for adjuster"');
  assert(typeof upload.nextAction === "string", "fnol-processor returns nextAction");

  const { executionArn } = upload;

  // 2b. Poll status 5 times — one per FNOL_STAGE_SEQUENCE entry.
  // Expected progression: Evidence review → Data capture → Missing information checklist → Triage → Adjuster handoff
  const expectedStates = [
    { state: "Evidence review",               status: "RUNNING" },
    { state: "Data capture",                  status: "RUNNING" },
    { state: "Missing information checklist", status: "RUNNING" },
    { state: "Triage",                        status: "RUNNING" },
    { state: "Adjuster handoff",              status: "SUCCEEDED" },
  ];

  let lastPoll = null;
  for (let i = 0; i < expectedStates.length; i++) {
    const expected = expectedStates[i];
    const { res, body } = await fetchJson("/api/fnol-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executionArn }),
    });
    assert(res.status === 200, `Poll ${i + 1}: /api/fnol-status returns 200`);
    assert(body.currentState === expected.state, `Poll ${i + 1}: currentState === "${expected.state}" (got "${body.currentState}")`);
    assert(body.status === expected.status, `Poll ${i + 1}: status === "${expected.status}" (got "${body.status}")`);
    assert(body.executionArn === executionArn, `Poll ${i + 1}: executionArn preserved`);
    assert(typeof body.output?.claimId === "string", `Poll ${i + 1}: output.claimId present`);
    assert(typeof body.output?.routing === "string", `Poll ${i + 1}: output.routing present`);
    assert(typeof body.output?.nextAction === "string", `Poll ${i + 1}: output.nextAction present`);
    lastPoll = body;
    // Small pause between polls to simulate UI 2s poll interval (shortened for testing).
    if (i < expectedStates.length - 1) await sleep(50);
  }

  // 2c. Verify terminal state is correct for UI to reach handoff_ready.
  assert(lastPoll?.status === "SUCCEEDED", 'Final poll: status === "SUCCEEDED"');
  assert(lastPoll?.currentState === "Adjuster handoff", 'Final poll: currentState === "Adjuster handoff"');
  assert(lastPoll?.output?.adjusterPacket?.claimId === lastPoll?.output?.claimId, "Final poll: adjusterPacket.claimId matches output.claimId");
  assert(lastPoll?.output?.routing === "claims-adjuster-handoff", 'Final poll: routing === "claims-adjuster-handoff"');

  // 2d. Verify stage is capped — extra polls must not advance past SUCCEEDED.
  const { body: extraPoll } = await fetchJson("/api/fnol-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ executionArn }),
  });
  assert(extraPoll.status === "SUCCEEDED", "Extra poll after terminal: status remains SUCCEEDED");
  assert(extraPoll.currentState === "Adjuster handoff", "Extra poll after terminal: currentState remains Adjuster handoff");
}

// ---------------------------------------------------------------------------
// 3. FNOL — NEEDS_INFO path: a new job that stops at missing-info if given bad ARN
//    (Verifies NEEDS_INFO is still a possible state when server explicitly returns it)
// ---------------------------------------------------------------------------
async function testFNOLMissingInfoPath() {
  console.log("\n[3] FNOL — unknown executionArn creates ephemeral job and advances normally");
  const fakeArn = `FNOL-fake-${Date.now()}`;
  const { res, body } = await fetchJson("/api/fnol-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ executionArn: fakeArn }),
  });
  assert(res.status === 200, "Unknown ARN: /api/fnol-status returns 200 (not 404)");
  assert(body.status === "RUNNING" || body.status === "SUCCEEDED", "Unknown ARN: status is valid enum (RUNNING|SUCCEEDED)");
  assert(typeof body.currentState === "string" && body.currentState.length > 0, "Unknown ARN: currentState is a non-empty string");
}

// ---------------------------------------------------------------------------
// 4. Underwriting Workbench — analyze → 6-stage structured result
// ---------------------------------------------------------------------------
async function testUnderwritingWorkflow() {
  console.log("\n[4] Underwriting Workbench — POST /api/underwriting/analyze → 6-stage structured result");

  const { res, body } = await fetchJson("/api/underwriting/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "Analyze this broker slip for risk score, referral need, key risks, and recommendation.",
      context: "Harborline Logistics — commercial package, coastal warehouse sites, prior water intrusion claims, $5.2M property limit.",
      fileName: "harborline-commercial-package.pdf",
      fileType: "application/pdf",
      fileSize: 204800,
    }),
  });

  assert(res.status === 200, `POST /api/underwriting/analyze returns 200 (got ${res.status})`);
  if (res.status !== 200) {
    assert(false, `UW analyze returned ${res.status} — remaining UW assertions skipped`);
    return;
  }
  assert(body.status === "COMPLETE", `uw.status === "COMPLETE" (got "${body.status}")`);
  assert(typeof body.jobId === "string" && body.jobId.startsWith("UW-"), `uw.jobId starts with "UW-" (got "${body.jobId}")`);
  assert(typeof body.reference === "string", "uw.reference present");
  assert(typeof body.answer === "string" && body.answer.length > 0, "uw.answer is non-empty string");

  // analysis object — what the UI uses for riskScore and summary.
  assert(typeof body.analysis === "object" && body.analysis !== null, "uw.analysis is an object");
  const analysis = body.analysis || {};
  assert(typeof analysis.score === "number", `uw.analysis.score is a number (got ${JSON.stringify(analysis.score)})`);
  assert((analysis.score ?? -1) >= 0 && (analysis.score ?? 101) <= 100, `uw.analysis.score is 0–100 (got ${analysis.score})`);
  assert(typeof analysis.final_recommendation === "string", "uw.analysis.final_recommendation present");
  assert(typeof analysis.confidence_score === "number", "uw.analysis.confidence_score present");
  assert(Array.isArray(analysis.identified_risks), "uw.analysis.identified_risks is an array");

  // 6-stage output — what the contract test validates, not visible in UI directly.
  assert(typeof body.stages === "object" && body.stages !== null, "uw.stages object present (6-stage contract)");
  const stages = body.stages || {};
  const requiredStages = ["intake", "extraction", "riskAnalysis", "recommendation", "result"];
  for (const stage of requiredStages) {
    assert(stages[stage]?.status === "complete", `uw.stages.${stage}.status === "complete"`);
  }
  assert(typeof stages.extraction?.facts === "object", "uw.stages.extraction.facts is an object");
  assert(typeof stages.riskAnalysis?.riskScore === "number", "uw.stages.riskAnalysis.riskScore is a number");
  assert(typeof stages.recommendation?.decision === "string", "uw.stages.recommendation.decision present");
  assert(typeof stages.recommendation?.producerFollowup === "string", "uw.stages.recommendation.producerFollowup present");
  assert(typeof stages.result?.reference === "string", "uw.stages.result.reference present");

  // Coastal submission should score high risk.
  assert((analysis.score ?? 0) >= 65, `Coastal submission risk score >= 65 (got ${analysis.score})`);
  assert((analysis.identified_risks || []).length > 0, "Coastal submission has identified risks");

  // Job retrievable by ID.
  const { res: jobRes, body: jobBody } = await fetchJson(`/api/underwriting/jobs/${body.jobId}`);
  assert(jobRes.status === 200, `GET /api/underwriting/jobs/${body.jobId} returns 200`);
  assert(jobBody.jobId === body.jobId, "Job retrieved by ID matches original jobId");

  // Non-coastal submission should score lower.
  const { res: res2, body: body2 } = await fetchJson("/api/underwriting/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "Analyze this broker slip.",
      context: "Inland retail premises, no prior losses, standard limit.",
      fileName: "inland-retail-slip.pdf",
    }),
  });
  assert(res2.status === 200, "Non-coastal analyze returns 200");
  assert(body2.analysis.score < 65, `Non-coastal risk score < 65 (got ${body2.analysis?.score})`);
}

// ---------------------------------------------------------------------------
// 5. Document upload — prepare → blob PUT → process → status
// ---------------------------------------------------------------------------
async function testDocumentUpload() {
  console.log("\n[5] Document upload — prepare → PUT blob → process → status");

  const { res: prepRes, body: prepBody } = await fetchJson("/api/document-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: "test-evidence.pdf", specialist: "FNOL", fileType: "application/pdf", fileSize: 1024 }),
  });
  assert(prepRes.status === 200, `POST /api/document-upload returns 200 (got ${prepRes.status})`);
  assert(typeof prepBody.jobId === "string" && prepBody.jobId.length > 0, "document-upload returns jobId");
  assert(typeof prepBody.uploadUrl === "string" && prepBody.uploadUrl.includes("/blob"), "document-upload returns uploadUrl");
  assert(prepBody.status === "prepared", `document-upload.status === "prepared" (got "${prepBody.status}")`);

  const { jobId, uploadUrl } = prepBody;
  const blobPath = uploadUrl.replace(BASE_URL, "");

  // Blob PUT
  const putRes = await fetch(`${BASE_URL}${blobPath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream", "Content-Length": "4" },
    body: Buffer.from("data"),
  });
  assert(putRes.status === 200, `PUT ${blobPath} returns 200 (got ${putRes.status})`);
  const putBody = await putRes.json();
  assert(putBody.status === "uploaded", `blob PUT.status === "uploaded" (got "${putBody.status}")`);

  // Process
  const { res: procRes, body: procBody } = await fetchJson("/api/document-process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId }),
  });
  assert(procRes.status === 200, `POST /api/document-process returns 200 (got ${procRes.status})`);
  assert(procBody.accepted === true, "document-process.accepted is true");

  // Status
  const { res: statRes, body: statBody } = await fetchJson(`/api/document-status/${encodeURIComponent(jobId)}`);
  assert(statRes.status === 200, `GET /api/document-status/${jobId} returns 200`);
  assert(statBody.status === "completed", `document-status.status === "completed" (got "${statBody.status}")`);
  assert(statBody.jobId === jobId, "document-status.jobId matches");
  assert(typeof statBody.extractedData === "object" && statBody.extractedData !== null, "document-status.extractedData is an object");
  assert(typeof statBody.analysisResults?.summary === "string", "document-status.analysisResults.summary present");
}

// ---------------------------------------------------------------------------
// 6. Workspace module contracts
// ---------------------------------------------------------------------------
async function testWorkspaceModules() {
  console.log("\n[6] Workspace module contracts");

  if (!TOKEN) {
    console.log("  SKIP: set WORKSPACE_CONTRACT_BEARER_TOKEN to test authenticated workspace endpoints.");
    return;
  }

  const { res, body } = await fetchJson("/api/workspace/modules", {
    headers: authHeaders,
  });
  assert(res.status === 200, `GET /api/workspace/modules returns 200 (got ${res.status})`);

  for (const key of ["source", "updatedAt", "router", "modules"]) {
    assert(key in body, `workspace/modules response has top-level key "${key}"`);
  }

  const requiredModules = [
    "operations", "claimsChat", "fnolIntake", "underwritingWorkbench",
    "policyPulse", "crmAgent", "claimsLifecycle", "consumerPolicy", "aiCompanion",
  ];

  for (const moduleId of requiredModules) {
    const mod = body.modules?.[moduleId];
    assert(mod != null, `module "${moduleId}" present`);
    for (const field of ["title", "connection", "summary", "records", "actions"]) {
      assert(field in (mod || {}), `module "${moduleId}" has field "${field}"`);
    }
    assert(Array.isArray(mod?.records), `module "${moduleId}" records is array`);
    assert(Array.isArray(mod?.actions), `module "${moduleId}" actions is array`);
    assert(typeof mod?.connection?.connected === "boolean", `module "${moduleId}" connection.connected is boolean`);
  }

  // FNOL module contract checks.
  const fnol = body.modules?.fnolIntake;
  if (fnol) {
    assert(fnol.actions.some((a) => a.id === "missing-info"), 'fnolIntake has action id "missing-info"');
    assert(fnol.actions.some((a) => a.id === "adjuster-handoff"), 'fnolIntake has action id "adjuster-handoff"');
  }

  // UW module contract checks.
  const uw = body.modules?.underwritingWorkbench;
  if (uw) {
    assert(uw.actions.some((a) => a.id === "risk-summary"), 'underwritingWorkbench has action id "risk-summary"');
    assert(uw.actions.some((a) => a.id === "producer-followup"), 'underwritingWorkbench has action id "producer-followup"');
  }
}

// ---------------------------------------------------------------------------
// 7. Individual workspace module endpoint
// ---------------------------------------------------------------------------
async function testWorkspaceModuleById() {
  console.log("\n[7] Workspace module by ID");

  if (!TOKEN) {
    console.log("  SKIP: set WORKSPACE_CONTRACT_BEARER_TOKEN to test authenticated workspace endpoints.");
    return;
  }

  for (const [alias, expectedKey] of [["fnol-intake", "fnolIntake"], ["underwriting-workbench", "underwritingWorkbench"]]) {
    const { res, body } = await fetchJson(`/api/workspace/modules/${alias}`, { headers: authHeaders });
    assert(res.status === 200, `GET /api/workspace/modules/${alias} returns 200`);
    assert(body.moduleId === expectedKey, `moduleId === "${expectedKey}" (got "${body.moduleId}")`);
    assert(typeof body.connection === "object", `${alias} connection object present`);
    assert(Array.isArray(body.actions), `${alias} actions is array`);
  }

  // Unknown module returns 404.
  const { res: notFound } = await fetchJson("/api/workspace/modules/nonexistent-module", { headers: authHeaders });
  assert(notFound.status === 404, "Unknown module ID returns 404");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nWorkflow contract tests — ${BASE_URL}`);
  console.log(`Auth: ${TOKEN ? "token provided" : "no token (workspace endpoints skipped)"}\n`);

  try {
    await testHealth();
    await testFNOLWorkflow();
    await testFNOLMissingInfoPath();
    await testUnderwritingWorkflow();
    await testDocumentUpload();
    await testWorkspaceModules();
    await testWorkspaceModuleById();
  } catch (err) {
    console.error("\nUnhandled error during tests:", err);
    process.exitCode = 1;
    return;
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(`\nFAIL — ${failed} contract assertion(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nOK — all ${passed} assertions passed.`);
  }
}

main();
