resource "azurerm_resource_group" "rg" {
  name     = var.resource_group_name
  location = var.location
}

# Random suffix for globally-unique storage account
resource "random_id" "sa" {
  byte_length = 4
}

# Key Vault
resource "azurerm_key_vault" "kv" {
  name                        = "kv-${random_id.sa.hex}"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = var.aad_tenant_id
  sku_name                    = "standard"
  purge_protection_enabled    = false
  soft_delete_retention_days  = 7
  public_network_access_enabled = true

  access_policy {
    tenant_id = var.aad_tenant_id
    object_id = data.azuread_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete"]
  }
}

data "azuread_client_config" "current" {}