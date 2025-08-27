# AKS Terraform Modules

This directory contains modular Terraform configurations for deploying Azure Kubernetes Service (AKS) infrastructure for the SageInsure application migration.

## Module Structure

### Network Module (`./network/`)

- Creates Virtual Network with multiple subnets
- Configures Network Security Groups for AKS
- Sets up private DNS zones for Azure services
- Provides network isolation and security

**Resources Created:**

- Virtual Network with calculated CIDR blocks
- AKS subnet for Kubernetes nodes
- Application Gateway subnet for ingress
- Private endpoint subnet for secure Azure service connectivity
- Network Security Groups with minimal required rules
- Private DNS zones for Key Vault, OpenAI, Search, and Storage

### Identity Module (`./identity/`)

- Creates User Assigned Managed Identities
- Configures RBAC permissions for Azure services
- Sets up Workload Identity for Kubernetes integration

**Resources Created:**

- AKS cluster managed identity
- AKS workload managed identity
- RBAC assignments for Key Vault, Storage, OpenAI, and Search access

### AKS Module (`./aks/`)

- Deploys AKS cluster with multiple node pools
- Configures Azure AD integration
- Enables workload identity and auto-scaling
- Sets up monitoring and security features

**Resources Created:**

- AKS cluster with system node pool
- General workload node pool
- Optional GPU node pool
- Auto-scaler configuration
- Azure Policy and Key Vault Secrets Provider

## Usage

The modules are orchestrated in the main `aks.tf` file:

```hcl
# Network infrastructure
module "network" {
  source = "./modules/network"
  # ... configuration
}

# Identity and RBAC
module "identity" {
  source = "./modules/identity"
  # ... configuration
}

# AKS cluster
module "aks" {
  source = "./modules/aks"
  # ... configuration
}
```

## Prerequisites

1. Existing Azure infrastructure (Resource Group, Key Vault, OpenAI, Search, Storage)
2. Terraform backend configured
3. Azure CLI authenticated with appropriate permissions

## Deployment

1. Initialize Terraform:

   ```bash
   terraform init
   ```

2. Plan the deployment:

   ```bash
   terraform plan -var-file="terraform.tfvars"
   ```

3. Apply the configuration:
   ```bash
   terraform apply -var-file="terraform.tfvars"
   ```

## Node Pool Configuration

- **System Pool**: Dedicated for Kubernetes system components (1-3 nodes)
- **General Pool**: For application workloads (2-6 nodes)
- **GPU Pool**: Optional for ML/AI workloads (0-2 nodes)

All node pools support auto-scaling based on demand.

## Security Features

- Azure AD integration with RBAC
- Workload Identity for pod-level authentication
- Network policies for traffic control
- Private DNS zones for secure service connectivity
- Key Vault integration for secrets management

## Monitoring and Observability

- Azure Monitor integration
- Key Vault Secrets Provider with rotation
- Azure Policy for compliance
- Auto-scaler profiling for optimization
