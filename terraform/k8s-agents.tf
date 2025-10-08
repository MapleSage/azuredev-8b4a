# Kubernetes deployment for all SageInsure agents
resource "azurerm_kubernetes_cluster" "sageinsure_aks" {
  name                = "sageinsure-aks"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "sageinsure"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D4s_v3"
    
    upgrade_settings {
      max_surge = "10%"
    }
  }



  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
  }

  tags = {
    Environment = "production"
    Project     = "sageinsure"
  }
}

# GPU node pool for AI workloads
resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpu"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.sageinsure_aks.id
  vm_size              = "Standard_NC6s_v3"
  node_count           = 2
  mode                 = "User"

  tags = {
    Environment = "production"
    Project     = "sageinsure"
  }
}

# Container Registry for agent images
resource "azurerm_container_registry" "sageinsure_acr" {
  name                = "sageinsureacr${random_id.sa.hex}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "Premium"
  admin_enabled       = true

  georeplications {
    location = "West US 2"
  }
}

# Role assignment for AKS to pull from ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.sageinsure_aks.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.sageinsure_acr.id
  skip_service_principal_aad_check = true
}

# Kubernetes namespace for agents
resource "kubernetes_namespace" "sageinsure_agents" {
  metadata {
    name = "sageinsure-agents"
    labels = {
      name = "sageinsure-agents"
    }
  }
  depends_on = [azurerm_kubernetes_cluster.sageinsure_aks]
}

# Secret for Azure OpenAI
resource "kubernetes_secret" "azure_openai" {
  metadata {
    name      = "azure-openai-secret"
    namespace = kubernetes_namespace.sageinsure_agents.metadata[0].name
  }

  data = {
    endpoint = azurerm_cognitive_account.openai.endpoint
    key      = azurerm_cognitive_account.openai.primary_access_key
  }

  type = "Opaque"
}

# Secret for Azure Search
resource "kubernetes_secret" "azure_search" {
  metadata {
    name      = "azure-search-secret"
    namespace = kubernetes_namespace.sageinsure_agents.metadata[0].name
  }

  data = {
    endpoint = "https://${azurerm_search_service.search.name}.search.windows.net"
    key      = azurerm_search_service.search.primary_key
  }

  type = "Opaque"
}

# ConfigMap for agent configuration
resource "kubernetes_config_map" "agent_config" {
  metadata {
    name      = "agent-config"
    namespace = kubernetes_namespace.sageinsure_agents.metadata[0].name
  }

  data = {
    "models.json" = jsonencode({
      available_models = [
        { id = "gpt-5", name = "GPT-5 (Preview)", deployment = "gpt5-deployment" },
        { id = "gpt-4o", name = "GPT-4o", deployment = "gpt4o-deployment" },
        { id = "gpt-4-turbo", name = "GPT-4 Turbo", deployment = "gpt4-turbo-deployment" },
        { id = "gpt-4", name = "GPT-4", deployment = "gpt4-deployment" },
        { id = "gpt-3.5-turbo", name = "GPT-3.5 Turbo", deployment = "gpt35-turbo-deployment" },
        { id = "gpt-4o-mini", name = "GPT-4o Mini", deployment = "gpt4o-mini-deployment" }
      ]
      mcp_servers = [
        { id = "arxiv", endpoint = "http://mcp-arxiv:8080" },
        { id = "pubmed", endpoint = "http://mcp-pubmed:8080" },
        { id = "clinicaltrial", endpoint = "http://mcp-clinicaltrial:8080" },
        { id = "chembl", endpoint = "http://mcp-chembl:8080" },
        { id = "tavily", endpoint = "http://mcp-tavily:8080" },
        { id = "weather", endpoint = "http://mcp-weather:8080" },
        { id = "calculator", endpoint = "http://mcp-calculator:8080" },
        { id = "memory", endpoint = "http://mcp-memory:8080" }
      ]
    })
  }
}

# Outputs
output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.sageinsure_aks.name
}

output "acr_login_server" {
  value = azurerm_container_registry.sageinsure_acr.login_server
}