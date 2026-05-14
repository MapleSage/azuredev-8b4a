# Agent and Runtime Inventory: Broker/POSP Kata Runtime Platform

**Assessed:** 2026-05-14  
**Cluster context:** `aks-sageinfra-new-dev01`  
**App namespace:** `sageinfra-new-agents`

This document records where current agents live, what they actually do, how they are deployed, and why each is not the target per-broker runtime architecture.

---

## 1. Shared AgentCore (Primary Live Service)

| Field | Value |
|-------|-------|
| Kubernetes name | `sageinfra-agentcore` |
| Namespace | `sageinfra-new-agents` |
| Image | `sageinsureacreedfa81f.azurecr.io/sageinsure-agentcore:latest` |
| Defined in | `helm-charts/agentcore/` |
| Exposed to frontend | Yes — frontend proxies `/api/azure-chat` to this service |
| runtimeClassName | None set — uses default `runc` |
| Workload Identity | Not wired — ServiceAccount lacks `azure.workload.identity/client-id` annotation |
| Authentication | None on inbound requests — accepts all requests |
| Broker isolation | None — single shared pod serves all users/contexts |
| What it does | Routes chat messages; calls Azure OpenAI; holds conversation history for all callers |
| What it should be | Replaced by per-broker gateway in `broker-{posp_id}` namespace — each broker gets its own runtime, not shared compute |

**Why this is not the target:**  
The shared AgentCore collapses all broker tenants into one compute unit. There is no namespace boundary, no per-broker KB, no per-broker tool enforcement, no Kata VM isolation, and no workload identity scoping. Any bug or data exposure in one broker's session can affect all others.

---

## 2. Individual Agent Services

### 2.1 claims-manager

| Field | Value |
|-------|-------|
| Source | `agents/claims-manager/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health/info), `POST /process` |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` — `claims-manager-service` on port 80 |
| Namespace | Intended: `sageinfra-new-agents` (shared) |
| runtimeClassName | Not set in manifest |
| Auth on endpoints | None |
| Secrets in source | None observed |
| Actual behavior | `POST /process` accepts `{claim_id, action, data}`. Actions: create, update, settle. Returns structured response. Calls no external service — responses appear computed locally. |
| Target behavior | Skill inside broker runtime pod in `broker-{posp_id}` namespace, invoked only by that broker's gateway, with broker-scoped Azure identity |

### 2.2 marine-specialist

| Field | Value |
|-------|-------|
| Source | `agents/marine-specialist/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health/info), `POST /quote` |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` — `marine-specialist-service` on port 80 |
| Namespace | Intended: `sageinfra-new-agents` (shared) |
| runtimeClassName | Not set |
| Auth on endpoints | None |
| Secrets in source | None observed |
| Actual behavior | `POST /quote` accepts cargo/vessel details and returns calculated marine premium. Logic present; responses appear computed, not backed by external pricing service. |
| Target behavior | Skill inside broker runtime pod with marine specialty enabled per BrokerRuntime spec |

### 2.3 underwriter-agent

| Field | Value |
|-------|-------|
| Source | `agents/underwriter-agent/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /`, `GET /health`, `POST /chat` |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` — `underwriter-agent-service` on port 80 |
| Namespace | Intended: `sageinfra-new-agents` (shared) |
| runtimeClassName | Not set |
| Auth on endpoints | None |
| Secrets in source | None observed |
| Actual behavior | `POST /chat` accepts underwriting query; returns generic underwriting guidance; may call Azure OpenAI if configured |
| Target behavior | Underwriting skill in broker runtime pod |

### 2.4 cyber-insurance

| Field | Value |
|-------|-------|
| Source | `agents/cyber-insurance/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health only) |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` |
| Auth on endpoints | None |
| Actual behavior | Health check only; no business logic endpoint deployed |
| Target behavior | Cyber risk assessment skill in broker runtime pod |
| Gap note | Frontend routes `cyber` tab to `CyberInsurance.tsx` component but the underlying agent has no functional endpoint |

### 2.5 fnol-processor

| Field | Value |
|-------|-------|
| Source | `agents/fnol-processor/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health only) |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` |
| Auth on endpoints | None |
| Actual behavior | **Copy-paste of underwriter agent.** No FNOL-specific logic. Health check only. |
| Target behavior | FNOL intake skill in broker runtime pod, integrated with claims backend |
| Gap note | `FNOLProcessor.tsx` frontend component exists but the agent it relies on is a stub |

### 2.6 policy-assistant

| Field | Value |
|-------|-------|
| Source | `agents/policy-assistant/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health only) |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` |
| Auth on endpoints | None |
| Actual behavior | **Copy-paste of underwriter agent.** No policy-specific logic. |
| Target behavior | Policy guidance skill in broker runtime pod, backed by broker-specific KB |
| Gap note | `PolicyAssistant.tsx` component exists but agent is a stub |

### 2.7 research-assistant

| Field | Value |
|-------|-------|
| Source | `agents/research-assistant/app.py` |
| Framework | FastAPI |
| Endpoints | `GET /` (health only) |
| K8s manifest | `k8s-manifests/agents-deployment.yaml` |
| Auth on endpoints | None |
| Actual behavior | **Copy-paste of underwriter agent.** No research logic. |
| Target behavior | Market and risk research skill in broker runtime pod |
| Gap note | `ResearchAssistant.tsx` component exists but agent is a stub |

---

## 3. Backend Services (Not Deployed to AKS)

### 3.1 backend/app.py

| Field | Value |
|-------|-------|
| Framework | FastAPI |
| Endpoints | `GET /`, `GET /health`, `POST /chat`, `POST /specialist-chat` |
| Deployed | No — not in any AKS manifest for dev01 |
| Actual behavior | Intent-based specialist routing (regex); calls Azure OpenAI GPT-4o; stores last 5 messages of conversation history; CORS to localhost:3000 and Azure Static Apps domains; timeout 30s |
| Secrets | Reads from environment vars — no hardcoded values in source |
| Target behavior | May be replaced by broker runtime gateway; or refactored into shared platform API if broker-neutral functionality remains |

### 3.2 backend/main.py

| Field | Value |
|-------|-------|
| Framework | FastAPI |
| Endpoints | `GET /`, `POST /chat`, `GET /agents` |
| Deployed | No |
| Actual behavior | 61-line prototype with hardcoded mock responses; not functional |
| Target behavior | Superseded by `backend/app.py` and eventually by broker runtime gateway |

---

## 4. Rust Crates (Not Deployed)

These Rust crates implement consumer product features but are not deployed anywhere:

| Crate | Purpose | Status |
|-------|---------|--------|
| `crates/scamshield` | Fraud and phishing triage | Source exists; no container image; no K8s manifest |
| `crates/policy-pulse` | Policy coverage clarity | Source exists; no container image; no K8s manifest |
| `crates/claims-defender` | Claims denial review / complaint support | Source exists; no container image; no K8s manifest |
| `crates/domain` | Shared domain model (anyhow, serde, uuid, chrono) | Library crate; dependency for above |
| `crates/infra` | Infrastructure utilities | Library crate |
| `infra-rust/` | CLI tool for reconciling AzureDev Terraform and K8s assets | Scaffold only; not populated |

**Note:** The `scamshield`, `policy-pulse`, and `claims-defender` frontend tabs in Consumer Relief area route to `SageSureDashboard` with mock data. The Rust implementations of these features are not deployed and have no K8s entry point. These modules must remain hidden in the UI until the Rust services have container images, deployments, and broker-scoped endpoints.

---

## 5. Target State: Per-Broker Runtime Pod

In the target architecture, the above agents do not exist as individually deployed shared services. Instead:

```
broker-{posp_id} namespace
├── Deployment: broker-runtime
│   ├── runtimeClassName: kata-vm-isolation
│   ├── ServiceAccount: broker-runtime (annotated azure.workload.identity/client-id)
│   ├── Label: azure.workload.identity/use: "true"
│   ├── VolumeMount: /workspace → broker workspace PVC
│   ├── VolumeMount: /config/kb.yaml → KB manifest ConfigMap
│   ├── VolumeMount: /config/tools.yaml → tool manifest ConfigMap
│   ├── VolumeMount: /config/skills.yaml → skill manifest ConfigMap
│   ├── Process: broker gateway (HTTP handler, auth enforcement, request routing)
│   └── Process: skill runtime (loads only skills listed in skills.yaml)
├── Service: broker-gateway (ClusterIP)
├── ConfigMap: broker-kb-manifest
├── ConfigMap: broker-tool-manifest
├── ConfigMap: broker-skill-manifest
├── NetworkPolicy: default-deny-all
├── NetworkPolicy: allow-platform-egress
├── ResourceQuota: broker-quota
└── LimitRange: broker-limits
```

Skills that were individual agent services (`claims-manager`, `marine-specialist`, etc.) become in-process skill handlers loaded by the broker runtime according to `skills.yaml`. This eliminates per-agent deployments, enforces per-broker capability isolation, and enables Kata VM to provide the security boundary.

---

## 6. Migration Path for Current Agents

| Current Artifact | Migration Action |
|-----------------|-----------------|
| `agents/claims-manager/app.py` | Port logic to skill handler in broker runtime image; remove standalone deployment |
| `agents/marine-specialist/app.py` | Port `POST /quote` logic to marine skill handler; remove standalone deployment |
| `agents/underwriter-agent/app.py` | Port `POST /chat` to underwriting skill handler |
| `agents/cyber-insurance/app.py` | Build out cyber risk logic; port to skill handler |
| `agents/fnol-processor/app.py` | Replace copy-paste stub with real FNOL logic; port to skill handler |
| `agents/policy-assistant/app.py` | Build policy guidance logic backed by broker KB; port to skill handler |
| `agents/research-assistant/app.py` | Build research logic; port to skill handler |
| `k8s-manifests/agents-deployment.yaml` | Move to `legacy/` with DO_NOT_APPLY header; do not apply |
| `backend/app.py` | Keep as reference; may become shared platform API for broker-neutral ops; needs broker context param |
| `backend/main.py` | Archive; superseded |
| Rust crates | Build container images; add K8s manifests; expose via broker runtime skill interface |

---

## 7. Operator and Lifecycle Controller (Missing)

No operator or controller exists in this repo for the BrokerRuntime CRD. The target implementation is:

- **Language:** Rust using `kube-rs` crate (consistent with `crates/` workspace and `infra-rust/` direction)
- **Location:** New crate `crates/broker-operator/` or `operator/` at repo root
- **Watches:** `BrokerRuntime` CRDs cluster-wide
- **Reconciles:**
  1. Namespace `broker-{posp_id}` with labels
  2. ServiceAccount `broker-runtime` with Workload Identity annotation
  3. Entra federated credential via Azure SDK (Graph or ARM API call)
  4. NetworkPolicies (default-deny + approved egress)
  5. ResourceQuota + LimitRange
  6. ConfigMaps for KB/tools/skills
  7. Deployment with `runtimeClassName: kata-vm-isolation`
  8. Service `broker-gateway`
  9. Status conditions on BrokerRuntime CR
  10. Finalizer for cleanup on CR deletion

No Kubernetes operator code exists today. This is the primary Phase 1 deliverable.
