output "resource_group" {
  value = azurerm_resource_group.rg.name
}

output "storage_account" {
  value = azurerm_storage_account.sa.name
}

output "search_service_name" {
  value = azurerm_search_service.search.name
}

output "openai_account_name" {
  value = azurerm_cognitive_account.openai.name
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_deployment" {
  value = var.openai_deployment_name
}

output "key_vault_name" {
  value = azurerm_key_vault.kv.name
}

output "app_client_id" {
  value = azuread_application.app.client_id
}

output "api_app_url" {
  value = azurerm_linux_web_app.api.default_hostname
}

# AKS Outputs
output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = try(module.aks.cluster_name, null)
}

output "aks_cluster_endpoint" {
  description = "Endpoint of the AKS cluster"
  value       = try(module.aks.cluster_endpoint, null)
  sensitive   = true
}

output "aks_cluster_fqdn" {
  description = "FQDN of the AKS cluster"
  value       = try(module.aks.cluster_fqdn, null)
}

output "workload_identity_client_id" {
  description = "Client ID of the workload managed identity"
  value       = try(module.identity.aks_workload_identity_client_id, null)
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = try(module.network.vnet_name, null)
}

output "aks_subnet_name" {
  description = "Name of the AKS subnet"
  value       = try(module.network.aks_subnet_name, null)
}

# Key Vault Integration Outputs
output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = try(module.keyvault_integration.key_vault_uri, null)
}

output "aks_secrets" {
  description = "Map of AKS-specific secrets in Key Vault"
  value       = try(module.keyvault_integration.aks_secrets, null)
}

# Azure Services Integration Outputs
output "private_endpoints" {
  description = "Map of private endpoint IDs"
  value       = try(module.azure_services_integration.private_endpoints, null)
}

output "private_endpoint_ips" {
  description = "Map of private endpoint IP addresses"
  value       = try(module.azure_services_integration.private_endpoint_ips, null)
}

# Platform Add-ons Outputs
output "nginx_ingress_namespace" {
  description = "Namespace where NGINX ingress controller is deployed"
  value       = try(module.platform_addons.nginx_ingress_namespace, null)
}

output "cert_manager_namespace" {
  description = "Namespace where cert-manager is deployed"
  value       = try(module.platform_addons.cert_manager_namespace, null)
}

output "ingress_class_name" {
  description = "Name of the NGINX ingress class"
  value       = try(module.platform_addons.nginx_ingress_class_name, null)
}

output "letsencrypt_issuer_name" {
  description = "Name of the Let's Encrypt production issuer"
  value       = try(module.platform_addons.letsencrypt_issuer_name, null)
}