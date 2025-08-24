# Store OpenAI API key in Key Vault
resource "azurerm_key_vault_secret" "openai_key" {
  name         = "OPENAI-API-KEY"
  value        = azurerm_cognitive_account.openai.primary_access_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.api_kv_policy, azurerm_cognitive_account.openai]
}

# Store Search service admin key in Key Vault
resource "azurerm_key_vault_secret" "search_key" {
  name         = "AZURE-SEARCH-KEY"
  value        = azurerm_search_service.search.primary_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.api_kv_policy, azurerm_search_service.search]
}

# Store Storage account connection string in Key Vault
resource "azurerm_key_vault_secret" "storage_connection" {
  name         = "STORAGE-CONNECTION-STRING"
  value        = azurerm_storage_account.sa.primary_connection_string
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.api_kv_policy]
}

# Store Storage account key in Key Vault
resource "azurerm_key_vault_secret" "storage_key" {
  name         = "STORAGE-ACCOUNT-KEY"
  value        = azurerm_storage_account.sa.primary_access_key
  key_vault_id = azurerm_key_vault.kv.id
  depends_on   = [azurerm_key_vault_access_policy.api_kv_policy]
}