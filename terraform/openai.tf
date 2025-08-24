# Azure OpenAI account
resource "azurerm_cognitive_account" "openai" {
  name                = var.openai_account_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "OpenAI"
  sku_name            = "S0"

  public_network_access_enabled = true
  local_auth_enabled            = true
}

# Model deployment via AzAPI (gpt-4o) — disable schema validation
resource "azapi_resource" "openai_deployment" {
  type                      = "Microsoft.CognitiveServices/accounts/deployments@2024-06-01-preview"
  name                      = var.openai_deployment_name
  parent_id                 = azurerm_cognitive_account.openai.id
  schema_validation_enabled = false
  depends_on                = [azurerm_cognitive_account.openai]

  body = jsonencode({
    sku = {
      name     = "Standard"
      capacity = 10
    }
    properties = {
      model = {
        format  = "OpenAI"
        name    = "gpt-4o"
        version = "2024-05-13"
      }
      raiPolicyName = "Microsoft.Default"
    }
  })
}