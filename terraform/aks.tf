# AKS Infrastructure Configuration
# This file orchestrates the AKS deployment using modular components

# Data sources to reference existing resources
data "azurerm_resource_group" "existing" {
  name = var.resource_group_name
}

data "azurerm_key_vault" "existing" {
  name                = "kv-${random_id.sa.hex}"
  resource_group_name = var.resource_group_name
}

data "azurerm_storage_account" "existing" {
  name                = "${var.storage_account_prefix}${random_id.sa.hex}"
  resource_group_name = var.resource_group_name
}

data "azurerm_cognitive_account" "existing_openai" {
  name                = var.openai_account_name
  resource_group_name = var.resource_group_name
}

data "azurerm_search_service" "existing_search" {
  name                = var.search_service_name
  resource_group_name = var.resource_group_name
}

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

  resource_group_name = data.azurerm_resource_group.existing.name
  location           = data.azurerm_resource_group.existing.location
  
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

  resource_group_name = data.azurerm_resource_group.existing.name
  location           = data.azurerm_resource_group.existing.location
  aks_cluster_name   = "sageinsure-aks"
  
  key_vault_id       = data.azurerm_key_vault.existing.id
  storage_account_id = data.azurerm_storage_account.existing.id
  openai_account_id  = data.azurerm_cognitive_account.existing_openai.id
  search_service_id  = data.azurerm_search_service.existing_search.id

  tags = local.common_tags
}

# Key Vault integration module
module "keyvault_integration" {
  source = "./modules/keyvault-integration"

  key_vault_id                         = data.azurerm_key_vault.existing.id
  key_vault_name                       = data.azurerm_key_vault.existing.name
  resource_group_name                  = data.azurerm_resource_group.existing.name
  location                            = data.azurerm_resource_group.existing.location
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

  resource_group_name = data.azurerm_resource_group.existing.name
  location           = data.azurerm_resource_group.existing.location
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

  resource_group_name        = data.azurerm_resource_group.existing.name
  location                  = data.azurerm_resource_group.existing.location
  private_endpoint_subnet_id = module.network.private_endpoint_subnet_id
  vnet_id                   = module.network.vnet_id
  
  openai_account_id   = data.azurerm_cognitive_account.existing_openai.id
  search_service_id   = data.azurerm_search_service.existing_search.id
  storage_account_id  = data.azurerm_storage_account.existing.id
  key_vault_id        = data.azurerm_key_vault.existing.id
  
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
  resource_group_name    = data.azurerm_resource_group.existing.name
  location              = data.azurerm_resource_group.existing.location
  key_vault_id          = data.azurerm_key_vault.existing.id
  
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