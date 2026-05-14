# DO_NOT_APPLY legacy manifests

These manifests are quarantined reference material for the Broker/POSP Kata Runtime Platform work.

Do not apply these files to any cluster as-is.

Why they are quarantined:

- Some legacy manifests contain plaintext or base64-encoded Azure/API credentials.
- Some reference localhost, demo/shared `sageinsure` wiring, or static secret patterns.
- They deploy shared prototype workloads rather than isolated `broker-{posp_id}` namespaces.
- They do not satisfy the target architecture: Entra Workload Identity/OIDC, no static secrets, broker-scoped namespaces, and Kata `runtimeClassName: kata-vm-isolation`.

Before reusing anything here:

1. Rotate any credential that may have been applied, committed, pushed, or shared.
2. Replace static secrets with Workload Identity and approved secretless access patterns.
3. Replace shared namespace assumptions with `BrokerRuntime` operator reconciliation.
4. Require security review before any derived manifest is applied.
