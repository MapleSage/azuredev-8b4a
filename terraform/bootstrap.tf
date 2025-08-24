# Bootstrap script to seed storage with sample policy documents
resource "azurerm_storage_blob" "sample_marine_policy" {
  name                   = "marine-policy-template.json"
  storage_account_name   = azurerm_storage_account.sa.name
  storage_container_name = azurerm_storage_container.policy_docs.name
  type                   = "Block"
  source_content         = jsonencode({
    "id": "marine-001",
    "title": "Marine Insurance Policy Template",
    "category": "Marine",
    "effectiveDate": "2024-01-01T00:00:00Z",
    "content": "This marine insurance policy covers vessels, cargo, and marine liabilities. Coverage includes hull damage, machinery breakdown, collision liability, and cargo loss or damage during transit. Policy limits apply based on vessel value and cargo type. Deductibles vary by coverage type.",
    "coverageTypes": ["Hull", "Machinery", "Cargo", "Liability"],
    "policyLimits": {
      "hull": "$5,000,000",
      "cargo": "$2,000,000",
      "liability": "$10,000,000"
    }
  })
}

resource "azurerm_storage_blob" "sample_auto_policy" {
  name                   = "auto-policy-template.json"
  storage_account_name   = azurerm_storage_account.sa.name
  storage_container_name = azurerm_storage_container.policy_docs.name
  type                   = "Block"
  source_content         = jsonencode({
    "id": "auto-001",
    "title": "Auto Insurance Policy Template",
    "category": "Auto",
    "effectiveDate": "2024-01-01T00:00:00Z",
    "content": "Comprehensive auto insurance policy covering liability, collision, comprehensive, and uninsured motorist protection. Includes coverage for bodily injury, property damage, medical payments, and rental car reimbursement. Deductibles and limits vary by coverage selection.",
    "coverageTypes": ["Liability", "Collision", "Comprehensive", "Uninsured Motorist"],
    "policyLimits": {
      "liability": "$500,000",
      "collision": "$50,000",
      "comprehensive": "$50,000"
    }
  })
}

resource "azurerm_storage_blob" "sample_property_policy" {
  name                   = "property-policy-template.json"
  storage_account_name   = azurerm_storage_account.sa.name
  storage_container_name = azurerm_storage_container.policy_docs.name
  type                   = "Block"
  source_content         = jsonencode({
    "id": "property-001",
    "title": "Property Insurance Policy Template",
    "category": "Property",
    "effectiveDate": "2024-01-01T00:00:00Z",
    "content": "Property insurance covering residential and commercial buildings, contents, and business interruption. Protection against fire, theft, vandalism, natural disasters, and liability claims. Coverage includes replacement cost for buildings and personal property.",
    "coverageTypes": ["Building", "Contents", "Liability", "Business Interruption"],
    "policyLimits": {
      "building": "$1,000,000",
      "contents": "$500,000",
      "liability": "$2,000,000"
    }
  })
}