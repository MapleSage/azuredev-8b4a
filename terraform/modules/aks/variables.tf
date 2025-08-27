# AKS Module Variables

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "sageinsure-aks"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.30.6"
}

variable "dns_prefix" {
  description = "DNS prefix for the cluster"
  type        = string
  default     = "sageinsure"
}

variable "vnet_subnet_id" {
  description = "ID of the subnet for AKS nodes"
  type        = string
}

variable "cluster_identity_id" {
  description = "ID of the cluster managed identity"
  type        = string
}

variable "workload_identity_client_id" {
  description = "Client ID of the workload managed identity"
  type        = string
}

variable "aad_tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "system_node_pool" {
  description = "Configuration for system node pool"
  type = object({
    vm_size    = string
    min_count  = number
    max_count  = number
    node_count = number
  })
  default = {
    vm_size    = "Standard_D2s_v3"
    min_count  = 1
    max_count  = 3
    node_count = 1
  }
}

variable "general_node_pool" {
  description = "Configuration for general workload node pool"
  type = object({
    vm_size   = string
    min_count = number
    max_count = number
  })
  default = {
    vm_size   = "Standard_D4s_v3"
    min_count = 2
    max_count = 6
  }
}

variable "gpu_node_pool" {
  description = "Configuration for GPU node pool"
  type = object({
    vm_size   = string
    min_count = number
    max_count = number
    enabled   = bool
  })
  default = {
    vm_size   = "Standard_NC6s_v3"
    min_count = 0
    max_count = 2
    enabled   = false
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}