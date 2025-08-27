# Identity Module Outputs

output "aks_workload_identity_id" {
  description = "ID of the AKS workload managed identity"
  value       = azurerm_user_assigned_identity.aks_workload_identity.id
}

output "aks_workload_identity_client_id" {
  description = "Client ID of the AKS workload managed identity"
  value       = azurerm_user_assigned_identity.aks_workload_identity.client_id
}

output "aks_workload_identity_principal_id" {
  description = "Principal ID of the AKS workload managed identity"
  value       = azurerm_user_assigned_identity.aks_workload_identity.principal_id
}

output "aks_cluster_identity_id" {
  description = "ID of the AKS cluster managed identity"
  value       = azurerm_user_assigned_identity.aks_cluster_identity.id
}

output "aks_cluster_identity_client_id" {
  description = "Client ID of the AKS cluster managed identity"
  value       = azurerm_user_assigned_identity.aks_cluster_identity.client_id
}

output "aks_cluster_identity_principal_id" {
  description = "Principal ID of the AKS cluster managed identity"
  value       = azurerm_user_assigned_identity.aks_cluster_identity.principal_id
}