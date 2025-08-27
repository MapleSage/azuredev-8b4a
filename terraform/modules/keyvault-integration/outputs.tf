# Key Vault Integration Module Outputs

output "key_vault_csi_access_policy_id" {
  description = "ID of the Key Vault access policy for AKS CSI driver"
  value       = azurerm_key_vault_access_policy.aks_cluster_csi_policy.id
}

output "workload_identity_access_policy_id" {
  description = "ID of the Key Vault access policy for workload identity"
  value       = azurerm_key_vault_access_policy.aks_workload_policy.id
}

output "workload_identity_client_id_secret_name" {
  description = "Name of the secret containing workload identity client ID"
  value       = azurerm_key_vault_secret.workload_identity_client_id.name
}

output "key_vault_name_secret_name" {
  description = "Name of the secret containing Key Vault name"
  value       = azurerm_key_vault_secret.key_vault_name.name
}