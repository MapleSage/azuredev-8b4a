# Platform Add-ons Module Variables

variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "cluster_endpoint" {
  description = "AKS cluster endpoint"
  type        = string
}

variable "cluster_ca_certificate" {
  description = "AKS cluster CA certificate"
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

variable "key_vault_id" {
  description = "ID of the Key Vault for certificate management"
  type        = string
}

variable "dns_zone_name" {
  description = "DNS zone name for certificate management"
  type        = string
  default     = ""
}

variable "acme_email" {
  description = "Email for ACME certificate registration"
  type        = string
  default     = ""
}

variable "ingress_class_name" {
  description = "Name of the ingress class"
  type        = string
  default     = "nginx"
}

variable "enable_cert_manager" {
  description = "Enable cert-manager installation"
  type        = bool
  default     = true
}

variable "enable_nginx_ingress" {
  description = "Enable NGINX ingress controller installation"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}