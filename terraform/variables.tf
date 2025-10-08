variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US 2"
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
  default     = "sageinsure-clean-rg"
}

# AzureAD (Entra ID) tenant that owns your app registrations (NOT the onmicrosoft B2C)
variable "aad_tenant_id" {
  description = "AAD tenant ID for app registrations"
  type        = string
}

variable "app_display_name" {
  description = "Azure AD App display name"
  type        = string
  default     = "SageInsurePolicyApp"
}

# OpenAI
variable "openai_account_name" {
  description = "Azure OpenAI account name"
  type        = string
  default     = "sageinsure-openai"
}

# OpenAI model deployment name (logical)
variable "openai_deployment_name" {
  description = "OpenAI deployment name"
  type        = string
  default     = "gpt4o-deployment"
}

# Cognitive Search
variable "search_service_name" {
  description = "Azure Cognitive Search service name"
  type        = string
  default     = "sageinsure-search"
}

# Storage
variable "storage_account_prefix" {
  description = "Prefix for storage account"
  type        = string
  default     = "policydocs"
}

# Web/API app
variable "api_app_name" {
  description = "Linux Web App name"
  type        = string
  default     = "sageinsure-api"
}

variable "api_runtime_stack" {
  description = "Runtime stack (e.g. PYTHON|3.11, NODE|18-lts)"
  type        = string
  default     = "PYTHON|3.11"
}
# AKS Integration
variable "enable_aks_integration" {
  description = "Enable AKS workload identity integration"
  type        = bool
  default     = true
}

variable "aks_workload_identity_principal_id" {
  description = "Principal ID of the AKS workload identity"
  type        = string
  default     = ""
}