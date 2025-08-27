# Azure Services Integration Module Outputs

output "keyvault_private_endpoint_id" {
  description = "ID of the Key Vault private endpoint"
  value       = azurerm_private_endpoint.keyvault.id
}

output "openai_private_endpoint_id" {
  description = "ID of the OpenAI private endpoint"
  value       = null  # Commented out due to CustomSubDomainName requirement
}

output "search_private_endpoint_id" {
  description = "ID of the Search private endpoint"
  value       = azurerm_private_endpoint.search.id
}

output "storage_private_endpoint_id" {
  description = "ID of the Storage private endpoint"
  value       = azurerm_private_endpoint.storage.id
}

output "private_endpoints" {
  description = "Map of all private endpoint IDs"
  value = {
    keyvault = azurerm_private_endpoint.keyvault.id
    openai   = null  # Commented out due to CustomSubDomainName requirement
    search   = azurerm_private_endpoint.search.id
    storage  = azurerm_private_endpoint.storage.id
  }
}

output "private_endpoint_ips" {
  description = "Map of private endpoint IP addresses"
  value = {
    keyvault = azurerm_private_endpoint.keyvault.private_service_connection[0].private_ip_address
    openai   = null  # Commented out due to CustomSubDomainName requirement
    search   = azurerm_private_endpoint.search.private_service_connection[0].private_ip_address
    storage  = azurerm_private_endpoint.storage.private_service_connection[0].private_ip_address
  }
}