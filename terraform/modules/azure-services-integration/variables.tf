# Azure Services Integration Module Variables

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "private_endpoint_subnet_id" {
  description = "ID of the private endpoint subnet"
  type        = string
}

variable "vnet_id" {
  description = "ID of the virtual network"
  type        = string
}

variable "openai_account_id" {
  description = "ID of the existing OpenAI account"
  type        = string
}

variable "search_service_id" {
  description = "ID of the existing Search service"
  type        = string
}

variable "storage_account_id" {
  description = "ID of the existing Storage account"
  type        = string
}

variable "key_vault_id" {
  description = "ID of the existing Key Vault"
  type        = string
}

variable "private_dns_zones" {
  description = "Map of private DNS zones"
  type = object({
    keyvault = string
    openai   = string
    search   = string
    storage  = string
  })
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}