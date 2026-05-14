# Design Document: Broker/POSP Kata Runtime Platform

## Overview

SageSure dev01 must evolve from a shared demo deployment into a broker/POSP-isolated runtime platform. The unit of tenancy is a BrokerRuntime custom resource. A POSP signup event creates or updates a BrokerRuntime. A Kubernetes operator reconciles the desired state into a `broker-{posp_id}` namespace containing a Kata VM-isolated runtime pod, broker gateway, workspace/KB configuration, tool/skill manifests, network policies, resource quotas, service account, and Entra Workload Identity binding.

The shared namespace `sageinfra-new-agents` is only for bootstrap/platform control-plane components during dev01: lifecycle API, operator, shared image registry references, optional central observability collectors, and temporary compatibility services. Broker-specific execution must move out of shared agents into `broker-*` namespaces.

## Current Live State Snapshot: 2026-05-14

Observed in dev01 AKS context `aks-sageinfra-new-dev01`. See `current-state.md` for full evidence, verification commands, and risk table.

**Infrastructure:**
- Namespace present: `sageinfra-new-agents` only for app workloads; no `broker-*` namespaces.
- RuntimeClasses present: `kata-vm-isolation` and `runc`.
- Current deployments do not set `runtimeClassName`; none use Kata isolation.
- AKS OIDC issuer and Workload Identity are enabled at cluster level.
- `azure-wi-webhook-controller-manager` is running.
- `sageinfra-workload-identity` ServiceAccount exists but lacks `azure.workload.identity/client-id` annotation.
- No lifecycle operator/controller deployment observed.
- Azure Policy for AKS, Defender for Containers, KEDA, and VPA: all absent.

**Critical security issues (must resolve before any cluster apply):**
- `k8s/backend-deployment.yaml` contains a plaintext Azure Client Secret, plaintext Azure OpenAI API key, and hardcoded tenant/client IDs. DO NOT APPLY. Assess for rotation.
- `k8s-manifests/secrets.yaml` contains base64-encoded (trivially reversible) Azure API credentials. DO NOT APPLY.
- `k8s/sageinfra-frontend-dev01.yaml` sets `NEXT_PUBLIC_DISABLE_AUTH=true`. If applied, the frontend serves all users without any authentication.
- These files must be moved to `legacy/DO_NOT_APPLY/` with explanatory headers.

**Frontend state:**
- Vite build deployed to dev01 AKS (working visually).
- Auth bypass via `NEXT_PUBLIC_DISABLE_AUTH=true` in deployed manifest; `ChatApp.tsx` falls back to `"demo-token"` when no session; `msal-auth-context.dev.tsx` provides hardcoded synthetic user.
- 26 visible UI modules; 0 have real broker context routing; 13 render `SageSureDashboard` with hardcoded mock data.
- Hardcoded status widget shows "dev01 online / AgentCore connected locally via secure port-forward" regardless of actual state.
- Hardcoded badge counts: "My Tasks (12)", "Claims Queue (31)", "Submission Queue (18)".

**Agent state:**
- 7 agent services exist in `agents/`; most are stubs or copy-pastes with no real business logic.
- None have authentication on their HTTP endpoints.
- All are deployed to shared `sageinfra-new-agents` namespace with no broker isolation.
- 3 Rust crates (scamshield, policy-pulse, claims-defender) have no container images or deployments.

## Target Architecture

```mermaid
graph TB
    Signup[POSP Signup / Broker Admin Event] --> LifecycleAPI[Lifecycle API]
    LifecycleAPI --> CR[BrokerRuntime CR]
    CR --> Operator[Broker Runtime Operator]

    Operator --> NS[broker-{posp_id} Namespace]
    Operator --> SA[Broker ServiceAccount]
    Operator --> FIC[Entra Federated Credential]
    Operator --> NP[NetworkPolicies]
    Operator --> RQ[ResourceQuota / LimitRange]
    Operator --> CM[Runtime ConfigMaps]
    Operator --> Pod[Kata Broker Runtime Pod]
    Operator --> SVC[Broker Gateway Service]

    User[Authenticated Broker User] --> Frontend[SageSure Frontend]
    Frontend --> Router[Broker Runtime Router]
    Router --> SVC

    Pod --> Workspace[Broker Workspace PVC/Blob]
    Pod --> KB[Broker KB / Search Index]
    Pod --> Tools[Approved Tools]
    Pod --> Skills[Approved Skills]
    Pod --> SageAPIs[SageSure APIs]
    Pod --> WhatsApp[WhatsApp Provider]
    Pod --> Azure[Azure Services via Workload Identity]

    Monitor[Observability] --> NS
    Policy[Azure Policy / Admission] --> NS
    Defender[Defender for Containers] --> NS
```

## Core Components

### 1. BrokerRuntime Custom Resource

The BrokerRuntime CR is the source of truth for a broker/POSP runtime.

```yaml
apiVersion: platform.sagesure.ai/v1alpha1
kind: BrokerRuntime
metadata:
  name: broker-123
spec:
  pospId: "123"
  tenantId: "tenant-a"
  brokerName: "Example Broker"
  lifecycleState: Active
  runtime:
    image: sageinfranewdev01.azurecr.io/broker-runtime:dev01
    runtimeClassName: kata-vm-isolation
    minReplicas: 0
    maxReplicas: 3
    idleAfterMinutes: 30
  identity:
    managedIdentityName: mi-broker-123
    serviceAccountName: broker-runtime
  workspace:
    storageRef: broker-123-workspace
    mountPath: /workspace
  knowledgeBase:
    version: "2026-05-14"
    refs:
      - type: azure-search-index
        name: broker-123-kb
  tools:
    - whatsapp
    - sagesure-claims-api
    - sagesure-underwriting-api
  skills:
    - fnol
    - claims-status
    - underwriting
    - policy-assistant
  policy:
    dataClassification: confidential
    networkProfile: default-deny-with-platform-egress
status:
  phase: Ready
  namespace: broker-123
  runtimePod: broker-runtime-abc123
  lastActivityTime: "2026-05-14T13:30:00Z"
  conditions: []
```

### 2. Broker Runtime Operator

The operator reconciles BrokerRuntime CRs into Kubernetes and Azure identity resources.

Responsibilities:

- Validate POSP ID and tenant metadata.
- Create/update `broker-{posp_id}` namespace with required labels.
- Create service account `broker-runtime` with Workload Identity annotations.
- Create/update Entra federated credential for `system:serviceaccount:broker-{posp_id}:broker-runtime` via Azure ARM/Graph API.
- Apply default-deny NetworkPolicies and approved-egress policies.
- Apply ResourceQuota, LimitRange, PodDisruptionBudget, and HPA/KEDA ScaledObject where applicable.
- Deploy broker gateway and runtime pod with `runtimeClassName: kata-vm-isolation`.
- Create ConfigMaps for KB manifest, tool manifest, and skill manifest.
- Hydrate workspace reference from BrokerRuntime spec.
- Maintain CR status conditions and Kubernetes events.
- Honor finalizer: on CR deletion, remove namespace, federated credential, and RBAC assignments.
- Suspend/delete runtime based on lifecycle state and idle policy.

**Implementation: Rust `kube-rs`**

Chosen for consistency with the existing `crates/` workspace (domain, infra, scamshield, policy-pulse, claims-defender Rust crates) and the `infra-rust/` CLI scaffold. Go/kubebuilder is a valid alternative if schedule forces it.

New crate location: `crates/broker-operator/`

Key dependencies:
```toml
kube = { version = "0.90", features = ["runtime", "derive", "client"] }
kube-derive = "0.90"
k8s-openapi = { version = "0.21", features = ["v1_29"] }
schemars = "0.8"
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
azure_identity = "0.20"
azure_mgmt_msi = "0.20"
tracing = "0.1"
anyhow = "1"
```

Reconcile loop structure:
```rust
async fn reconcile(broker: Arc<BrokerRuntime>, ctx: Arc<Context>) -> Result<Action, Error> {
    // 1. Ensure namespace broker-{posp_id}
    // 2. Ensure ServiceAccount broker-runtime with WI annotation
    // 3. Ensure Entra federated credential (Azure SDK call)
    // 4. Ensure NetworkPolicies (default-deny + egress allowlist)
    // 5. Ensure ResourceQuota + LimitRange
    // 6. Ensure ConfigMaps (kb, tools, skills)
    // 7. Ensure Deployment with runtimeClassName: kata-vm-isolation
    // 8. Ensure Service broker-gateway
    // 9. Update CR status conditions
    Ok(Action::requeue(Duration::from_secs(300)))
}
```

### 3. Lifecycle API / Signup Webhook

A small API receives POSP signup/update/offboarding events and writes BrokerRuntime CRs. It does not directly create pods. The operator owns reconciliation.

Endpoints:

- `POST /posp/signup` creates BrokerRuntime.
- `PATCH /posp/{posp_id}` updates runtime config.
- `POST /posp/{posp_id}/suspend` sets lifecycle state Suspended.
- `POST /posp/{posp_id}/resume` sets lifecycle state Active.
- `DELETE /posp/{posp_id}` marks Offboarding and triggers cleanup policy.

### 4. Broker Runtime Pod

Each broker runtime pod contains:

- Gateway/API process for broker-specific chat/tool routing.
- Workspace mounted at `/workspace`.
- Tool manifest mounted at `/config/tools.yaml`.
- Skill manifest mounted at `/config/skills.yaml`.
- KB manifest mounted at `/config/kb.yaml`.
- OpenClaw/Sage runtime process with approved tools and skills only.

Hard requirements:

- `runtimeClassName: kata-vm-isolation`.
- Non-root user.
- Read-only root filesystem where feasible.
- Explicit CPU/memory requests and limits.
- No static secrets in env.
- ServiceAccount token for Workload Identity.
- Health/readiness endpoints.

### 5. Identity Model

Cluster already has AKS OIDC and Workload Identity capability. Missing work is per-broker identity wiring.

For each broker:

- User-assigned managed identity: `mi-broker-{posp_id}` or shared identity with strict scoped permissions if per-broker UAMI exceeds limits.
- Federated credential subject: `system:serviceaccount:broker-{posp_id}:broker-runtime`.
- Kubernetes ServiceAccount annotation: `azure.workload.identity/client-id: <client-id>`.
- Pod label: `azure.workload.identity/use: "true"`.
- Azure RBAC scoped to that broker's storage/search resources only.

### 6. Frontend/Auth Model

The frontend must not decide tenancy by dummy state. It must authenticate the user, resolve broker/POSP identity, and route to the matching BrokerRuntime.

Required flow:

1. User opens app.
2. If unauthenticated, show real login page.
3. Login returns identity claims.
4. Backend resolves allowed POSP/broker IDs.
5. Frontend selects broker context.
6. API calls include broker context and go to Broker Runtime Router.
7. Router enforces authorization and forwards only to the correct `broker-{posp_id}` gateway.

Dev01 constraints:

- MSAL/Entra browser login requires HTTPS and valid redirect URI. Public raw IP HTTP is not a valid final auth surface.
- Until HTTPS hostname/redirect URI exists, dev01 must show an explicit auth/config blocker or use a controlled mock-login flag clearly labeled as non-production. It must not silently create a synthetic user.

### 7. Page/Module Contract Model

Each visible UI module needs a backend contract.

Required module inventory fields:

- Route/tab name.
- Product owner/use case.
- Broker runtime endpoint or shared platform endpoint.
- Required tools/skills.
- Required KB/data source.
- Auth role/claim required.
- Acceptance smoke test.
- Current status: Live / Stub / Hidden / Blocked.

Anything marked Stub must either be hidden from the default UI or visibly marked unavailable.

### 8. Security and Policy

Required controls:

- Azure Policy for AKS enabled.
- Defender for Containers enabled.
- Admission policy requiring `runtimeClassName: kata-vm-isolation` for broker runtime pods.
- Admission policy blocking static secret env values and privileged pods.
- Default-deny NetworkPolicies in every broker namespace.
- Image provenance/scanning before deployment.
- Remove or quarantine legacy manifests containing embedded secrets/placeholders.

### 9. Observability

Status views and logs must answer:

- Which broker namespaces exist?
- Which runtime pod is serving each broker?
- Is it Kata or runc?
- Which image/digest is running?
- Which identity is attached?
- Which KB/tools/skills are loaded?
- Last request and last activity time.
- Error rate, latency, tool calls, and agent routing decisions.

## Non-Goals for This Spec

- A generic shared chat-only demo.
- A frontend-only rewrite.
- Running all brokers through the same shared AgentCore pod.
- Static secrets in Kubernetes manifests.
- Treating HTTP raw IP dev01 as final Entra auth hosting.

## Migration Strategy

### Phase 0: Stop Drift

- Document this spec.
- Mark current frontend auth bypass and shared chat path as temporary.
- Remove/disable dummy pages or label as stubs.
- Quarantine legacy manifests with embedded secrets.

### Phase 1: Minimal BrokerRuntime Vertical Slice

- Create CRD and operator skeleton.
- Create one sample `broker-123` namespace.
- Reconcile one Kata runtime pod with health endpoint.
- Wire Workload Identity service account and verify token-based access.
- Add status command/view.

### Phase 2: Broker Gateway + Workspace + KB + Tools

- Add runtime gateway.
- Mount workspace and manifests.
- Preload one KB.
- Enable limited tools: SageSure API mock/adapter and WhatsApp provider stub or dev adapter.
- Route frontend/API to broker runtime.

### Phase 3: Signup Lifecycle + UI/Auth

- Add lifecycle API for POSP signup events.
- Restore login page and proper auth route.
- Add HTTPS hostname + Entra redirect URI for dev01.
- Resolve user to POSP and route to namespace.

### Phase 4: Scale/Security/Operations

- Enable Azure Policy and Defender.
- Add idle cleanup and autoscaling.
- Add NetworkPolicy validation tests.
- Add observability dashboards and broker status page.

## Companion Documents

- `current-state.md` — Full gap assessment with evidence and risk table (authoritative live state).
- `ui-module-inventory.md` — Per-module status, backend contract, and broker context requirement for all 26 UI modules.
- `agent-runtime-inventory.md` — Current agent services, their endpoints, actual vs. claimed behavior, and migration path to broker runtime skills.

## Open Questions

1. What is the authoritative POSP signup source and payload schema? (Needed to finalize Lifecycle API in Phase 5.)
2. One UAMI per broker or shared UAMI with per-resource RBAC conditions? For dev01 with small broker count: one UAMI per broker. Revisit at scale (Azure limit: 20 federated credentials per UAMI).
3. Broker workspace state: Azure Blob mount via BlobFuse2 CSI driver using Workload Identity (no static storage key). PVC for low-latency local state. Recommendation: BlobFuse2 for primary workspace, emptyDir for runtime scratch.
4. Which UI modules are MVP: Claims Chat and FNOL Intake are the minimal viable visible set. All others should be hidden until backend contracts are real (see `ui-module-inventory.md` for full list).
5. Dev01 HTTPS hostname: requires DNS name + TLS cert before Entra MSAL browser redirect works. Options: Azure DNS zone + Let's Encrypt, or Azure Front Door dev endpoint. This must be resolved before Phase 6 (auth restore) can be completed.
