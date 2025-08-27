# Azure Services Integration Module - Private Endpoints

# Private Endpoint for Key Vault
resource "azurerm_private_endpoint" "keyvault" {
  name                = "pe-keyvault-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "psc-keyvault"
    private_connection_resource_id = var.key_vault_id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "pdz-group-keyvault"
    private_dns_zone_ids = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zones.keyvault}"]
  }

  tags = var.tags
}

# Private Endpoint for Azure OpenAI - Commented out due to CustomSubDomainName requirement
# resource "azurerm_private_endpoint" "openai" {
#   name                = "pe-openai-aks"
#   location            = var.location
#   resource_group_name = var.resource_group_name
#   subnet_id           = var.private_endpoint_subnet_id

#   private_service_connection {
#     name                           = "psc-openai"
#     private_connection_resource_id = var.openai_account_id
#     subresource_names              = ["account"]
#     is_manual_connection           = false
#   }

#   private_dns_zone_group {
#     name                 = "pdz-group-openai"
#     private_dns_zone_ids = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zones.openai}"]
#   }

#   tags = var.tags
# }

# Private Endpoint for Cognitive Search
resource "azurerm_private_endpoint" "search" {
  name                = "pe-search-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "psc-search"
    private_connection_resource_id = var.search_service_id
    subresource_names              = ["searchService"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "pdz-group-search"
    private_dns_zone_ids = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zones.search}"]
  }

  tags = var.tags
}

# Private Endpoint for Storage Account
resource "azurerm_private_endpoint" "storage" {
  name                = "pe-storage-aks"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "psc-storage"
    private_connection_resource_id = var.storage_account_id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "pdz-group-storage"
    private_dns_zone_ids = ["/subscriptions/${data.azurerm_client_config.current.subscription_id}/resourceGroups/${var.resource_group_name}/providers/Microsoft.Network/privateDnsZones/${var.private_dns_zones.storage}"]
  }

  tags = var.tags
}

# Data source for current client configuration
data "azurerm_client_config" "current" {}