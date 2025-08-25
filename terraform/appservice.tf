# App Service Plan (Linux)
resource "azurerm_service_plan" "plan" {
  name                = "${var.api_app_name}-plan"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  os_type             = "Linux"
  sku_name            = "P1v3"
}

# Web App for your API (FastAPI/Node)
resource "azurerm_linux_web_app" "api" {
  name                = var.api_app_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.plan.id

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = (split("|", var.api_runtime_stack)[0] == "PYTHON") ? split("|", var.api_runtime_stack)[1] : null
      node_version   = (split("|", var.api_runtime_stack)[0] == "NODE")   ? split("|", var.api_runtime_stack)[1] : null
    }
    always_on = true
    app_command_line = "gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app"
  }

  app_settings = {
    # Azure OpenAI Configuration
    "AZURE_OPENAI_ENDPOINT"     = azurerm_cognitive_account.openai.endpoint
    "AZURE_OPENAI_DEPLOYMENT"   = var.openai_deployment_name
    "OPENAI_API_KEY"            = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.kv.name};SecretName=OPENAI-API-KEY)"
    
    # Azure Search Configuration
    "AZURE_SEARCH_SERVICE"      = azurerm_search_service.search.name
    "AZURE_SEARCH_ENDPOINT"     = "https://${azurerm_search_service.search.name}.search.windows.net"
    "AZURE_SEARCH_KEY"          = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.kv.name};SecretName=AZURE-SEARCH-KEY)"
    "AZURE_SEARCH_INDEX"        = "policy-index"
    
    # Azure Storage Configuration
    "AZURE_STORAGE_ACCOUNT"     = azurerm_storage_account.sa.name
    "AZURE_STORAGE_ENDPOINT"    = azurerm_storage_account.sa.primary_blob_endpoint
    "STORAGE_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.kv.name};SecretName=STORAGE-CONNECTION-STRING)"
    "POLICY_DOCS_CONTAINER"     = "policy-docs"
    "CUSTOMER_POLICY_CONTAINER" = "customer-policy"
    
    # Key Vault Configuration
    "KEY_VAULT_NAME"            = azurerm_key_vault.kv.name
    "KEY_VAULT_URL"             = azurerm_key_vault.kv.vault_uri
    
    # App Configuration
    "WEBSITE_RUN_FROM_PACKAGE"  = "0"
    "PYTHONPATH"                = "/home/site/wwwroot"
  }

  https_only = true
}

# Give Web App access to Key Vault secrets
resource "azurerm_key_vault_access_policy" "api_kv_policy" {
  key_vault_id = azurerm_key_vault.kv.id
  tenant_id    = var.aad_tenant_id
  object_id    = azurerm_linux_web_app.api.identity[0].principal_id

  secret_permissions = ["Get", "List"]
  depends_on = [azurerm_linux_web_app.api]
}