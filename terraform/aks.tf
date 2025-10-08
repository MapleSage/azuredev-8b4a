# AKS Infrastructure Configuration
# This file orchestrates the AKS deployment using modular components

# Reference the resources being created in main.tf
# No data sources needed since we're creating everything

# Local values for common tags
locals {
  common_tags = {
    Environment = "production"
    Project     = "sageinsure"
    ManagedBy   = "terraform"
    Component   = "aks-migration"
  }
}

# Network module
module "network" {
  source = "./modules/network"

  resource_group_name = azurerm_resource_group.rg.name
  location           = azurerm_resource_group.rg.location
  
  vnet_name                              = "sageinsure-vnet"
  vnet_address_space                     = ["10.0.0.0/16"]
  aks_subnet_name                        = "aks-subnet"
  aks_subnet_address_prefix              = "10.0.1.0/24"
  appgw_subnet_name                      = "appgw-subnet"
  appgw_subnet_address_prefix            = "10.0.2.0/24"
  private_endpoint_subnet_name           = "private-endpoint-subnet"
  private_endpoint_subnet_address_prefix = "10.0.3.0/24"

  tags = local.common_tags
}

# Identity module
module "identity" {
  source = "./modules/identity"

  resource_group_name = azurerm_resource_group.rg.name
  location           = azurerm_resource_group.rg.location
  aks_cluster_name   = "sageinsure-aks"
  
  key_vault_id       = azurerm_key_vault.kv.id
  storage_account_id = azurerm_storage_account.sa.id
  openai_account_id  = azurerm_cognitive_account.openai.id
  search_service_id  = azurerm_search_service.search.id

  tags = local.common_tags
}

# Key Vault integration module
module "keyvault_integration" {
  source = "./modules/keyvault-integration"

  key_vault_id                         = azurerm_key_vault.kv.id
  key_vault_name                       = azurerm_key_vault.kv.name
  resource_group_name                  = azurerm_resource_group.rg.name
  location                            = azurerm_resource_group.rg.location
  aks_cluster_identity_principal_id    = module.identity.aks_cluster_identity_principal_id
  aks_workload_identity_principal_id   = module.identity.aks_workload_identity_principal_id
  aks_workload_identity_client_id      = module.identity.aks_workload_identity_client_id
  aad_tenant_id                       = var.aad_tenant_id

  tags = local.common_tags

  depends_on = [
    module.identity
  ]
}

# AKS module
module "aks" {
  source = "./modules/aks"

  resource_group_name = azurerm_resource_group.rg.name
  location           = azurerm_resource_group.rg.location
  cluster_name       = "sageinsure-aks"
  dns_prefix         = "sageinsure"
  kubernetes_version = "1.30.6"
  
  vnet_subnet_id              = module.network.aks_subnet_id
  cluster_identity_id         = module.identity.aks_cluster_identity_id
  workload_identity_client_id = module.identity.aks_workload_identity_client_id
  aad_tenant_id              = var.aad_tenant_id

  # Node pool configurations
  system_node_pool = {
    vm_size    = "Standard_D2s_v3"
    min_count  = 1
    max_count  = 3
    node_count = 1
  }

  general_node_pool = {
    vm_size   = "Standard_D4s_v3"
    min_count = 2
    max_count = 6
  }

  gpu_node_pool = {
    vm_size   = "Standard_NC6s_v3"
    min_count = 0
    max_count = 2
    enabled   = false  # Set to true if GPU workloads are needed
  }

  tags = local.common_tags

  depends_on = [
    module.network,
    module.identity,
    module.keyvault_integration
  ]
}

# Azure Services Integration module
module "azure_services_integration" {
  source = "./modules/azure-services-integration"

  resource_group_name        = azurerm_resource_group.rg.name
  location                  = azurerm_resource_group.rg.location
  private_endpoint_subnet_id = module.network.private_endpoint_subnet_id
  vnet_id                   = module.network.vnet_id
  
  openai_account_id   = azurerm_cognitive_account.openai.id
  search_service_id   = azurerm_search_service.search.id
  storage_account_id  = azurerm_storage_account.sa.id
  key_vault_id        = azurerm_key_vault.kv.id
  
  private_dns_zones = module.network.private_dns_zones

  tags = local.common_tags

  depends_on = [
    module.network,
    module.aks
  ]
}

# Platform add-ons module
module "platform_addons" {
  source = "./modules/platform-addons"

  cluster_name           = module.aks.cluster_name
  cluster_endpoint       = module.aks.cluster_endpoint
  cluster_ca_certificate = module.aks.cluster_ca_certificate
  resource_group_name    = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  key_vault_id          = azurerm_key_vault.kv.id
  
  # Configure for production use
  acme_email            = "admin@sageinsure.com"  # Replace with actual email
  dns_zone_name         = ""  # Add if you have a custom domain
  ingress_class_name    = "nginx"
  
  enable_cert_manager   = true
  enable_nginx_ingress  = true

  tags = local.common_tags

  depends_on = [
    module.aks,
    module.azure_services_integration
  ]
}