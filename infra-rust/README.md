# SageInfra Rust Infra CLI

`infra-rust` is the greenfield Rust/Cargo control surface for reviewing and rendering SageInfra infrastructure and Kubernetes workload manifests.

It is part of the active greenfield target repo:

```text
/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex
```

## Purpose

The CLI exists to make the migration from the legacy Terraform/Kubernetes shape into a safer, testable Rust model.

It currently supports:

- Inventorying Terraform modules/resources and Kubernetes document metadata.
- Modeling greenfield Azure resource names with Azure-safe constraints.
- Rendering Kubernetes manifests from the repo state.
- Materializing environment-specific values for review and server-side dry-run.
- Testing that secrets are rendered as secret references rather than raw secret values.
- Failing closed before create commands in the Azure script path.

## Important context

The active greenfield environment is `dev01`.

| Field | Value |
| --- | --- |
| Resource group | `rg-sageinfra-new-dev01` |
| AKS | `aks-sageinfra-new-dev01` |
| Namespace | `sageinfra-new-agents` |
| ACR login server | `sageinfranewdev01.azurecr.io` |
| Image tag | `dev01` |
| Location | `eastus` |

`render` without environment flags preserves placeholders. Use materialized render flags when reviewing the deployed `dev01` environment.

## Common commands

Run from this directory:

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

Render with placeholders:

```bash
cargo run -- render --root .. > /tmp/sageinfra-placeholder.yaml
```

Render materialized `dev01` manifests:

```bash
cargo run -- render \
  --root .. \
  --env dev01 \
  --location eastus \
  --acr-login-server sageinfranewdev01.azurecr.io \
  --image-tag dev01 \
  > /tmp/sageinfra-dev01.yaml
```

Review against the current cluster without changing it:

```bash
kubectl apply --dry-run=server -f /tmp/sageinfra-dev01.yaml
```

## Safety rules

- Do not run Terraform apply or destroy from this workstream without explicit approval.
- Do not run destructive Kubernetes operations without explicit approval.
- Do not print secret values.
- Do not add public ingress; keep AgentCore reachable through private port-forward for local testing.
- Do not commit or push without explicit approval.

## Reference docs

- `../docs/aks-terraform-rust-migration.md`
- `../docs/workspace/README.md`
