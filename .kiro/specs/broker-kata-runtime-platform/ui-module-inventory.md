# UI Module Inventory: Broker/POSP Kata Runtime Platform

**Assessed:** 2026-05-14  
**Source files:** `frontend/components/TabsInterface.tsx`, `frontend/components/ChatApp.tsx`,  
`frontend/components/SageSureDashboard.tsx`, `frontend/components/BusinessAgentChat.tsx`

---

## Legend

| Status | Meaning |
|--------|---------|
| **Live** | Has a real backend contract and verified data flow |
| **Partial** | Component exists; makes backend calls; but calls shared non-broker endpoint or contract is incomplete |
| **Stub/Dummy** | Renders `SageSureDashboard` with hardcoded mock data; no backend call for actual module data |
| **Hidden-needed** | Should be hidden from UI until backend contract is real; currently visible |

---

## Module Inventory

### Home Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `home` | Overview | `SageSureDashboard(activeView="home")` | **Stub/Dummy** | None | No | No | Missing | Metrics are hardcoded constants. Badge counts (tasks=12) are hardcoded strings in `TabsInterface.tsx:62`. |
| `tasks` | My Tasks | `SageSureDashboard(activeView="tasks")` | **Stub/Dummy** | None | No | No | Missing | No task API. Badge "12" is hardcoded in `TabsInterface.tsx:62`. Hidden-needed until task API exists. |
| `ai` | SageSure AI | `SageSureDashboard(activeView="ai")` | **Stub/Dummy** | None | No | No | Missing | Routes to dashboard placeholder. If this is meant to be a global AI assistant, it needs a broker-context-aware endpoint. |

### Claims Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `claims` | Claims Chat | `ChatApp(initialSpecialist="claims")` | **Partial** | `POST /api/azure-chat` (shared AgentCore proxy) | No — uses shared endpoint | No — `"demo-token"` fallback in `ChatApp.tsx:284` | Missing | Chat works visually. Backend is shared AgentCore, not broker-scoped. No auth enforcement. Falls back to demo-token. |
| `fnol` | FNOL Intake | `FNOLProcessor` | **Partial** | Unknown — component makes unknown backend call | No | No | Missing | Component exists (`FNOLProcessor.tsx`). Endpoint and contract not confirmed in audit. Stub or partially wired. |
| `lifecycle` | Claims Lifecycle | `ClaimsLifecycle` | **Partial** | Unknown — component makes unknown backend call | No | No | Missing | Component exists (`ClaimsLifecycle.tsx`). Backend contract not confirmed. |
| `claims-queue` | Claims Queue | `SageSureDashboard(activeView="claims-queue")` | **Stub/Dummy** | None | No | No | Missing | Badge "31" is hardcoded in `TabsInterface.tsx:106`. No queue API. **Hidden-needed.** |

### Underwriting Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `underwriting` | Risk Review | `UnderwritingWorkbench` | **Partial** | Unknown — component makes unknown backend call | No | No | Missing | Component exists. Backend contract (agent endpoint, data source) not confirmed in audit. |
| `uw-queue` | Submission Queue | `SageSureDashboard(activeView="uw-queue")` | **Stub/Dummy** | None | No | No | Missing | Badge "18" is hardcoded in `TabsInterface.tsx:129`. No queue API. **Hidden-needed.** |
| `policy` | Policy Assistant | `PolicyAssistant` | **Partial** | Unknown — component makes unknown backend call | No | No | Missing | Component exists (`PolicyAssistant.tsx`). Backend contract not confirmed; underlying `policy-assistant` agent is a stub copy of underwriter agent. |
| `research` | Research | `ResearchAssistant` | **Partial** | Unknown — component makes unknown backend call | No | No | Missing | Component exists (`ResearchAssistant.tsx`). Backend contract not confirmed; underlying `research-assistant` agent is a stub copy of underwriter agent. |

### Consumer Relief Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `scamshield` | ScamShield | `SageSureDashboard(activeView="scamshield")` | **Stub/Dummy** | None | No | No | Missing | Maps to `crates/scamshield/` Rust crate (not deployed). Dashboard shows demo UI. **Hidden-needed.** |
| `policy-pulse` | Policy Pulse | `SageSureDashboard(activeView="policy-pulse")` | **Stub/Dummy** | None | No | No | Missing | Maps to `crates/policy-pulse/` Rust crate (not deployed). Dashboard shows demo UI. **Hidden-needed.** |
| `claims-defender` | Claims Defender | `SageSureDashboard(activeView="claims-defender")` | **Stub/Dummy** | None | No | No | Missing | Maps to `crates/claims-defender/` Rust crate (not deployed). Dashboard shows demo UI. **Hidden-needed.** |
| `document-vault` | Document Vault | `SageSureDashboard(activeView="document-vault")` | **Stub/Dummy** | None | No | No | Missing | No document storage API. Component exists (`DocumentUpload.tsx`) but not wired here. **Hidden-needed.** |
| `renewals` | Renewals | `SageSureDashboard(activeView="renewals")` | **Stub/Dummy** | None | No | No | Missing | No renewals API or agent. **Hidden-needed.** |
| `buying-assistance` | Buying Assist | `SageSureDashboard(activeView="buying-assistance")` | **Stub/Dummy** | None | No | No | Missing | No guided purchase API or agent. **Hidden-needed.** |

### Specialty Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `marine` | Marine Insurance | `ChatApp(initialSpecialist="marine")` | **Partial** | `POST /api/azure-chat` (shared) | No | No — `"demo-token"` fallback | Missing | Chat works. Underlying `marine-specialist` agent has `GET /`, `POST /quote`; but routing through shared proxy, not broker-scoped. |
| `cyber` | Cyber Insurance | `CyberInsurance` | **Partial** | Unknown | No | No | Missing | Component exists (`CyberInsurance.tsx`). Underlying agent (`agents/cyber-insurance/app.py`) has only a health endpoint. |

### CRM Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `crm` | Customers | `BusinessAgentChat(agentType="crm")` | **Stub** | `POST /api/azure-chat` (shared, generic) | No | No | Missing | Sends generic chat to shared AgentCore; no CRM backend, no customer data API. |
| `producer` | Producers | `SageSureDashboard(activeView="producer")` | **Stub/Dummy** | None | No | No | Missing | No producer/agency API. **Hidden-needed.** |
| `marketing` | Campaigns | `BusinessAgentChat(agentType="marketing")` | **Stub** | `POST /api/azure-chat` (shared, generic) | No | No | Missing | Generic chat; no campaigns API or analytics. |

### Admin Area

| Module ID | Label | Renders | Status | Backend Contract | Broker Context | Auth Required | Acceptance Test | Notes |
|-----------|-------|---------|--------|-----------------|----------------|---------------|-----------------|-------|
| `dashboard` | Admin Dashboard | `EnterpriseDashboard` | **Partial/Stub** | Unknown | No | No | Missing | Component exists (`EnterpriseDashboard.tsx`). Whether it calls real backend metrics is unconfirmed; likely mock. |
| `governance` | Governance | `SageSureDashboard(activeView="governance")` | **Stub/Dummy** | None | No | No | Missing | No governance API; no tenant isolation audit trail. **Hidden-needed.** |
| `hr` | Users & Teams | `BusinessAgentChat(agentType="hr")` | **Stub** | `POST /api/azure-chat` (shared, generic) | No | No | Missing | Generic chat; no identity/role management API. |
| `investment` | Analytics | `BusinessAgentChat(agentType="investment")` | **Stub** | `POST /api/azure-chat` (shared, generic) | No | No | Missing | Generic chat; no analytics API or portfolio data. |

---

## Summary Counts

| Status | Count |
|--------|-------|
| Live | 0 |
| Partial (real component, weak contract) | 10 |
| Stub/Dummy (renders SageSureDashboard with mock data) | 13 |
| Hidden-needed (must be hidden until contract is real) | 10 |
| No module has real broker context routing | 26/26 |
| No module requires real authentication | 26/26 |

---

## Cross-Cutting Issues

### 1. Authentication
- `ChatApp.tsx:284` falls back to `"demo-token"` when no session exists; all requests proceed unauthenticated.
- `TabsInterface.tsx:320–338` reads role from `sessionStorage.getItem("userRole")` with default `"customer"` — any user can set their own role by writing to sessionStorage.
- The displayed user name `"Nick D"` is the hardcoded fallback in `TabsInterface.tsx:362`.

### 2. Hardcoded Status Widget (DO NOT DEPLOY AS-IS)
`TabsInterface.tsx:637–641` renders a permanently-green "dev01 online / AgentCore connected locally via secure port-forward" widget in the sidebar regardless of actual runtime state. This is misleading in any deployment.

### 3. Hardcoded Badge Counts
"My Tasks (12)", "Claims Queue (31)", "Submission Queue (18)" are static strings in the `productAreas` array in `TabsInterface.tsx:62,106,129`. They do not reflect real data.

### 4. Role Model Has No Backend Enforcement
Roles (`producer`, `underwriter`, `claims`, `manager`, `admin`, `customer`) control UI visibility via `canAccess()` in `TabsInterface.tsx:340–342`, but this is client-side only. No backend endpoint enforces role claims.

---

## Required Actions Before Next External Demo or Production Deploy

1. Hide all **Hidden-needed** modules (13 of them) — add a `hidden: true` flag to `productAreas` items and suppress rendering.
2. Replace hardcoded badge numbers with `null` or hide badges until real API data exists.
3. Remove hardcoded `"Nick D"` fallback name and `"demo-token"` fallback auth token.
4. Remove hardcoded "dev01 online / AgentCore connected locally via secure port-forward" status widget.
5. Add auth enforcement: unauthenticated users must see login page, not the workspace.
6. Add broker context to all backend calls as a prerequisite for Phase 3 (not blocking Phase 1).
