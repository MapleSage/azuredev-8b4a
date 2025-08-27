# AKS Module - Azure Kubernetes Service Cluster

# AKS Cluster
resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.dns_prefix
  kubernetes_version  = var.kubernetes_version

  # System node pool
  default_node_pool {
    name                = "system"
    node_count          = var.system_node_pool.node_count
    vm_size             = var.system_node_pool.vm_size
    vnet_subnet_id      = var.vnet_subnet_id
    enable_auto_scaling = true
    min_count           = var.system_node_pool.min_count
    max_count           = var.system_node_pool.max_count
    os_disk_size_gb     = 30
    os_disk_type        = "Managed"
    
    node_labels = {
      "role" = "system"
    }
  }

  # Cluster identity
  identity {
    type         = "UserAssigned"
    identity_ids = [var.cluster_identity_id]
  }

  # Azure AD integration
  azure_active_directory_role_based_access_control {
    managed                = true
    tenant_id              = var.aad_tenant_id
    azure_rbac_enabled     = true
  }

  # Network configuration
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    dns_service_ip    = "10.1.0.10"
    service_cidr      = "10.1.0.0/16"
    load_balancer_sku = "standard"
  }

  # Enable workload identity
  workload_identity_enabled = true
  oidc_issuer_enabled       = true

  # Auto-scaler profile
  auto_scaler_profile {
    balance_similar_node_groups      = false
    expander                        = "random"
    max_graceful_termination_sec    = "600"
    max_node_provisioning_time      = "15m"
    max_unready_nodes               = 3
    max_unready_percentage          = 45
    new_pod_scale_up_delay          = "10s"
    scale_down_delay_after_add      = "10m"
    scale_down_delay_after_delete   = "10s"
    scale_down_delay_after_failure  = "3m"
    scan_interval                   = "10s"
    scale_down_unneeded             = "10m"
    scale_down_unready              = "20m"
    scale_down_utilization_threshold = "0.5"
  }

  # Add-ons
  azure_policy_enabled = true
  
  # Key Vault Secrets Provider
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  tags = var.tags
}

# General workload node pool
resource "azurerm_kubernetes_cluster_node_pool" "general" {
  name                  = "general"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.general_node_pool.vm_size
  vnet_subnet_id        = var.vnet_subnet_id
  enable_auto_scaling   = true
  min_count             = var.general_node_pool.min_count
  max_count             = var.general_node_pool.max_count
  os_disk_size_gb       = 50
  os_disk_type          = "Managed"

  node_labels = {
    "role" = "general"
  }

  tags = var.tags
}

# GPU node pool (optional)
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  count = var.gpu_node_pool.enabled ? 1 : 0

  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = var.gpu_node_pool.vm_size
  vnet_subnet_id        = var.vnet_subnet_id
  enable_auto_scaling   = true
  min_count             = var.gpu_node_pool.min_count
  max_count             = var.gpu_node_pool.max_count
  os_disk_size_gb       = 100
  os_disk_type          = "Managed"

  node_labels = {
    "role"                     = "gpu"
    "kubernetes.azure.com/scalesetpriority" = "spot"
  }

  node_taints = [
    "sku=gpu:NoSchedule"
  ]

  tags = var.tags
}