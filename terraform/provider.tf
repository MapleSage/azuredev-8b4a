terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.117"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.12"
    }
    random = {
      source = "hashicorp/random"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# Point AzureAD provider at the tenant that owns your app registrations
provider "azuread" {
  tenant_id = var.aad_tenant_id
}

provider "azapi" {}

# Helm provider configuration
provider "helm" {
  kubernetes {
    host                   = module.aks.cluster_endpoint
    cluster_ca_certificate = base64decode(module.aks.cluster_ca_certificate)
    
    exec {
      api_version = "client.authentication.k8s.io/v1"
      command     = "az"
      args = [
        "aks",
        "get-credentials",
        "--resource-group", data.azurerm_resource_group.existing.name,
        "--name", module.aks.cluster_name,
        "--format", "exec"
      ]
    }
  }
}

# Kubernetes provider configuration
provider "kubernetes" {
  host                   = module.aks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.aks.cluster_ca_certificate)
  
  exec {
    api_version = "client.authentication.k8s.io/v1"
    command     = "az"
    args = [
      "aks",
      "get-credentials",
      "--resource-group", data.azurerm_resource_group.existing.name,
      "--name", module.aks.cluster_name,
      "--format", "exec"
    ]
  }
}