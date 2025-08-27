# Key Vault Integration Module Variables

variable "key_vault_id" {
  description = "ID of the existing Key Vault"
  type        = string
}

variable "key_vault_name" {
  description = "Name of the existing Key Vault"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "aks_cluster_identity_principal_id" {
  description = "Principal ID of the AKS cluster managed identity"
  type        = string
}

variable "aks_workload_identity_principal_id" {
  description = "Principal ID of the AKS workload managed identity"
  type        = string
}

variable "aks_workload_identity_client_id" {
  description = "Client ID of the AKS workload managed identity"
  type        = string
}

variable "aad_tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}