# SageInfra Workspace Notes

This document captures the current working boundaries for the SageInfra greenfield rebuild so future work does not mix live ClaudeCode workspaces, reference deployments, and active OpenClaw implementation targets.

## Current working set

| Path | Role | Write policy |
| --- | --- | --- |
| `/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex` | Active SageInfra greenfield rebuild target. This is where OpenClaw implementation work should continue. | Editable for this workstream. No commits or pushes without explicit approval. |
| `/Volumes/Macintosh HD Ext/azuredev-8b4a` | Original/source AzureDev monorepo and reference implementation. Useful for legacy assets, existing frontend behavior, and historical infrastructure shape. | Reference by default. Do not mutate unless explicitly requested. |
| `/Volumes/Macintosh HD Ext/uw-workbench-rust-cargo-codex` | Separate UW Workbench Rust/Cargo migration target and reference for underwriting flow migration. | Separate workstream. Do not blend changes into it unless explicitly requested. |
| `/Volumes/Macintosh HD Ext/claw-code` | Common/shared assistant-building support workspace. Can help with implementation support, but it is not source of truth. | Support/reference only unless explicitly requested. |
| `/Volumes/Macintosh HD Ext/sagesure-cotent-processor-fnol` | Live ClaudeCode workspace containing FNOL, SageInsure app, UW Workbench, and OpenClaw folders. | Live/reference only. Do not mutate from this workstream. |
| `/Volumes/Macintosh HD Ext/sagesure-india` | Live SageSure India reference workspace for product/domain language and insurance UX patterns. | Live/reference only. Do not mutate from this workstream. |

## Source of truth order

1. Explicit user instruction in the current session.
2. Current repository state in the active target repo.
3. Current deployed greenfield Azure/AKS state.
4. Migration docs and memory notes.
5. Read-only source/reference workspaces.
6. `claw-code` support outputs only after verification.

## Greenfield deployment context

The active greenfield environment is `dev01`.

| Resource | Value |
| --- | --- |
| Subscription | `2bfa9715-785b-445f-8102-6a423a7495ef` |
| Resource group | `rg-sageinfra-new-dev01` |
| Region used for AKS/Search/OpenAI | `eastus` |
| ACR | `sageinfranewdev01` |
| ACR login server | `sageinfranewdev01.azurecr.io` |
| AKS | `aks-sageinfra-new-dev01` |
| Namespace | `sageinfra-new-agents` |
| OpenAI resource | `oai-sageinfra-new-dev01` |
| OpenAI deployment | `gpt-4o`, version `2024-11-20` |
| Azure Search | `srch-sageinfra-new-dev01` |
| Key Vault | `kv-sageinfra-new-dev01` |
| Storage | `stsageinfranewdev01` |

`eastus2` hit `InsufficientResourcesAvailable` for Azure Search, so Search/OpenAI/AKS continued safely in `eastus` while preserving greenfield isolation.

## Current runtime posture

The AKS workloads verified healthy in namespace `sageinfra-new-agents` are:

- `claims-manager`
- `marine-specialist`
- `underwriter-agent`
- `policy-assistant`
- `sageinfra-agentcore`

The active image tag is `dev01`, using images from `sageinfranewdev01.azurecr.io`.

Backend access remains private. Do not add public ingress for this workstream. Local smoke testing should use a private bridge:

```bash
kubectl -n sageinfra-new-agents port-forward svc/sageinfra-agentcore 8000:80
```

## Guardrails

- Preserve greenfield isolation.
- Do not reuse legacy/shared infrastructure.
- Do not run Terraform apply or destroy without explicit approval.
- Do not add public ingress.
- Do not commit or push without explicit approval.
- Do not print secrets or keys.
- Use remote ACR builds if local Docker hangs.
- Keep source/reference/live workspaces read-only unless the user explicitly changes that boundary.

## Frontend productization direction

Continue productizing the active target frontend under:

```text
/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex/frontend
```

Use live/reference apps for design and workflow patterns only. The active frontend should move toward SageSure/SageInsure operations language and away from AWS-era demo terminology such as S3, Textract, Bedrock, DynamoDB, Step Functions, Cognito, Amplify, CloudFront, and DocStream where those terms are not part of the new greenfield runtime.

## Validation checklist

For frontend-only changes:

```bash
cd frontend
npm run build
```

For Rust infra changes:

```bash
cd infra-rust
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

For greenfield manifest review:

```bash
cd infra-rust
cargo run -- render --root .. --env dev01 --location eastus --acr-login-server sageinfranewdev01.azurecr.io --image-tag dev01 > /tmp/sageinfra-dev01.yaml
kubectl apply --dry-run=server -f /tmp/sageinfra-dev01.yaml
```

For local private AgentCore smoke tests, keep the port-forward running and test:

```bash
curl -s http://127.0.0.1:8000/healthz
curl -s http://127.0.0.1:3000/api/azure-chat \
  -H 'content-type: application/json' \
  -d '{"text":"Summarize this greenfield environment.","conversationId":"openclaw-smoke","context":{"source":"readme-smoke"}}'
```
