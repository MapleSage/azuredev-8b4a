# AKS/Terraform to Rust/Cargo Migration Inventory

This note reconciles the existing AKS and Terraform deployment assets as inputs for a new dry-run Rust/Cargo deployment path. It does not assert that the listed resources currently exist in Azure. Supervising evidence says the old `sageinsure-aks` cluster is no longer present in the subscription and current SageInsure hosting has moved mostly toward Container Apps and Static Web Apps.

## Inventory Found

Terraform assets under `terraform/` define two overlapping AKS-era paths:

- `terraform/main.tf` creates a resource group, Key Vault, Azure OpenAI account and deployment, storage account/container, Azure AI Search service, a local-exec search index bootstrap, and a simple system-assigned `sageinsure-aks` cluster.
- `terraform/aks.tf` orchestrates a newer modular AKS shape: network, user-assigned identities, Key Vault integration, AKS, private endpoints for Azure services, and platform add-ons.
- `terraform/k8s-agents.tf` defines another AKS cluster resource named `sageinsure_aks`, a GPU node pool, ACR, `AcrPull` role assignment, `sageinsure-agents` namespace, Kubernetes secrets for OpenAI/Search, and an agent config map.
- `terraform/appservice.tf` defines a Linux App Service plan and web app with Key Vault references for API settings.
- `terraform/rbac.tf`, `terraform/secrets.tf`, and `terraform/bootstrap.tf` add App Service RBAC, Key Vault secrets backed by Azure resource outputs, and sample policy document blobs.
- `terraform/modules/*` contain modular network, identity/RBAC, AKS, Key Vault integration, Azure private endpoint integration, and platform add-on definitions.

Kubernetes and YAML assets define several workload families:

- `k8s/` contains `sageinsure` namespace, backend/frontend deployments and LoadBalancer services, plus Key Vault CSI/workload identity material.
- `k8s-manifests/` contains `sageinsure-agents` agent/API/frontend manifests, ingress resources for `agents.maplesage.com`, MCP server deployments/services, health ingress/default backend resources, and secret/config manifests. `k8s-manifests/agents-deployment.yaml` appears corrupted or concatenated near the first `claims-manager` deployment and should be regenerated instead of trusted verbatim.
- `aks-deployment.yaml` contains a minimal `sageinsure-agentcore` deployment/service using a Python base image and LoadBalancer service.
- `azure-agentcore/k8s-deployment.yaml` contains ConfigMap, Deployment, Service, Ingress, and HPA for `sageinsure-agentcore`; it also contains inline secret-looking values and should not be copied into new source.
- `azure-agentcore/containerapp.yaml` is an Azure Container Apps style manifest, not a Kubernetes manifest, but is relevant context for the drift away from AKS.
- `azure-underwriter-agent/`, `azure-underwriters-workbench/`, and `azure-sageinsure-complete/underwriting-workbench/` contain workbench namespaces, secrets, deployments, LoadBalancer services, and ingress resources.
- `deployment-strategies/` contains rolling, blue/green, canary, and rollback automation manifests, including Argo Rollouts, AnalysisTemplates, Prometheus resources, RBAC, jobs, and services.

Secret handling:

- Existing manifests include secret objects, secret references, Key Vault references, Terraform-sensitive outputs, and at least one file with inline API-key-looking values.
- The Rust path intentionally renders only secret references, environment variable placeholders, and Key Vault-oriented names. It does not embed observed secret values.

## Rust/Cargo Path Added

The new project lives in `infra-rust/` and builds a CLI named `sageinfra`.

It currently supports:

- Discovery of Terraform files and Kubernetes/YAML manifests in the AKS-era paths.
- A text inventory report of Terraform resources/modules/providers/outputs and Kubernetes document kind/name/namespace/images.
- A typed `DeploymentModel` for the SageInsure/SageSure AzureDev infrastructure shape.
- Dry-run Azure provisioning extension points via the `AzureProvisioner` trait.
- Rendering Kubernetes Namespace, ConfigMap, Deployment, and Service YAML from Rust structs for core agent/API workloads:
  - `claims-manager`
  - `marine-specialist`
  - `underwriter-agent`
  - `policy-assistant`
  - `sageinsure-agentcore`

The default command is dry-run `plan`. The CLI does not call Azure, Terraform, kubectl, Docker, or any external write API.

## Greenfield Isolation Policy

All future provisioning must create a completely new Azure stack. It must not mix with, patch, import, update, or depend on current SageInsure/SageSure infrastructure.

Required behavior before any future write-capable implementation:

- Create a brand-new resource group, using the planned `rg-sageinfra-new-${SAGEINFRA_ENV}` pattern or an explicitly reviewed replacement.
- Create new Azure infrastructure inside that new resource group only: network, AKS, ACR, identities, Key Vault, storage, AI/Search resources, private endpoints, DNS/ingress resources, and workload bindings.
- Fail closed if the target resource group or any planned target resource already exists.
- Do not reuse existing clusters, namespaces, identities, Key Vaults, storage accounts, ACRs, hostnames, App Services, Container Apps, Static Web Apps, or Terraform state.
- Do not copy secret values from existing manifests or resources. Use new placeholders, environment variables, Key Vault references, or workload identity bindings.
- Treat legacy/current names such as `sageinsure-aks`, `sageinsure-agents`, `sageinsure`, `azins`, and `maplesage` as denied unless a human explicitly approves an exception in a later migration step.

The scaffold now carries this as `greenfield-new-stack` isolation metadata in the Rust deployment model and rendered review ConfigMap.

A `provision-script` command emits a fail-closed Azure CLI script for a brand-new stack. It still does not execute by itself. The generated script performs read checks before writes, refuses existing resource groups or unavailable names, and creates only resources tagged `managed-by=sageinfra`, `isolation=greenfield`, and the selected `env`.

Default reviewed `dev01` names:

- Resource group: `rg-sageinfra-new-dev01`
- AKS: `aks-sageinfra-new-dev01`
- ACR: `sageinfranewdev01`
- Key Vault: `kv-sageinfra-new-dev01`
- Storage account: `stsageinfranewdev01`
- Search: `srch-sageinfra-new-dev01`
- Azure AI/OpenAI account: `oai-sageinfra-new-dev01`

## Still Manual or Terraform-Backed

The following remain documented or Terraform-backed until they are deliberately modeled in Rust:

- Azure resource provisioning for resource groups, VNets/subnets, AKS, ACR, Key Vault, Azure OpenAI, AI Search, storage, private endpoints, App Service, and RBAC.
- Cert-manager, ingress-nginx, Application Gateway ingress, Argo Rollouts, Prometheus/ServiceMonitor/PrometheusRule resources, and rollback automation.
- Container Apps and Static Web Apps migration state.
- Real image build/push, cluster apply, Terraform apply/destroy, and Azure resource mutations.
- Secret creation and secret value sourcing. These should move to environment variables, Key Vault, workload identity, or a future secure secret provider.

## Commands

From the repository root:

```bash
cd infra-rust
cargo fmt --check
cargo test
cargo run -- plan --root ..
cargo run -- inventory --root ..
cargo run -- render --root ..
cargo run -- render --root .. --env dev01 --location eastus --acr-login-server sageinfranewdev01.azurecr.io --image-tag dev01 > /tmp/sageinfra-dev01.yaml
cargo run -- provision-script --env dev01 --location eastus2 > /tmp/sageinfra-provision-dev01.sh
```

`render` writes manifest YAML to stdout only. Without `--env`, it preserves review placeholders such as `${SAGEINFRA_NEW_ACR_LOGIN_SERVER}`. With `--env`, `--location`, `--acr-login-server`, and `--image-tag`, it emits concrete environment manifests suitable for dry-run review. Redirect it to a file for review if needed; do not pipe it to `kubectl apply` as part of this migration step.

`provision-script` writes a shell script to stdout only. Review it before execution. It is intentionally separate from `plan` and `render` so Azure writes require a human-visible execution step.

## Limitations

- The YAML inventory parser is intentionally lightweight and extracts top-level Kubernetes metadata and image references; it is not a full YAML schema validator.
- Terraform parsing is a block scanner for inventory and does not evaluate expressions, variables, module outputs, or state.
- Rendered manifests are a conservative regenerated baseline, not a byte-for-byte conversion of existing YAML.
- Existing docs and manifests disagree on namespaces, registries, domains, service types, and hosting model; uncertain or stale material was documented rather than deleted.
