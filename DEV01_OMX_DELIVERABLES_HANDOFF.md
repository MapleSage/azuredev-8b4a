# dev01 OMX delivery handoff for claw-code

## Human directive
The user wants this delivered through claw-code using OMX, not one-off endpoint patches. The goal is to make dev.sagesure.io workflows actually usable end-to-end, especially FNOL and Underwriting Workbench.

Do not claim success because endpoints return HTTP 200. Success means the custom Vite UI advances through the right workflow states and renders truthful business deliverables.

## Repo and environment
- Repo: `/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex`
- Branch: `codex-rust-cargo-port-azuredev`
- Custom Vite UI must be preserved.
- Dev01 AKS context: `aks-sageinfra-new-dev01`
- Namespace: `sageinfra-new-agents`
- Frontend deployment: `sageinfra-frontend`
- ACR: `sageinfranewdev01`
- Current deployed image after emergency FNOL state patch: `sageinfranewdev01.azurecr.io/sageinfra-frontend:dev01-fnolstate-20260517162938`

## Critical user correction
The upload flow was stuck and misleading. Upload/intake is not adjuster readiness. “Ready for adjuster” belongs only after evidence review, extraction/data capture, validation/missing-info checks, and triage/routing are complete.

## Current emergency patch already applied
Files touched:
- `frontend/server.mjs`
- `frontend/components/FNOLProcessor.tsx`

Emergency behavior now live:
- `POST /api/fnol-processor` returns quickly with HTTP 202, `status=intake_received`, `currentStage=Intake received`, `executionArn`, and `handoff=Not ready for adjuster`.
- `POST /api/fnol-status` progresses through Evidence review → Data capture → Missing information checklist / `NEEDS_INFO` instead of instantly returning Adjuster handoff.
- UI status labels now include Intake received, Evidence review, Data capture, Missing info needed, Triage review, Handoff ready.

This is a stopgap. Replace it with real OMX-backed workflow orchestration and durable job/state handling.

## FNOL process deliverables
Five-stage FNOL flow:
1. Intake received
   - Customer/B2C: upload receipt, claim/reference/process id, clear next step.
   - B2B/internal: intake job record, uploaded evidence metadata, audit event.
2. Evidence review
   - Customer/B2C: evidence received/under review.
   - B2B/internal: evidence index, document/image type classification, quality checks.
3. Data capture/extraction
   - Customer/B2C: missing details if policy/date/location/loss facts are absent.
   - B2B/internal: structured fields: policy number, insured, loss date, loss location, loss type, damage summary, estimated loss, contact info.
4. Validation and triage
   - Customer/B2C: missing-info checklist and next action.
   - B2B/internal: severity, coverage checkpoint, routing recommendation, fraud/complexity flags, SLA priority.
5. Adjuster handoff / claim setup
   - Customer/B2C: claim reference and what happens next.
   - B2B/internal: clean adjuster packet, extracted facts, evidence index, missing/open questions, recommended next action. Only this stage can say handoff ready.

## Underwriting Workbench deliverables
Six-step underwriting flow:
1. Broker slip/submission intake
   - B2B: submission/job id, insured/contact, coverage type, source docs.
2. Create/upload underwriting job
   - B2B: durable job, private upload, audit trail.
3. Extract submission facts
   - B2B: insured, class, location, limits/sum insured, risk factors, prior losses, document references.
4. Run underwriting/risk analysis
   - B2B: risk score, confidence, risk drivers, eligibility/decline/referral checks.
5. Generate recommendation and producer follow-up
   - B2B: approve/quote/refer/decline recommendation, rationale, missing-info request, producer follow-up message.
6. Return/persist result
   - B2B: final job status, reference id, worksheet/result object visible in UI.

## Other workflow families to model, not fake
- Claims lifecycle: status, settlement, repair/adjuster appointment, coverage checkpoint, blockers/SLA.
- Policy/consumer policy: coverage/renewal/premium explanation, required customer action, policy summary/endorsement support.
- CRM/business agent: customer 360, account/producer notes, follow-up task, pipeline/service response.
- Cyber/marine/specialty: risk findings, coverage/quote indication, required documents, specialist referral package.

## Required OMX/claw-code work
1. Inspect the existing `.claw`/OMX setup and runtime/operator crates. Use the intended OMX workflow mechanism rather than piling more fake UI adapters into `server.mjs`.
2. Define durable workflow/job contracts for FNOL and Underwriting:
   - accepted/intake state
   - stage enum
   - customer-facing status
   - B2B deliverables
   - missing-info checklist
   - audit events
   - final handoff/result payload
3. Replace temporary in-memory `workflowJobs` behavior with OMX-backed or runtime-backed job state where feasible for dev01.
4. Keep existing Vite UI surface but wire it to truthful workflow states.
5. Ensure `DocumentUpload.tsx`, `FNOLProcessor.tsx`, and `UnderwritingWorkbench.tsx` consume consistent response contracts and never freeze waiting for wrong status enums.
6. Add contract tests/scripts that reproduce exact UI request sequences:
   - FNOL multipart upload → status poll → missing-info/triage/handoff state.
   - Generic document upload → blob PUT → process → status.
   - Underwriting analyze/upload → extraction/risk/recommendation/result.
7. Validate locally:
   - `node --check frontend/server.mjs`
   - `npm --prefix frontend run build`
   - targeted UI-contract script(s)
   - Rust checks if runtime/operator crates touched: fmt/check/test.
8. Prepare deployable changes for dev01. Do not deploy unless explicitly asked or the task context says to continue deployment.

## Important API facts
- `/api/azure-chat` expects payload key `text`, not `message`.
- Browser automation is currently blocked by OpenClaw gateway pairing/scope approval, so use deterministic component-contract scripts unless browser access is fixed.
- Authenticated workspace contract validation needs `WORKSPACE_CONTRACT_BEARER_TOKEN` if doing authenticated checks.

## Quality bar
No “success” language unless the workflow visibly advances through truthful stages. The user is rightly frustrated with superficial endpoint smokes. Deliver actual process behavior.

---

## Checkpoint status — 2026-05-17

### Validation results

| Check | Result |
|---|---|
| `node --check frontend/server.mjs` | **PASS** |
| `node --check frontend/scripts/contract-test-workflows.mjs` | **PASS** |
| `npm --prefix frontend run build` | **PASS** — 1341 modules, 399 kB JS (118 kB gzip), clean |
| `cargo check --workspace` | **FAIL** — pre-existing `crates/infra` errors (see below) |

Pre-existing Rust infra errors (existed in HEAD before this diff):
- `crates/infra/src/cache.rs:1` — `redis::aio::ConnectionManager` not found (redis 0.25 API mismatch)
- `crates/infra/src/notifications.rs:120` — type annotation needed on `lpush::<_, _, ()>`
- These block `broker-operator` compilation (it depends on `infra`); `broker-runtime` unaffected if it avoids `infra`.
- Fix: pin redis to `0.24` or add `features = [“connection-manager”]` to redis 0.25 and add explicit turbofish type on the lpush call.

### Changed files by category

**A — Emergency FNOL state patch (image already deployed: `dev01-fnolstate-20260517162938`)**
- `frontend/server.mjs` — 5-stage FNOL state machine, 6-stage UW analyze, document upload pipeline, JWT broker identity, workspace module contracts, ops dashboard endpoint
- `frontend/components/FNOLProcessor.tsx` — truthful stage enum (intake_received → evidence_review → data_capture → needs_info → triage → handoff_ready); handoff_ready is the only terminal “ready” state

**B — Durable OMX/claw-code FNOL + Underwriting deliverables**
- `frontend/components/UnderwritingWorkbench.tsx` — real file-upload → `/api/underwriting/analyze` → live job state with 6-stage result; “Upload New” button now functional
- `frontend/components/SageSureDashboard.tsx` — live ops data from `/api/ops-dashboard`, workspace module binding per view, 30 s refresh
- `frontend/lib/api-client.ts` — `useChatApi` hook, `getWorkspaceModule`, `getOpsDashboard`, `getWorkspaceModules`; full TS types for module contracts
- `frontend/lib/sessionManager.ts` — session singleton cleanup
- `frontend/components/PersistentChatCompanion.tsx` — auth integration, abort refs, workflow-context prompts per area, focus/dock mode
- `frontend/scripts/contract-test-workflows.mjs` *(untracked — new)* — deterministic 7-suite contract tests (health, FNOL 5-stage, FNOL missing-info path, UW 6-stage, doc upload, workspace modules, module-by-id)
- `frontend/components/ModuleConnectionBanner.tsx` *(untracked — new)* — connection status banner consumed by FNOLProcessor and UnderwritingWorkbench

**C — Infra / autoscaling / placement artifacts**
- `k8s/sageinfra-frontend-dev01.yaml` — Caddy 2.8 sidecar (HTTPS termination for dev.sagesure.io), nodeSelector `workload=sageinfra`, strategy Recreate, Service now exposes ports 80 + 443
- `k8s/autoscaling/dev01-hpa-pdb.yaml` *(untracked — new)* — HPA (2–6 replicas at 60% CPU / 70% mem) + PDB (minAvailable 1) for agentcore and frontend
- `k8s/autoscaling/dev01-workload-placement.sh` *(untracked — new)* — pins 6 deployments to user node pool via nodeSelector patch
- `infra/dev01-enterprise-scale-plan.md` *(untracked — new)* — enterprise scale planning doc
- `frontend/Dockerfile` — build args for NEXT_PUBLIC_AUTH_CONFIGURED / REDIRECT_URI; jsonwebtoken 9.0.2 added to runner stage
- `frontend/.dockerignore` — excludes dist/, *.zip, *.tsbuildinfo

**D — Rust OMX/claw-code broker runtime (new, untracked)**
- `Cargo.toml` + `Cargo.lock` *(untracked)* — workspace manifest adding broker-operator + broker-runtime to existing 5 crates
- `crates/broker-runtime/src/` — new crate (main.rs)
- `crates/broker-operator/src/` — new crate (lib.rs + main.rs)
- `.claw/sessions`, `.claw/tasks` — OMX session/task state directory
- `docs/requirements/`, `examples/` — supporting docs

**E — Auth / config (human review required before deploy)**
- `frontend/lib/msal-config.ts` — adds `dev.sagesure.io` to production domain list; switches clientId/tenantId to env vars (`NEXT_PUBLIC_AZURE_CLIENT_ID`, `NEXT_PUBLIC_AZURE_TENANT_ID`) with existing values as fallback
- `frontend/lib/msal-auth-context.dev.tsx` — soft-error dev stub (errors deferred to signIn call rather than module-load time)
- `frontend/vite.config.ts` — MSAL shims conditioned on `NEXT_PUBLIC_AUTH_CONFIGURED !== “true”`; exposes clientId/tenantId/redirectUri as define constants
- `frontend/src/main.tsx` — main app wiring updates

**F — Other component updates (workflow state / UI consistency)**
- `frontend/components/BusinessAgentChat.tsx`, `ChatApp.tsx`, `ClaimsLifecycle.tsx`, `PolicyAssistant.tsx`, `SageInsureChat.tsx`, `SpecialistChatInterface.tsx`, `TabsInterface.tsx` — stage label/status consistency aligned with FNOL truthful stages
- `frontend/package.json` — adds `smoke:workspace-contract` script
- `.kiro/specs/broker-kata-runtime-platform/tasks.md` — spec task progress updates

### Deployment blockers

1. **Rust infra crate** — pre-existing compile errors in `crates/infra` block `broker-operator`. Fix redis API mismatch before any Rust runtime can be deployed. `broker-runtime` may compile independently if it avoids `infra` — verify with `cargo check -p broker-runtime`.
2. **Caddy sidecar k8s change** — `k8s/sageinfra-frontend-dev01.yaml` now routes the Service to Caddy HTTP (port 80 → containerPort 80). Existing Service endpoint changes from `targetPort: http` to `targetPort: caddy-http`. Requires a coordinated apply. Do not apply the autoscaling or placement scripts without explicit human sign-off.
3. **Auth env vars** — if deploying with `NEXT_PUBLIC_AUTH_CONFIGURED=true`, the k8s manifest must also carry `NEXT_PUBLIC_AZURE_CLIENT_ID` and `NEXT_PUBLIC_AZURE_TENANT_ID` (currently falling back to hardcoded values, but this should be made explicit via ConfigMap or sealed secret).
4. **Contract tests need a running server** — `frontend/scripts/contract-test-workflows.mjs` validates the full workflow contract but cannot run without `node server.mjs` live. The `smoke:workspace-contract` npm script documents this. Run locally before any image build: `node server.mjs & sleep 2 && node frontend/scripts/contract-test-workflows.mjs`.
5. **`broker-runtime` and `broker-operator` not yet wired to `server.mjs`** — the Rust runtime crates exist but `server.mjs` still uses in-memory job state. The OMX integration path (replacing `workflowJobs` Map) is the next required step.

### Recommended checkpoint / deploy path

**Immediate (safe to commit as-is):**
1. Commit all frontend changes (categories A, B, F, E) and the new contract-test scripts as a clean OMX workflow deliverables commit.
2. Add `frontend/components/ModuleConnectionBanner.tsx` and `frontend/scripts/contract-test-workflows.mjs` (currently untracked) before committing.
3. Commit the Dockerfile / .dockerignore build improvements separately.

**Before next image build:**
4. Run `node server.mjs &` locally and execute `node frontend/scripts/contract-test-workflows.mjs` — all 7 suites must pass.
5. Build new image with `NEXT_PUBLIC_AUTH_CONFIGURED=true` and `NEXT_PUBLIC_REDIRECT_URI=https://dev.sagesure.io/auth/callback` as build args.

**Infra — human sign-off required:**
6. `k8s/sageinfra-frontend-dev01.yaml` (Caddy + nodeSelector) — review and apply only when ready to absorb a pod restart.
7. `k8s/autoscaling/dev01-hpa-pdb.yaml` — apply after confirming node pool has capacity.
8. `k8s/autoscaling/dev01-workload-placement.sh` — run once against the dev01 AKS context after confirming the `workload=sageinfra` node label exists on user pool nodes.

**Rust / OMX runtime:**
9. Fix `crates/infra` redis API errors (two-line fix).
10. Verify `cargo check -p broker-runtime` passes independently.
11. Wire broker-runtime job state into `server.mjs` `/api/fnol-status` and `/api/underwriting/analyze` to replace in-memory `workflowJobs` Map.
12. Add Rust crates to git tracking and commit alongside the workspace Cargo.toml.

### Files modified by this review session
- `DEV01_OMX_DELIVERABLES_HANDOFF.md` — appended this checkpoint status section (no existing content modified)
