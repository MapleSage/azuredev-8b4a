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