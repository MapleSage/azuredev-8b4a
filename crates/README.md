# SageInfra Rust Crates

This directory contains the new Rust domain and service crates for the SageInfra/SageSure greenfield rebuild.

These crates are in the active target repo:

```text
/Volumes/Macintosh HD Ext/azuredev-8b4a-rust-cargo-codex
```

## Crate map

| Crate | Role |
| --- | --- |
| `domain` | Shared domain contracts, identifiers, auth types, and error handling. Use this for stable cross-service types before duplicating models in service crates. |
| `infra` | Shared infrastructure adapters for blob storage, cache, database, Key Vault, notification, and config concerns. Keep provider-specific behavior isolated here. |
| `claims-defender` | Claims complaint/evidence parsing and fraud/defense-oriented analysis primitives. Intended to support claims review and Claims Defender workflows. |
| `policy-pulse` | Policy document extraction, red-flag detection, and India/SageSure policy intelligence primitives. Includes Sarvam-facing integration surfaces where needed. |
| `scamshield` | Scam and suspicious-contact analysis primitives, including phone/message analysis types and analyzers. |

## Design direction

The crates should move common business logic out of frontend/API glue and into testable Rust modules.

Prefer:

- Stable domain contracts in `domain`.
- Provider adapters in `infra`.
- Small, focused service crates with unit tests.
- No hard-coded secrets.
- No coupling to live/reference workspaces.

Avoid:

- Mixing ClaudeCode-owned live workspace files into this repo.
- Copying AWS-era demo assumptions into greenfield Azure/Rust code unless intentionally preserved as migration notes.
- Treating `claw-code` output as source of truth without validating against this repo and the deployed `dev01` environment.

## Validation

There is not yet a root Cargo workspace manifest for these crates. Validate individual crates as they become active, and validate `infra-rust` separately:

```bash
cd ../infra-rust
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

When a root workspace is added, prefer a single workspace-level check from the repository root.

## Related docs

- `../docs/workspace/README.md`
- `../docs/aks-terraform-rust-migration.md`
- `../infra-rust/README.md`
