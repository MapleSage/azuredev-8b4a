# Create an App Registration for your app
resource "azuread_application" "app" {
  display_name     = var.app_display_name
  sign_in_audience = "AzureADMyOrg"
}

# Service Principal needs the app's client_id
resource "azuread_service_principal" "app_sp" {
  client_id = azuread_application.app.client_id
}

# Client secret for the app
resource "azuread_application_password" "app_secret" {
  application_id = azuread_application.app.id
  display_name   = "policy-app-secret"
  end_date       = timeadd(timestamp(), "17520h") # 2 years
}

# Store secrets in Key Vault
resource "azurerm_key_vault_secret" "kv_app_client_id" {
  name         = "APP-CLIENT-ID"
  value        = azuread_application.app.client_id
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "kv_app_client_secret" {
  name         = "APP-CLIENT-SECRET"
  value        = azuread_application_password.app_secret.value
  key_vault_id = azurerm_key_vault.kv.id
}

# Search Admin Key (primary) — stored for your API to call admin APIs if needed
resource "azurerm_key_vault_secret" "kv_search_admin_key" {
  name         = "SEARCH-ADMIN-KEY"
  value        = azurerm_search_service.search.primary_key
  key_vault_id = azurerm_key_vault.kv.id
}

# OpenAI keys (primary)
resource "azurerm_key_vault_secret" "kv_openai_key" {
  name         = "OPENAI-KEY"
  value        = azurerm_cognitive_account.openai.primary_access_key
  key_vault_id = azurerm_key_vault.kv.id
}