# Key Vault Integration Module - CSI Driver and AKS Integration

# Additional access policy for AKS cluster identity (for CSI driver)
resource "azurerm_key_vault_access_policy" "aks_cluster_csi_policy" {
  key_vault_id = var.key_vault_id
  tenant_id    = var.aad_tenant_id
  object_id    = var.aks_cluster_identity_principal_id

  secret_permissions = [
    "Get",
    "List"
  ]

  certificate_permissions = [
    "Get",
    "List"
  ]

  key_permissions = [
    "Get",
    "List"
  ]
}

# Access policy for AKS workload identity (for application pods)
resource "azurerm_key_vault_access_policy" "aks_workload_policy" {
  key_vault_id = var.key_vault_id
  tenant_id    = var.aad_tenant_id
  object_id    = var.aks_workload_identity_principal_id

  secret_permissions = [
    "Get",
    "List"
  ]

  certificate_permissions = [
    "Get",
    "List"
  ]
}

# Create additional secrets needed for AKS workloads
resource "azurerm_key_vault_secret" "workload_identity_client_id" {
  name         = "WORKLOAD-IDENTITY-CLIENT-ID"
  value        = var.aks_workload_identity_client_id
  key_vault_id = var.key_vault_id

  tags = var.tags

  depends_on = [
    azurerm_key_vault_access_policy.aks_cluster_csi_policy,
    azurerm_key_vault_access_policy.aks_workload_policy
  ]
}

# Create a secret for the Key Vault name (useful for applications)
resource "azurerm_key_vault_secret" "key_vault_name" {
  name         = "KEY-VAULT-NAME"
  value        = var.key_vault_name
  key_vault_id = var.key_vault_id

  tags = var.tags

  depends_on = [
    azurerm_key_vault_access_policy.aks_cluster_csi_policy,
    azurerm_key_vault_access_policy.aks_workload_policy
  ]
}

# Data source to get current client configuration
data "azurerm_client_config" "current" {}

# Note: Current user access policy already exists from original deployment