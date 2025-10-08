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

# Azure OpenAI
resource "azurerm_cognitive_account" "openai" {
  name                = var.openai_account_name
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  kind                = "OpenAI"
  sku_name            = "S0"
  
  custom_subdomain_name         = var.openai_account_name
  public_network_access_enabled = true
  local_auth_enabled            = true
}

# OpenAI GPT-4o deployment
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

# Storage Account
resource "azurerm_storage_account" "sa" {
  name                     = "${var.storage_account_prefix}${random_id.sa.hex}"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  blob_properties {
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "HEAD", "POST", "PUT"]
      allowed_origins    = ["*"]
      exposed_headers    = ["*"]
      max_age_in_seconds = 3600
    }
  }
}

# Storage Container
resource "azurerm_storage_container" "policy_docs" {
  name                  = "policy-docs"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "private"
}

# Search Service
resource "azurerm_search_service" "search" {
  name                           = var.search_service_name
  resource_group_name            = azurerm_resource_group.rg.name
  location                       = azurerm_resource_group.rg.location
  sku                            = "standard"
  replica_count                  = 1
  partition_count                = 1
  public_network_access_enabled  = true
  local_authentication_enabled   = true
}

# Search index creation
resource "null_resource" "policy_index" {
  depends_on = [azurerm_search_service.search]
  
  provisioner "local-exec" {
    command = <<-EOT
      curl -X POST "https://${azurerm_search_service.search.name}.search.windows.net/indexes?api-version=2023-11-01" \
        -H "Content-Type: application/json" \
        -H "api-key: ${azurerm_search_service.search.primary_key}" \
        -d '{
          "name": "policy-index",
          "fields": [
            {"name": "id", "type": "Edm.String", "key": true, "filterable": true, "sortable": true},
            {"name": "title", "type": "Edm.String", "searchable": true, "sortable": true},
            {"name": "content", "type": "Edm.String", "searchable": true},
            {"name": "category", "type": "Edm.String", "filterable": true, "facetable": true},
            {"name": "effectiveDate", "type": "Edm.DateTimeOffset", "filterable": true, "sortable": true}
          ]
        }'
    EOT
  }
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "sageinsure-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "sageinsure"

  default_node_pool {
    name       = "default"
    node_count = 2
    vm_size    = "Standard_D2_v2"
  }

  identity {
    type = "SystemAssigned"
  }
}

data "azuread_client_config" "current" {}
# Outputs
output "resource_group_name" {
  value = azurerm_resource_group.rg.name
}

output "openai_endpoint" {
  value = azurerm_cognitive_account.openai.endpoint
}

output "openai_deployment_name" {
  value = azapi_resource.openai_deployment.name
}

output "search_endpoint" {
  value = "https://${azurerm_search_service.search.name}.search.windows.net"
}

output "search_primary_key" {
  value = azurerm_search_service.search.primary_key
  sensitive = true
}

output "storage_account_name" {
  value = azurerm_storage_account.sa.name
}

output "storage_account_key" {
  value = azurerm_storage_account.sa.primary_access_key
  sensitive = true
}

output "key_vault_name" {
  value = azurerm_key_vault.kv.name
}

