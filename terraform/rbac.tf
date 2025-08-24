# Role assignments for App Service Managed Identity

# Storage Blob Data Contributor role for App Service
resource "azurerm_role_assignment" "api_storage_blob" {
  scope                = azurerm_storage_account.sa.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}

# Search Index Data Contributor role for App Service
resource "azurerm_role_assignment" "api_search_contributor" {
  scope                = azurerm_search_service.search.id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}

# Search Service Contributor role for App Service
resource "azurerm_role_assignment" "api_search_service" {
  scope                = azurerm_search_service.search.id
  role_definition_name = "Search Service Contributor"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}

# Cognitive Services OpenAI User role for App Service
resource "azurerm_role_assignment" "api_openai_user" {
  scope                = azurerm_cognitive_account.openai.id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_linux_web_app.api.identity[0].principal_id
}