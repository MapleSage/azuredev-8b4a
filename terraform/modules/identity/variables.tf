# Identity Module Variables

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "aks_cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "key_vault_id" {
  description = "ID of the existing Key Vault"
  type        = string
}

variable "storage_account_id" {
  description = "ID of the existing Storage Account"
  type        = string
}

variable "openai_account_id" {
  description = "ID of the existing OpenAI account"
  type        = string
}

variable "search_service_id" {
  description = "ID of the existing Cognitive Search service"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}