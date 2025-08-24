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