resource "azurerm_storage_account" "sa" {
  name                     = "${var.storage_account_prefix}${random_id.sa.hex}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  account_kind             = "StorageV2"
  min_tls_version          = "TLS1_2"
}

resource "azurerm_storage_container" "policy_docs" {
  name                  = "policy-docs"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "customer_policy" {
  name                  = "customer-policy"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "private"
}