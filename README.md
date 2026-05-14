# SageSure / SageInsure Greenfield Platform

> Active greenfield SageInfra rebuild target: `/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex`.
>
> Start with `docs/workspace/README.md` for repo boundaries, reference-app rules, dev01 AKS/Azure context, and validation commands. See `infra-rust/README.md`, `crates/README.md`, and `frontend/README.md` for the Rust and frontend workstream notes.

This repository is the isolated dev01 rebuild for the SageSure/SageInsure insurance operations platform. It combines a private AKS backend, Rust-rendered infrastructure/deployment foundations, tenant-scoped insurance domain crates, and a polished Next.js operations cockpit for claims, FNOL, underwriting, CRM queues, consumer relief, policy guidance, cyber risk, and governance workflows.

## Product positioning

SageSure/SageInsure is the visible product surface. The customer-facing experience should emphasize:

- insurance operations workbenches
- governed workflow orchestration
- tenant isolation and auditability
- human-in-the-loop approval controls
- broker, POSP, insurer, and service-user workflows
- clear SageSure branding and insurance language

Runtime/orchestration internals should remain backend and admin/debug oriented by default. Avoid presenting the platform to insurers or regulators as an open-ended autonomous runtime.

## Architecture

- **Frontend**: Next.js, TypeScript, Tailwind CSS, SageSure-branded operations cockpit
- **Private backend**: AgentCore-style FastAPI services on AKS, reached locally through private port-forward during dev01 testing
- **Infrastructure renderer**: Rust CLI for greenfield planning/rendering and Kubernetes manifest materialization
- **Domain crates**: Rust insurance foundations for policy, claims, fraud, consumer relief, and shared infrastructure patterns
- **AI/search services**: Azure OpenAI and Azure Search in isolated dev01 resources
- **Identity posture**: Entra/OIDC direction with no static secrets for target runtime architecture
- **Tenant runtime target**: one governed, isolated broker/POSP workspace per namespace, with policy controls, audit trails, and lifecycle automation

## dev01 environment

Current greenfield resources are isolated from legacy/live environments:

- Resource group: `rg-sageinfra-new-dev01`
- AKS: `aks-sageinfra-new-dev01`
- Namespace: `sageinfra-new-agents`
- ACR: `sageinfranewdev01.azurecr.io`
- Azure OpenAI: `oai-sageinfra-new-dev01`
- Azure Search: `srch-sageinfra-new-dev01`

Backend access remains private. Use the local bridge for frontend/API smoke tests:

```bash
kubectl -n sageinfra-new-agents port-forward svc/sageinfra-agentcore 8000:80
```

## Local frontend

```bash
cd frontend
npm install
npm run dev
```

Useful validation:

```bash
npm run build
curl http://127.0.0.1:3000/
curl http://127.0.0.1:8000/healthz
```

## Rust infrastructure validation

```bash
cd infra-rust
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
cargo run -- render --root .. --env dev01 --location eastus --acr-login-server sageinfranewdev01.azurecr.io --image-tag dev01 > /tmp/sageinfra-dev01-materialized.yaml
kubectl apply --dry-run=server -f /tmp/sageinfra-dev01-materialized.yaml
```

## Frontend modules

- Operations Home
- Tasks and SLA queues
- Assistant cockpit
- Claims and FNOL workbench
- Underwriting workbench
- CRM / producer workspace
- Consumer Relief: ScamShield, Policy Pulse, Claims Defender, Document Vault, Renewals, Buying Assistance
- Specialty: Marine and Cyber
- Admin: health, analytics, governance, users, permissions, audit controls

## Guardrails for this repo

- Preserve greenfield isolation.
- Do not reuse legacy infrastructure.
- Do not apply/destroy Terraform or destructive Kubernetes changes without explicit approval.
- Do not expose public ingress for dev01 backend services.
- Treat live/reference folders as read-only sources for UI, workflow, and product patterns.
- Do not commit or push without explicit approval.

## Project structure

```text
azuredev-8b4a-rust-cargo-codex/
├── crates/                 # Rust domain and platform crates
├── docs/                   # Greenfield migration and workspace docs
├── frontend/               # Next.js SageSure/SageInsure cockpit
├── infra-rust/             # Rust deployment/model renderer
└── k8s/ or manifests/      # Kubernetes materials where present
```
