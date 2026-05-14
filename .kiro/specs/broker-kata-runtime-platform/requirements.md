# Requirements Document: Broker/POSP Kata Runtime Platform

## Introduction

The SageSure platform is not a single shared demo frontend with a shared chat backend. The target system is a tenant-isolated broker/POSP runtime platform on AKS. Each broker/POSP receives an isolated Kubernetes namespace and an isolated Kata VM-backed runtime pod containing that broker's gateway, workspace, preloaded knowledge base, approved tools, and skills. Lifecycle is driven by POSP signup events and reconciled by a Kubernetes operator. Identity is Entra Workload Identity using AKS OIDC federation with no static secrets in code, manifests, or containers.

This spec supersedes generic AKS migration/demo work for the dev01 build. Existing shared `sageinfra-new-agents` workloads may remain temporarily as bootstrap/reference services, but they are not the target product architecture.

**Current state as of 2026-05-14:** No broker namespaces exist. No operator exists. No app workload uses Kata isolation. The frontend bypasses authentication via a hardcoded synthetic user and a `NEXT_PUBLIC_DISABLE_AUTH=true` environment variable in the deployed K8s manifest. Legacy manifests contain plaintext Azure credentials and must not be applied. See `current-state.md` for the full gap assessment.

## Requirements

### Requirement 1: Per-Broker Namespace Isolation

**User Story:** As a platform owner, I want every broker/POSP to run in its own namespace, so that customer data, tools, policies, and runtime state are isolated by Kubernetes boundary.

#### Acceptance Criteria

1. WHEN a POSP/broker is onboarded THEN the system SHALL create a namespace named `broker-{posp_id}`.
2. WHEN namespace resources are created THEN the namespace SHALL include broker labels for `sage.suresure.ai/posp-id`, `tenant-id`, `lifecycle-state`, and `data-classification`.
3. WHEN broker workloads run THEN no broker runtime SHALL run in the shared `sageinfra-new-agents` namespace except platform bootstrap services.
4. WHEN a broker namespace is deleted THEN all broker runtime pods, PVCs, ConfigMaps, network policies, and federated identity bindings SHALL be garbage-collected or explicitly finalized.

### Requirement 2: Kata VM Runtime Isolation

**User Story:** As a security architect, I want each broker runtime pod isolated with Kata Containers, so that broker code/tools/workspaces execute in a VM isolation boundary rather than only a shared container boundary.

#### Acceptance Criteria

1. WHEN creating a broker runtime pod THEN the pod SHALL set `runtimeClassName: kata-vm-isolation`.
2. WHEN the cluster lacks the required RuntimeClass THEN the operator SHALL mark the BrokerRuntime as NotReady and SHALL NOT fall back silently to `runc`.
3. WHEN runtime pods start THEN they SHALL expose `/healthz` and `/readyz` endpoints.
4. WHEN validating deployment THEN `kubectl get pods -n broker-{posp_id} -o jsonpath='{.items[*].spec.runtimeClassName}'` SHALL show `kata-vm-isolation`.

### Requirement 3: Broker Runtime Contents

**User Story:** As a broker/POSP, I need my runtime pod to contain my workspace, knowledge base, tools, and skills, so that the assistant is grounded in my tenant context and allowed capabilities.

#### Acceptance Criteria

1. WHEN a BrokerRuntime is reconciled THEN the runtime SHALL include a gateway service for broker-specific ingress/API routing.
2. WHEN the runtime starts THEN it SHALL mount or hydrate a broker workspace from approved storage.
3. WHEN the runtime starts THEN it SHALL preload broker-specific KB references and tool manifests.
4. WHEN a tool is not approved for the broker THEN it SHALL not be available in that broker runtime.
5. WHEN a skill is enabled/disabled for a broker THEN the operator SHALL reconcile the runtime configuration without manual pod edits.

### Requirement 4: Entra Workload Identity and No Static Secrets

**User Story:** As a security engineer, I want broker runtimes to authenticate using Entra Workload Identity, so that no static credentials are stored in manifests, images, or repo files.

#### Acceptance Criteria

1. WHEN a broker namespace is created THEN the operator SHALL create a broker-scoped Kubernetes ServiceAccount annotated with `azure.workload.identity/client-id`.
2. WHEN a broker runtime accesses Azure resources THEN it SHALL use the ServiceAccount token projected by AKS OIDC and Entra federated credentials.
3. WHEN manifests are scanned THEN they SHALL contain no client secrets, API keys, or long-lived credentials.
4. WHEN a broker is offboarded THEN federated credential bindings and role assignments SHALL be removed or disabled.

**Current state:** Legacy manifests `k8s/backend-deployment.yaml` and `k8s-manifests/secrets.yaml` contain embedded Azure credentials (plaintext and base64). These files must be moved to `legacy/DO_NOT_APPLY/` and the credentials assessed for rotation before any cluster work proceeds. See `current-state.md` §3.

### Requirement 5: POSP Signup Lifecycle Automation

**User Story:** As an onboarding system, I want a webhook to create/update broker runtimes automatically, so that new POSPs get an isolated runtime without manual Kubernetes work.

#### Acceptance Criteria

1. WHEN a new POSP signup event is received THEN the lifecycle API SHALL create or update a BrokerRuntime custom resource.
2. WHEN a BrokerRuntime CR is created THEN the operator SHALL reconcile namespace, identity, policies, config, runtime pod, service, and ingress/gateway bindings.
3. WHEN a BrokerRuntime spec changes THEN the operator SHALL roll runtime pods safely and preserve broker workspace state.
4. WHEN reconciliation fails THEN the CR status SHALL include reason, last error, and next retry time.

### Requirement 6: Autoscaling and Idle Cleanup

**User Story:** As an operator, I want broker runtimes to scale based on activity and clean up idle tenants, so that the platform is cost efficient.

#### Acceptance Criteria

1. WHEN broker traffic increases THEN the runtime SHALL scale according to configured policy, subject to tenant quota.
2. WHEN a broker runtime is idle beyond its policy THEN it SHALL scale to zero or be suspended while preserving workspace/KB state.
3. WHEN activity resumes THEN the broker runtime SHALL cold-start and become ready within the defined SLO.
4. WHEN a broker is inactive or offboarded THEN the operator SHALL clean up runtime resources according to retention policy.

### Requirement 7: Network Policy and Tenant Data Boundaries

**User Story:** As a compliance owner, I want strict network boundaries, so that one broker runtime cannot reach another broker runtime or unapproved services.

#### Acceptance Criteria

1. WHEN broker namespaces are created THEN default-deny ingress and egress NetworkPolicies SHALL be installed.
2. WHEN broker runtime needs platform services THEN only approved egress to platform gateway, Azure service endpoints, and DNS SHALL be allowed.
3. WHEN two broker namespaces exist THEN no direct pod-to-pod traffic SHALL be allowed between them.
4. WHEN validating a broker runtime THEN network policy tests SHALL prove tenant-to-tenant isolation.

### Requirement 8: Authentication and User Access Model

**User Story:** As a broker user, I want to authenticate through the SageSure/POSP identity flow, so that the UI and runtime are tied to my broker namespace and permissions.

#### Acceptance Criteria

1. WHEN a user opens the frontend THEN unauthenticated users SHALL see the real login page, not a synthetic dev user.
2. WHEN login completes THEN the app SHALL resolve the user's broker/POSP identity and route requests to the correct broker runtime.
3. WHEN dev01 lacks HTTPS/auth config THEN the app SHALL show an explicit auth configuration blocker instead of silently bypassing auth.
4. WHEN a user is authorized for broker A THEN they SHALL NOT be able to access broker B runtime APIs.

**Current state:** Authentication is bypassed in the live dev01 deployment via `NEXT_PUBLIC_DISABLE_AUTH=true` in `k8s/sageinfra-frontend-dev01.yaml`. `ChatApp.tsx` hardcodes `"demo-token"` as auth fallback. Role is read from sessionStorage with no server-side validation. User display name defaults to `"Nick D"` when no authenticated user is present. All of these bypass conditions must be removed. See `current-state.md` §4 and `ui-module-inventory.md` §Cross-Cutting Issues.

### Requirement 9: Product Surface and Page Functionality

**User Story:** As a SageSure operator/broker, I want every visible page/module to have a defined backend contract, so that the frontend is not a collection of dummy tabs.

#### Acceptance Criteria

1. WHEN a page is visible in the UI THEN it SHALL have an owner, backend endpoint/agent contract, data source, and acceptance test.
2. WHEN a page is not implemented THEN it SHALL be hidden or marked explicitly as unavailable for the current release.
3. WHEN page smoke tests run THEN they SHALL verify more than static rendering; they SHALL exercise the expected backend contract.
4. WHEN a module routes to an agent THEN the request SHALL include broker/POSP context and be handled by that broker's runtime.

### Requirement 10: Governance, Policy, and Runtime Security

**User Story:** As a security/compliance owner, I want Azure Policy, Defender for Containers, admission controls, and audit logging enabled, so that the platform meets enterprise controls.

#### Acceptance Criteria

1. WHEN the AKS cluster is configured THEN Azure Policy for AKS SHALL be enabled.
2. WHEN the AKS cluster is configured THEN Defender for Containers SHALL be enabled.
3. WHEN broker pods are admitted THEN policies SHALL require Kata runtime, non-root containers, resource limits, signed/approved images, and Workload Identity labels.
4. WHEN security events occur THEN logs SHALL be correlated to broker namespace and POSP ID.

### Requirement 11: Observability and Operational Clarity

**User Story:** As an operator, I need to know where agents live and what they are doing, so that runtime behavior is inspectable and supportable.

#### Acceptance Criteria

1. WHEN viewing a broker runtime THEN status SHALL show namespace, pod, image, runtime class, identity client ID, KB version, tools, skills, last activity, and health.
2. WHEN an agent handles a request THEN logs and traces SHALL include broker/POSP ID, conversation ID, agent/tool name, latency, and outcome.
3. WHEN listing platform status THEN shared services and per-broker runtimes SHALL be clearly separated.
4. WHEN an agent/tool is unavailable THEN the UI SHALL show actionable status instead of generic chat fallback.

### Requirement 12: Delivery Discipline

**User Story:** As the product owner, I want requirements, design, and task lists maintained before implementation, so that the build does not drift into demo-only patches.

#### Acceptance Criteria

1. WHEN starting platform work THEN `.kiro/specs/broker-kata-runtime-platform/{requirements,design,tasks}.md` SHALL be updated first.
2. WHEN a task is marked complete THEN live verification evidence SHALL be recorded.
3. WHEN deployment differs from the target design THEN the status report SHALL identify it as a gap, not as done.
4. WHEN temporary dev shortcuts are used THEN they SHALL be explicitly documented with rollback/removal tasks.
