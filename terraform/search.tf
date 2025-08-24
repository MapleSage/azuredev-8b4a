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

# Search index via null_resource with REST API call
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


# Semantic configuration via REST API
resource "null_resource" "policy_semantic_config" {
  depends_on = [null_resource.policy_index]
  
  provisioner "local-exec" {
    command = <<-EOT
      sleep 10  # Wait for index creation
      curl -X PUT "https://${azurerm_search_service.search.name}.search.windows.net/indexes/policy-index?api-version=2023-11-01" \
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
          ],
          "semantic": {
            "configurations": [{
              "name": "semantic-config",
              "prioritizedFields": {
                "titleField": {"fieldName": "title"},
                "prioritizedContentFields": [{"fieldName": "content"}],
                "prioritizedKeywordsFields": [{"fieldName": "category"}]
              }
            }]
          }
        }'
    EOT
  }
}