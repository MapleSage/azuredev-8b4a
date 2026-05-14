# Implementation Plan: Broker/POSP Kata Runtime Platform

## Status Legend

- [ ] Not started
- [~] In progress / partial
- [x] Complete with live evidence
- [!] Gap or corrective task — requires action

## Current Standing Summary (2026-05-14)

- [~] AKS dev01 exists and is reachable.
  - Evidence: context `aks-sageinfra-new-dev01`; namespace `sageinfra-new-agents` has shared agent/frontend pods.
- [~] Kata capability exists but is NOT used by any app workload.
  - Evidence: RuntimeClasses `kata-vm-isolation` and `runc` exist; `kubectl get pods -n sageinfra-new-agents -o jsonpath='{...spec.runtimeClassName}'` returns empty for all pods.
- [~] AKS OIDC and Workload Identity are enabled at cluster level.
  - Evidence: AKS OIDC issuer confirmed enabled; `azure-wi-webhook-controller-manager` running.
- [!] Per-broker namespace model is entirely missing.
  - Evidence: `kubectl get namespaces -l sage.suresure.ai/posp-id` returns nothing.
- [!] Broker Runtime Operator is missing.
  - Evidence: No operator/controller deployment in `sageinfra-new-agents` or any namespace.
- [!] Workload Identity NOT wired end-to-end for any current app workload.
  - Evidence: `sageinfra-workload-identity` SA in `sageinfra-new-agents` has no `azure.workload.identity/client-id` annotation.
- [!] Azure Policy, Defender for Containers, KEDA, and VPA are all absent.
  - Evidence: AKS addon profile shows null/disabled for all four.
- [!] Frontend has auth bypass in live deployment.
  - Evidence: `k8s/sageinfra-frontend-dev01.yaml` line 44 sets `NEXT_PUBLIC_DISABLE_AUTH=true`; `ChatApp.tsx:284` uses hardcoded `"demo-token"` fallback; `msal-auth-context.dev.tsx` provides synthetic user.
- [!] CRITICAL: `k8s/backend-deployment.yaml` contains plaintext Azure Client Secret and API keys.
  - These manifests must NOT be applied. Credentials may require rotation.
- [!] `k8s-manifests/secrets.yaml` contains base64-encoded (not encrypted) Azure API credentials.
  - Base64 is trivially reversible. Treat as plaintext. Do not apply.

See `current-state.md` for full evidence and risk table.

---

## Phase 0: Correct the Baseline and Stop Demo Drift

### 0.1 Baseline Documentation ✅ (revised 2026-05-14)
- [x] Create target architecture requirements/design/tasks under `.kiro/specs/broker-kata-runtime-platform/`.
  - Evidence: Requirements, design, and tasks exist. **This revision of tasks.md incorporates audit findings from 2026-05-14 that were not in the first draft.**
  - Requirements: 12.1

### 0.2 Current State and Gap Document
- [x] Create `current-state.md` separating shared prototype from target architecture.
  - Evidence: `.kiro/specs/broker-kata-runtime-platform/current-state.md` created 2026-05-14.
  - Contains: live AKS state, secrets audit findings, exact verification commands.
  - Requirements: 11.3, 12.3

### 0.3 UI Module Inventory
- [x] Create `ui-module-inventory.md` for all 26 visible tabs/modules.
  - Evidence: `.kiro/specs/broker-kata-runtime-platform/ui-module-inventory.md` created 2026-05-14.
  - Status: 0 Live, 10 Partial, 13 Stub/Dummy, 10 Hidden-needed, 0 with broker context.
  - Requirements: 9.1, 9.2

### 0.4 Agent and Runtime Inventory
- [x] Create `agent-runtime-inventory.md` documenting all current agents and their gaps.
  - Evidence: `.kiro/specs/broker-kata-runtime-platform/agent-runtime-inventory.md` created 2026-05-14.
  - Requirements: 11.3

### 0.5 Quarantine Secret-Bearing Manifests ← IMMEDIATE — DO BEFORE ANY KUBECTL APPLY
- [x] Move `k8s/backend-deployment.yaml` to `legacy/DO_NOT_APPLY/k8s/backend-deployment.yaml`.
  - This file contains a plaintext Azure Client Secret, plaintext Azure OpenAI API key, and plaintext tenant/client IDs.
  - Added a `DO_NOT_APPLY` header comment to the moved file.
  - Requirements: 4.3, 12.4
- [x] Move `k8s-manifests/secrets.yaml` to `legacy/DO_NOT_APPLY/k8s-manifests/secrets.yaml`.
  - Contains base64-encoded (trivially reversible) Azure OpenAI and Azure Search credentials.
  - Requirements: 4.3
- [x] Move all remaining files from `k8s-manifests/` that reference `sageinsure`, `localhost`, or static credentials to `legacy/DO_NOT_APPLY/k8s-manifests/`.
  - Moved: `agents-deployment.yaml`, `backend-deployment.yaml`, `backend-proxy.yaml`, `complete-ingress.yaml`, `frontend-deployment.yaml`, `ingress.yaml`, `mcp-servers.yaml`, and `secrets.yaml`.
  - Requirements: 4.3, 10.3
- [x] Add a `legacy/DO_NOT_APPLY/README.md` explaining why these files are quarantined and that they must not be applied.

### 0.6 Credential Rotation Assessment ← SECURITY — PARALLEL WITH 0.5
- [x] Determine if the Azure Client Secret/API keys in `k8s/backend-deployment.yaml` and `k8s-manifests/secrets.yaml` were ever pushed to a shared remote or applied to the cluster.
  - Git assessment: sensitive legacy paths are reachable from `origin/main` via commit `c965333`; `origin/main` still contains the legacy paths until the quarantine commit is pushed/merged.
  - AKS read-only assessment: context `aks-sageinfra-new-dev01` has `sageinfra-openai-secret` and `sageinfra-search-secret` in namespace `sageinfra-new-agents`, and workloads reference those Secrets.
  - Outcome: treat affected Azure OpenAI/Search credentials as exposed and rotate before further cluster work. Azure app/client secret exposure also requires rotation if that value is still valid or was used outside the repo.
  - Requirements: 4.3, 10.3
- [ ] Rotate affected Azure OpenAI/Search keys and any still-valid Azure app/client secret.
  - External security action; requires explicit operator approval because it can break currently running workloads until references are updated.

### 0.7 Remove Frontend Auth Bypass
- [x] Remove or disable `NEXT_PUBLIC_DISABLE_AUTH=true` from `k8s/sageinfra-frontend-dev01.yaml`.
  - Set deployed manifest and Docker build default to `NEXT_PUBLIC_DISABLE_AUTH=false`.
  - Because HTTPS hostname / registered Entra redirect URI is not configured in this repo, `frontend/src/main.tsx` now shows an explicit auth-not-configured blocker instead of silently launching a synthetic-user console.
  - Requirements: 8.1, 8.3
- [x] Remove `"demo-token"` hardcoded fallback from `frontend/components/ChatApp.tsx:284`.
  - If no valid session token exists, chat requests now fail before calling `/api/azure-chat`.
  - Requirements: 8.1
- [x] Remove hardcoded `"Nick D"` fallback display name from `frontend/components/TabsInterface.tsx:362`.
  - If no authenticated user is provided, the UI uses an unauthenticated placeholder instead of a fake person.
  - Requirements: 8.1

### 0.8 Hide Stub Modules in UI
- [ ] Add `hidden: true` flag to `productAreas` items in `TabsInterface.tsx` for all 10 Hidden-needed modules:
  `tasks`, `claims-queue`, `uw-queue`, `scamshield`, `policy-pulse`, `claims-defender`, `document-vault`, `renewals`, `buying-assistance`, `producer`.
  - Filter out `hidden: true` items in the sidebar `items.map()` render.
  - Requirements: 9.2
- [ ] Remove hardcoded badge numbers for items without live data: `tasks` badge "12", `claims-queue` badge "31", `uw-queue` badge "18".
  - Requirements: 9.2

### 0.9 Remove Misleading Status Widget
- [ ] Remove or replace hardcoded "dev01 online / AgentCore connected locally via secure port-forward" widget from `TabsInterface.tsx:637–641`.
  - If a status indicator is needed, wire it to an actual health check endpoint.
  - Requirements: 11.4

---

## Phase 1: BrokerRuntime CRD and Operator Skeleton

### 1.1 Choose and Scaffold Operator Implementation
- [ ] Decision: use Rust `kube-rs` crate (consistent with `crates/` workspace).
  - Create `crates/broker-operator/Cargo.toml` with dependencies: `kube`, `kube-derive`, `k8s-openapi`, `serde`, `serde_json`, `tokio`, `anyhow`, `tracing`.
  - Requirements: 5.2
  - Definition of done: `cargo build -p broker-operator` succeeds with no errors.

### 1.2 Define BrokerRuntime CRD Schema
- [ ] Create CRD YAML at `crates/broker-operator/crds/brokerruntime.yaml`.
  - Fields per design.md §1: `pospId`, `tenantId`, `brokerName`, `lifecycleState` (enum: Active, Suspended, Offboarding), `runtime.image`, `runtime.runtimeClassName`, `runtime.minReplicas`, `runtime.maxReplicas`, `runtime.idleAfterMinutes`, `identity.managedIdentityName`, `identity.serviceAccountName`, `workspace.storageRef`, `workspace.mountPath`, `knowledgeBase.version`, `knowledgeBase.refs[]`, `tools[]`, `skills[]`, `policy.dataClassification`, `policy.networkProfile`.
  - Status fields: `phase`, `namespace`, `runtimePod`, `lastActivityTime`, `conditions[]`.
  - Requirements: 5.1, 11.1
  - Definition of done: `kubectl apply -f crds/brokerruntime.yaml` succeeds; `kubectl get crd brokerruntimes.platform.sagesure.ai` shows the CRD.

### 1.3 Implement Operator Reconcile Loop
- [ ] `crates/broker-operator/src/main.rs`: tokio async runtime; Controller for BrokerRuntime; error_policy; reconcile function signature.
  - Reconcile must: read BrokerRuntime CR, update status conditions, not crash on missing resources.
  - Requirements: 5.2, 5.4
  - Definition of done: operator starts, connects to cluster, watches BrokerRuntime CRs, logs reconcile events.

### 1.4 Reconcile: Namespace
- [ ] In reconcile: create or patch `broker-{posp_id}` namespace.
  - Labels: `sage.suresure.ai/posp-id`, `sage.suresure.ai/tenant-id`, `sage.suresure.ai/lifecycle-state`, `sage.suresure.ai/data-classification`.
  - Requirements: 1.1, 1.2
  - Definition of done: apply a BrokerRuntime CR with `pospId: "test-123"`; verify `kubectl get namespace broker-test-123` shows namespace with correct labels.

### 1.5 Reconcile: Finalizer and Cleanup
- [ ] Add finalizer `platform.sagesure.ai/broker-cleanup` to BrokerRuntime CR on creation.
  - On deletion: delete namespace (which GCs all namespaced resources); call Azure SDK to remove federated credential; update status to Offboarding.
  - Requirements: 1.4, 4.4, 6.4
  - Definition of done: delete BrokerRuntime CR; verify namespace is garbage-collected and federated credential is removed.

---

## Phase 2: Identity, Network Policy, and Namespace Guardrails

### 2.1 Reconcile: Broker ServiceAccount with Workload Identity
- [ ] Create `broker-runtime` ServiceAccount in `broker-{posp_id}` namespace.
  - Annotations: `azure.workload.identity/client-id: <client-id>`.
  - Labels: `azure.workload.identity/use: "true"`.
  - Requirements: 4.1, 4.2
  - Definition of done: `kubectl get sa broker-runtime -n broker-test-123 -o yaml` shows annotation with valid client ID.

### 2.2 Managed Identity Strategy Decision
- [ ] Decide: one UAMI per broker (isolation, Azure RBAC scoping) vs. shared UAMI with per-resource conditions.
  - For dev01 with small broker count: one UAMI per broker is cleaner.
  - Azure limit: 20 federated credentials per UAMI. Plan for scale.
  - Create UAMI `mi-broker-{posp_id}` via ARM/Terraform/CLI as part of operator reconcile or pre-provisioned.
  - Requirements: 4.2, 4.4
  - Definition of done: UAMI exists in Azure; operator annotates SA with its client ID.

### 2.3 Reconcile: Entra Federated Credential
- [ ] Operator calls Azure ARM/Graph API to create federated credential:
  - Subject: `system:serviceaccount:broker-{posp_id}:broker-runtime`
  - Issuer: AKS OIDC issuer URL
  - Audience: `api://AzureADTokenExchange`
  - Requirements: 4.1, 4.2
  - Definition of done: federated credential exists in Azure portal for the UAMI; pod can exchange SA token for Azure access token without a client secret.

### 2.4 Reconcile: ResourceQuota and LimitRange
- [ ] Apply per-namespace ResourceQuota (max pods, CPU, memory) and LimitRange (default container requests/limits).
  - Requirements: 6.1, 10.3
  - Definition of done: `kubectl get resourcequota,limitrange -n broker-test-123` shows configured objects.

### 2.5 Reconcile: NetworkPolicies
- [ ] Apply default-deny-all ingress and egress NetworkPolicy.
- [ ] Apply allowlist egress: DNS (UDP/TCP port 53 to kube-dns), Azure service endpoints (HTTPS 443), platform gateway ingress only.
  - Requirements: 7.1, 7.2, 7.3
  - Definition of done: pod in `broker-test-123` cannot reach pod in `broker-test-456` or `sageinfra-new-agents`; pod can resolve DNS and reach approved Azure endpoints.

### 2.6 Enable Azure Policy for AKS
- [ ] Run `az aks enable-addons --addons azure-policy -n aks-sageinfra-new-dev01 -g <rg>` (confirm resource group first).
  - Requirements: 10.1
  - Definition of done: `az aks show ... --query addonProfiles.azurepolicy.enabled` returns `true`.

### 2.7 Enable Defender for Containers
- [ ] Enable via Azure Defender settings on the subscription/workspace.
  - Requirements: 10.2
  - Definition of done: AKS security profile shows Defender enabled.

### 2.8 Admission Policy: Require Kata for Broker Pods
- [ ] Create Azure Policy (or OPA Gatekeeper constraint) requiring `runtimeClassName: kata-vm-isolation` on any pod in a namespace labeled `sage.suresure.ai/posp-id`.
  - Requirements: 2.1, 10.3
  - Definition of done: attempting to deploy a pod without Kata runtime in `broker-*` namespace is rejected by admission.

---

## Phase 3: Minimal Kata Broker Runtime Vertical Slice

### 3.1 Build Broker Runtime Image
- [ ] Create `Dockerfile` for broker runtime image.
  - Base: minimal distroless or UBI image.
  - Contents: gateway HTTP handler (health/readiness endpoints, broker chat endpoint), workspace loader, config loader (reads `tools.yaml`, `skills.yaml`, `kb.yaml`).
  - No static secrets in image.
  - Requirements: 3.1, 3.2, 3.3, 2.4
  - Definition of done: image builds; `docker run` shows `/healthz` returns 200; no secrets in `docker inspect`.

### 3.2 Reconcile: Broker Runtime Deployment
- [ ] Operator creates Deployment in `broker-{posp_id}` with:
  - `runtimeClassName: kata-vm-isolation`
  - `serviceAccountName: broker-runtime`
  - `labels: azure.workload.identity/use: "true"`
  - Explicit CPU/memory requests and limits
  - Read-only root filesystem
  - Non-root user (UID 1000)
  - No env vars with static secrets
  - Liveness/readiness probes on `/healthz` and `/readyz`
  - Requirements: 2.1, 2.4, 3.1
  - Definition of done: `kubectl get pod -n broker-test-123 -o jsonpath='{...spec.runtimeClassName}'` returns `kata-vm-isolation`.

### 3.3 Create Sample BrokerRuntime `broker-test-123` in dev01
- [ ] Apply a BrokerRuntime CR to dev01 with `pospId: "test-123"`, `lifecycleState: Active`, `runtimeClassName: kata-vm-isolation`.
  - Requirements: 1.1, 2.1
  - Definition of done: namespace `broker-test-123` exists; one Kata pod is Running; CR status shows `phase: Ready`.

### 3.4 Verify Kata Runtime Live
- [ ] Record output of:
  ```bash
  kubectl get pods -n broker-test-123 -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.runtimeClassName}{"\n"}{end}'
  ```
  Must show `kata-vm-isolation`.
  - Requirements: 2.4, 12.2

### 3.5 Verify Workload Identity End-to-End
- [ ] From inside broker-test-123 pod, exchange ServiceAccount token for Azure access token:
  ```bash
  curl -s -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"
  ```
  Or use Azure SDK call to access an approved resource (e.g., read from Key Vault secret).
  - Requirements: 4.2, 4.3, 12.2
  - Definition of done: token exchange succeeds; resource accessed without any static secret in pod env.

### 3.6 Broker Runtime Status Output
- [ ] Add status API or `kubectl` query that shows for each BrokerRuntime:
  - Namespace, pod name, image, image digest, runtimeClassName, identity client ID, KB version, tools list, skills list, last activity time, health state.
  - Requirements: 11.1
  - Definition of done: `kubectl get brokerruntime broker-test-123 -o yaml` shows all status fields populated.

---

## Phase 4: Gateway, Workspace, KB, Tools, and Skills

### 4.1 Broker Gateway Route Contract
- [ ] Implement HTTP endpoint in broker runtime: `POST /chat` accepts `{message, conversationId, brokerId}`, returns streaming or JSON response.
  - Gateway enforces: request must carry broker JWT; brokerId must match this pod's POSP ID.
  - Requirements: 3.1, 8.2

### 4.2 Workspace Hydration
- [ ] Define workspace layout: `/workspace/{broker_id}/` containing conversation history, uploaded docs, broker-specific config.
  - Storage backend: Azure Blob via Workload Identity (no static storage key).
  - Mount or hydrate on pod start.
  - Requirements: 3.2

### 4.3 KB Manifest Loading
- [ ] Runtime reads `/config/kb.yaml` on startup; connects to broker's Azure Cognitive Search index.
  - KB refs per BrokerRuntime spec; no cross-broker index access.
  - Requirements: 3.3

### 4.4 Tool Manifest Enforcement
- [ ] Runtime reads `/config/tools.yaml`; only tools listed are accessible to skills.
  - Attempting to invoke an unlisted tool returns explicit "tool not approved" error.
  - Requirements: 3.4

### 4.5 Skill Manifest Enforcement
- [ ] Runtime reads `/config/skills.yaml`; only skills listed are loaded.
  - Operator updates ConfigMap when BrokerRuntime spec changes; pod picks up change on restart.
  - Requirements: 3.5

### 4.6 Move Chat Path from Shared AgentCore to Broker Runtime
- [ ] Frontend `/api/azure-chat` proxy → replaced by Broker Runtime Router that reads broker context from auth token and forwards to `broker-{posp_id}` service.
  - Shared AgentCore remains only as dev fallback until all brokers have runtimes.
  - Requirements: 3.1, 8.2, 11.2

---

## Phase 5: POSP Signup Lifecycle API

### 5.1 Define POSP Signup Webhook Schema
- [ ] Schema: `{event: "signup"|"update"|"suspend"|"resume"|"offboard", pospId, tenantId, brokerName, config: {tools[], skills[], kbRefs[]}, idempotencyKey}`.
  - Requirements: 5.1

### 5.2 Build Lifecycle API
- [ ] Rust Axum or Python FastAPI service in `sageinfra-new-agents` namespace.
  - `POST /posp/signup` → create BrokerRuntime CR.
  - `PATCH /posp/{posp_id}` → update CR spec.
  - `POST /posp/{posp_id}/suspend` → set `lifecycleState: Suspended`.
  - `POST /posp/{posp_id}/resume` → set `lifecycleState: Active`.
  - `DELETE /posp/{posp_id}` → set `lifecycleState: Offboarding`.
  - Operator handles all Kubernetes/Azure reconciliation — lifecycle API only writes CRs.
  - Requirements: 5.1, 5.3

### 5.3 Idempotency and Replay Protection
- [ ] Idempotency key in request; deduplicate on received key; return same response on replay.
  - Requirements: 5.3, 5.4

### 5.4 Lifecycle Audit Log
- [ ] Emit structured event log entry for every lifecycle state change: `{timestamp, pospId, event, initiator, outcome}`.
  - Requirements: 10.4, 11.2

---

## Phase 6: Auth, Frontend, and Tenant Routing

### 6.1 Configure HTTPS Hostname for dev01
- [ ] Provision a hostname (e.g., `dev01.sagesure.internal` or a public DNS name) with TLS.
  - Register redirect URI in Entra app registration.
  - Requirements: 8.1, 8.3
  - Blockers: requires DNS zone and TLS cert (Let's Encrypt or Azure-managed).

### 6.2 Restore Login Page as Default Unauthenticated State
- [ ] Remove `NEXT_PUBLIC_DISABLE_AUTH=true` from all K8s manifests.
  - Configure MSAL auth flow with real Entra tenant ID, client ID, redirect URI.
  - Unauthenticated users see login page.
  - Requirements: 8.1

### 6.3 Resolve Authenticated User to POSP/Broker IDs
- [ ] Backend endpoint: `GET /me/brokers` — reads identity claims from JWT; returns list of POSP IDs the user is authorized for.
  - Requirements: 8.2, 8.4

### 6.4 Implement Broker Runtime Router
- [ ] Middleware or sidecar that: validates bearer token; extracts broker claim; checks user is authorized for that broker; forwards to `http://broker-{posp_id}-gateway.broker-{posp_id}.svc.cluster.local/chat`.
  - Returns 403 if user is not authorized for the requested broker.
  - Requirements: 8.2, 8.4

### 6.5 Update Frontend Modules to Pass Broker Context
- [ ] All chat/agent calls include `brokerId` from resolved POSP identity.
  - Requirements: 9.1, 9.4

### 6.6 Add Per-Module Contract Tests
- [ ] For each module not marked hidden: automated test that calls real backend endpoint and verifies non-empty response with valid schema.
  - Requirements: 9.3

---

## Phase 7: Autoscaling and Idle Cleanup

- [ ] 7.1 Enable KEDA ScaledObject for broker runtime pods (scale on queue depth or HTTP requests).
- [ ] 7.2 Track last activity timestamp in BrokerRuntime status; update on every handled request.
- [ ] 7.3 Operator scales runtime to zero when `lastActivityTime` > `idleAfterMinutes`.
- [ ] 7.4 On resume, operator restores runtime from zero; enforces cold-start SLO.
- [ ] 7.5 Implement offboarding retention: archive workspace to cold storage; delete runtime; retain CR for audit period.

---

## Phase 8: Observability and Operations

- [ ] 8.1 Structured logs: every request log entry includes `pospId`, `brokerNamespace`, `conversationId`, `skill`, `tool`, `latencyMs`, `outcome`.
- [ ] 8.2 BrokerRuntime status API: `GET /platform/brokers` returns list of all BrokerRuntime CRs with their status fields.
- [ ] 8.3 Alerts: runtime NotReady for >5 min, Workload Identity token failure, NetworkPolicy violation, idle cleanup failure, high error rate.
- [ ] 8.4 Tenant isolation validation tests: prove pod in `broker-A` cannot reach pod in `broker-B`; prove no cross-broker data in KB responses.

---

## Phase 9: Production Hardening

- [ ] 9.1 Image signing (Notation/Cosign) and admission policy verifying signature before broker runtime pod is admitted.
- [ ] 9.2 Resource sizing for Kata workloads (Kata VM overhead is higher than runc); review node pool sizing.
- [ ] 9.3 Backup/restore for broker workspace: Azure Blob versioning, Velero for PVCs.
- [ ] 9.4 Cold-start load testing: verify broker runtime becomes Ready within defined SLO after scale-from-zero.
- [ ] 9.5 Security review: confirm no secrets in repo history, images, manifests, or env vars.

---

## Immediate Build Order (Phase 0 and Phase 1)

Execute in this order. Each step has a concrete definition of done.

1. **[Security — NOW]** Move `k8s/backend-deployment.yaml` and `k8s-manifests/secrets.yaml` to `legacy/DO_NOT_APPLY/`. Assess whether credentials need rotation (task 0.5, 0.6).
2. **[Frontend — NOW]** Remove `"demo-token"` fallback and `"Nick D"` hardcoded name. Hide 10 stub modules. Remove hardcoded status widget (tasks 0.7, 0.8, 0.9).
3. **[Operator — Phase 1]** Scaffold `crates/broker-operator/` with `kube-rs`; define BrokerRuntime CRD; implement reconcile loop (tasks 1.1, 1.2, 1.3).
4. **[Operator — Phase 1]** Add namespace reconciliation; apply BrokerRuntime `broker-test-123` to dev01; verify namespace created with correct labels (task 1.4).
5. **[Identity — Phase 2]** Create UAMI for broker-test-123; wire federated credential; annotate ServiceAccount; verify token exchange from pod (tasks 2.1, 2.2, 2.3).
6. **[Runtime — Phase 3]** Build broker runtime image; deploy with `runtimeClassName: kata-vm-isolation`; verify `kata-vm-isolation` in pod spec (tasks 3.1, 3.2, 3.3, 3.4).
7. **[Network — Phase 2]** Apply default-deny NetworkPolicies; verify tenant isolation (task 2.5).
8. **[Routing — Phase 4]** Route one broker chat request from frontend through Broker Runtime Router to `broker-test-123` runtime (task 4.6).
