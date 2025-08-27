# Identity Module - Managed Identities and RBAC for AKS

# User Assigned Managed Identity for AKS workloads
resource "azurerm_user_assigned_identity" "aks_workload_identity" {
  name                = "${var.aks_cluster_name}-workload-identity"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# User Assigned Managed Identity for AKS cluster
resource "azurerm_user_assigned_identity" "aks_cluster_identity" {
  name                = "${var.aks_cluster_name}-cluster-identity"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# RBAC: Grant Key Vault Secrets User role to workload identity
resource "azurerm_role_assignment" "workload_keyvault_secrets_user" {
  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

# RBAC: Grant Storage Blob Data Contributor role to workload identity
resource "azurerm_role_assignment" "workload_storage_blob_contributor" {
  scope                = var.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

# RBAC: Grant Cognitive Services OpenAI User role to workload identity
resource "azurerm_role_assignment" "workload_openai_user" {
  scope                = var.openai_account_id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

# RBAC: Grant Search Index Data Contributor role to workload identity
resource "azurerm_role_assignment" "workload_search_contributor" {
  scope                = var.search_service_id
  role_definition_name = "Search Index Data Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

# RBAC: Grant Search Service Contributor role to workload identity
resource "azurerm_role_assignment" "workload_search_service_contributor" {
  scope                = var.search_service_id
  role_definition_name = "Search Service Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# RBAC: Grant Network Contributor role to cluster identity for subnet operations
data "azurerm_resource_group" "rg" {
  name = var.resource_group_name
}

resource "azurerm_role_assignment" "cluster_network_contributor" {
  scope                = data.azurerm_resource_group.rg.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_cluster_identity.principal_id
}