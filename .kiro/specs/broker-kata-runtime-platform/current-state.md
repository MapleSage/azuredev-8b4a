# Current State and Gap Assessment: Broker/POSP Kata Runtime Platform

**Assessed:** 2026-05-14  
**Cluster context:** `aks-sageinfra-new-dev01`  
**App namespace:** `sageinfra-new-agents`  
**Branch:** `codex-rust-cargo-port-azuredev`

---

## Assessment Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Exists and working as described |
| ⚠️ | Exists but incomplete, wrong config, or not wired end-to-end |
| ❌ | Does not exist; gap vs. target architecture |
| 🔴 | Security risk — requires action before merge/deploy |

---

## 1. AKS Cluster Infrastructure

| Item | Status | Evidence / Notes |
|------|--------|-----------------|
| AKS cluster exists | ✅ | `aks-sageinfra-new-dev01`; 3-node pool confirmed reachable |
| Kata RuntimeClass `kata-vm-isolation` | ✅ | RuntimeClass object present in cluster |
| `runc` RuntimeClass | ✅ | Default runtime; all current app pods use this |
| AKS OIDC issuer enabled | ✅ | AKS OIDC issuer URL confirmed enabled |
| Workload Identity webhook | ✅ | `azure-wi-webhook-controller-manager` running |
| App pods use Kata runtime | ❌ | All deployments show `runtimeClassName: <none>`; none use `kata-vm-isolation` |
| Broker-scoped namespaces (`broker-*`) | ❌ | No `broker-*` namespaces found; only `sageinfra-new-agents` |
| Broker Runtime Operator | ❌ | No operator/controller deployment observed |
| Azure Policy for AKS enabled | ❌ | AKS profile shows addon absent/null |
| Defender for Containers enabled | ❌ | AKS profile shows defender disabled/null |
| KEDA (event-driven autoscaling) | ❌ | Not observed in cluster |
| VPA (Vertical Pod Autoscaler) | ❌ | Not observed in cluster |

---

## 2. Workload Identity and Authentication

| Item | Status | Evidence / Notes |
|------|--------|-----------------|
| AKS OIDC/WI capability at cluster level | ✅ | Enabled per AKS query |
| Workload Identity wired for shared namespace SA | ❌ | `sageinfra-workload-identity` SA in `sageinfra-new-agents` lacks `azure.workload.identity/client-id` annotation |
| Per-broker Managed Identity (UAMI) | ❌ | No per-broker UAMIs created |
| Per-broker Federated Credential | ❌ | No federated credential bindings for `broker-*` subjects |
| Workload Identity tested from pod | ❌ | No evidence token-based access to Azure works from any app pod |

---

## 3. Secrets and Credentials — CRITICAL FINDINGS

The following files contain embedded credentials and **must not be applied** and **must be rotated if the credentials have been or could have been applied**.

| File | Finding | Risk |
|------|---------|------|
| `k8s/backend-deployment.yaml` lines 24–39 | **Azure Client Secret present in plaintext** in Kubernetes manifest (env value). Azure Tenant ID, Client ID, and Client Secret are all inline. Azure OpenAI endpoint points to a personal Azure account. Azure OpenAI API key present in plaintext. | 🔴 CRITICAL — if applied to cluster, secret is readable from Kubernetes API by anyone with pod-read access; if committed, it appears in git history |
| `k8s-manifests/secrets.yaml` lines 9–21 | Azure OpenAI endpoint, API key, Azure Search endpoint, and API key encoded as base64 Kubernetes Secrets. Base64 is not encryption — values are trivially reversible. | 🔴 HIGH — treat as plaintext |
| `k8s/sageinfra-frontend-dev01.yaml` line 44 | `NEXT_PUBLIC_DISABLE_AUTH=true` present as an env var in the frontend Kubernetes deployment manifest. Authentication is completely disabled in this manifest. | 🔴 HIGH — if applied, anyone can access the frontend with no login |
| `k8s/secrets/keyvault-csi-driver.yaml` lines 7, 22–23 | Workload Identity Client ID and Tenant ID hardcoded. Key Vault name hardcoded. Secret object references (`azure-client-secret`, `azure-openai-key`, `azure-openai-endpoint`) defined inline. | ⚠️ MEDIUM — IDs are public-safe, but the presence of `azure-client-secret` reference suggests a static secret is expected |

**Required action:** Rotate any Azure credentials that appear in `k8s/backend-deployment.yaml` if those values have ever been applied to a cluster, pushed to a remote, or shared outside this repo. Do not apply any of these manifests. Move files to `legacy/` with a `DO_NOT_APPLY` header.

**Update:** Secret-bearing/static legacy manifests have been quarantined under `legacy/DO_NOT_APPLY/` with warning headers and a README. This reduces accidental apply risk, but it does **not** complete credential rotation.

**Credential exposure assessment update:** Git evidence shows commit `c965333` introduced the sensitive legacy paths and is reachable from `origin/main`, `origin/codex-rust-cargo-port-azuredev`, and `origin/azure-msal-frontend`. `origin/main` still contains `k8s/backend-deployment.yaml` and `k8s-manifests/secrets.yaml` until the quarantine commit is merged/pushed. Read-only AKS inspection of context `aks-sageinfra-new-dev01` also shows `sageinfra-openai-secret` and `sageinfra-search-secret` present in namespace `sageinfra-new-agents`, with workloads referencing those Kubernetes Secrets. Therefore affected Azure OpenAI/Search credentials must be treated as exposed and rotated. The live `sageinfra-frontend` deployment still has `NEXT_PUBLIC_DISABLE_AUTH=true`; repo code has been fixed, but the cluster has not been redeployed from the fixed manifest.

---

## 4. Frontend

| Item | Status | Evidence / Notes |
|------|--------|-----------------|
| Frontend deploys and renders | ✅ | Vite build deployed to dev01 AKS via recent commits; visually functional |
| Real MSAL/Entra browser login | ❌ | `msal-auth-context.dev.tsx` provides hardcoded dev user; `ChatApp.tsx` falls back to `"demo-token"` string when no session found |
| Auth bypass disabled | ❌ | `NEXT_PUBLIC_DISABLE_AUTH=true` in deployed K8s manifest; dev auth shim imports a hardcoded user with `accessToken: "dev01-auth-disabled"` |
| Broker/POSP identity resolution | ❌ | No code path resolves authenticated user to a POSP ID or broker namespace |
| Broker runtime router | ❌ | All requests go to shared `/api/azure-chat` on shared AgentCore |
| All visible modules have backend contracts | ❌ | 13 of 26 visible modules render `SageSureDashboard` with hardcoded mock data (no backend calls); see `ui-module-inventory.md` |
| Mock badges hide lack of real data | 🔴 | "My Tasks (12)", "Claims Queue (31)", "Submission Queue (18)" — these are hardcoded badge numbers, not live counts |
| HTTPS hostname for Entra redirect URI | ❌ | Raw HTTP IP used for dev01; valid Entra redirect URI requires HTTPS with a registered domain |
| Sidebar status "dev01 online / AgentCore connected locally via secure port-forward" | 🔴 | This text is hardcoded in `TabsInterface.tsx` line 639–641 regardless of actual connectivity state; misleading to users |

---

## 5. Agents and Backend Services

| Service | Where it Lives | Endpoint | Actual Behavior | Target Behavior |
|---------|---------------|----------|-----------------|-----------------|
| AgentCore (sageinfra-agentcore) | `sageinfra-new-agents` namespace | `/api/azure-chat` | Shared; proxied from frontend; no broker routing | Should not exist as shared; replaced by per-broker gateway in `broker-{posp_id}` |
| claims-manager | `agents/claims-manager/app.py` | `GET /`, `POST /process` | Minimal FastAPI stub; processes claims actions with hardcoded responses | Per-broker skill in broker runtime pod |
| marine-specialist | `agents/marine-specialist/app.py` | `GET /`, `POST /quote` | Returns calculated premium (functional stub) | Per-broker skill |
| cyber-insurance | `agents/cyber-insurance/app.py` | `GET /` only | No business logic beyond health check | Per-broker skill |
| fnol-processor | `agents/fnol-processor/app.py` | `GET /` only | Copy-paste of underwriter agent; no FNOL logic | Per-broker skill |
| policy-assistant | `agents/policy-assistant/app.py` | `GET /` only | Copy-paste of underwriter agent; no policy logic | Per-broker skill |
| research-assistant | `agents/research-assistant/app.py` | `GET /` only | Copy-paste of underwriter agent; no research logic | Per-broker skill |
| underwriter-agent | `agents/underwriter-agent/app.py` | `GET /`, `GET /health`, `POST /chat` | Returns generic underwriting response via Azure OpenAI | Per-broker skill |
| backend/app.py | Not deployed to AKS | `/chat`, `/specialist-chat` | FastAPI with intent-based routing; calls Azure OpenAI; conversation history; timeout 30s | Shared platform API or replaced |
| backend/main.py | Not deployed to AKS | `/chat`, `/agents` | Prototype/mock; 61-line scaffold | Superseded |

**Authentication on agent endpoints:** None. All agent endpoints are unauthenticated — no JWT validation, no API key check, no broker context enforcement.

---

## 6. Helm Charts and Kubernetes Manifests

| Location | Status | Notes |
|----------|--------|-------|
| `helm-charts/agentcore/` | ⚠️ | Functional chart but targets `sageinsureacreedfa81f.azurecr.io` (legacy ACR); AGENTCORE_DEPLOYMENT_STATUS.md reports ImagePullBackOff due to ACR permission failure |
| `helm-charts/sageinsure-api/` | ⚠️ | Well-structured; has Workload Identity client-id `e963ea14-...` hardcoded in values.yaml (acceptable if UAMI still valid); targets `api-staging.maplesage.com` (not dev01 target) |
| `helm-charts/sageinsure-frontend/` | ⚠️ | Targets `staging.maplesage.com`; not dev01 cluster; security headers in place |
| `helm-charts/sageinsure-worker/` | ⚠️ | Worker and CronJobs defined; not verified deployed |
| `kubernetes/` directory | ⚠️ | Comprehensive but references `sageinsure.local` and `api.sageinsure.local` ingress hosts not applicable to dev01; manifests not verified applied |
| `k8s/` directory | 🔴 | Contains `backend-deployment.yaml` with plaintext secrets (see §3); `sageinfra-frontend-dev01.yaml` with auth disabled; **DO NOT APPLY** |
| `k8s-manifests/` directory | 🔴 | Contains `secrets.yaml` with base64 credentials; **DO NOT APPLY** |
| `deployment-strategies/` | ⚠️ | Blue-green/canary/rolling patterns present; not verified applied to any service |

---

## 7. Observability and Operations

| Item | Status | Evidence / Notes |
|------|--------|-----------------|
| Prometheus / Grafana stack | ⚠️ | Manifests exist in `kubernetes/monitoring/`; not verified deployed to dev01 |
| Structured logs with broker/POSP ID | ❌ | No broker namespaces; no per-broker log fields |
| BrokerRuntime status view | ❌ | No operator; no CRD; no status API |
| Separation of shared vs. broker services in dashboards | ❌ | One shared namespace; nothing separated |
| Alerts for runtime not ready / idle / identity failure | ❌ | Not implemented |

---

## 8. Risk Summary

| Risk | Severity | Status |
|------|----------|--------|
| Plaintext Azure Client Secret in `k8s/backend-deployment.yaml` | 🔴 CRITICAL | Needs immediate rotation if ever applied |
| Base64 credentials in `k8s-manifests/secrets.yaml` | 🔴 HIGH | Treat as plaintext; quarantine and rotate |
| Auth disabled via `NEXT_PUBLIC_DISABLE_AUTH=true` in deployed K8s manifest | 🔴 HIGH | Remove before any external exposure |
| `"demo-token"` hardcoded fallback in ChatApp.tsx | 🔴 HIGH | Remove; reject unauthenticated requests explicitly |
| Hardcoded "dev01 online" status in sidebar | ⚠️ MEDIUM | Misleading UI; remove or wire to real health check |
| Mock badge counts shown as real queue sizes | ⚠️ MEDIUM | User-visible lie; hide or mark clearly |
| No auth on agent HTTP endpoints | ⚠️ MEDIUM | Agent services accessible to anyone with cluster network access |
| All agents in shared namespace, not broker-isolated | ⚠️ MEDIUM | Core architectural gap; target requires per-broker isolation |
| No broker namespaces, operator, or CRD | ⚠️ HIGH | Primary deliverable; no progress |
| Azure Policy + Defender not enabled | ⚠️ HIGH | Enterprise security baseline not met |
| Kata isolation not used by any workload | ⚠️ HIGH | Core isolation requirement unmet |

---

## 9. What Exists vs. What Is Required

```
WHAT EXISTS (dev01 today)                   WHAT IS REQUIRED (target architecture)
─────────────────────────────────────────   ──────────────────────────────────────
Shared namespace: sageinfra-new-agents      Per-broker namespace: broker-{posp_id}
runc runtime (default, no isolation)        Kata VM isolation (runtimeClassName: kata-vm-isolation)
Synthetic/demo auth bypass                  Real MSAL/Entra login + POSP resolution
Shared AgentCore /api/azure-chat            Per-broker gateway in broker-{posp_id} namespace
No operator                                 Broker Runtime Operator (kube-rs)
No BrokerRuntime CRD                        BrokerRuntime CRD + reconcile loop
Plaintext secrets in legacy manifests       No static secrets; Workload Identity + Key Vault
Agent stubs with no auth                    Authenticated skills in broker runtime pod
Mock dashboard data                         Real backend contracts or hidden modules
No Azure Policy / Defender                  Azure Policy + Defender for Containers enabled
No network policies enforced                Default-deny + approved egress per broker namespace
Hardcoded "online" status widget            Real broker runtime status from operator
```

---

## 10. Verified Commands to Re-Confirm State

Run these against the live cluster to re-baseline at any time:

```bash
# Check broker namespaces (expect none currently)
kubectl get namespaces -l sage.suresure.ai/posp-id

# Check RuntimeClasses
kubectl get runtimeclasses

# Check runtimeClassName on all pods in app namespace
kubectl get pods -n sageinfra-new-agents -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.runtimeClassName}{"\n"}{end}'

# Check Workload Identity annotation on service accounts
kubectl get sa -n sageinfra-new-agents -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.annotations.azure\.workload\.identity/client-id}{"\n"}{end}'

# Check for BrokerRuntime CRD
kubectl get crd brokerruntimes.platform.sagesure.ai 2>/dev/null || echo "CRD missing"

# Check AKS addons (Azure Policy, Defender)
az aks show -n aks-sageinfra-new-dev01 -g <resource-group> --query "addonProfiles" -o json
az aks show -n aks-sageinfra-new-dev01 -g <resource-group> --query "securityProfile" -o json
```
