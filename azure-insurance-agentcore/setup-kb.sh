#!/bin/bash

# Setup Azure Knowledge Base with insurance documents
echo "📚 Setting up Azure Knowledge Base..."

# Create Cognitive Search index
az search index create \
  --service-name sageinsure-search \
  --name insurance-kb \
  --body '{
    "fields": [
      {"name": "id", "type": "Edm.String", "key": true},
      {"name": "content", "type": "Edm.String", "searchable": true},
      {"name": "title", "type": "Edm.String", "searchable": true},
      {"name": "metadata", "type": "Edm.String"}
    ]
  }'

# Upload sample insurance documents
az search index data import \
  --service-name sageinsure-search \
  --index-name insurance-kb \
  --data-source '{
    "value": [
      {
        "id": "1",
        "content": "Comprehensive auto insurance covers collision, theft, vandalism, weather damage, and fire damage to your vehicle.",
        "title": "Auto Insurance Coverage",
        "metadata": "auto"
      },
      {
        "id": "2", 
        "content": "Homeowners insurance covers dwelling, personal property, liability, and additional living expenses.",
        "title": "Home Insurance Coverage",
        "metadata": "home"
      }
    ]
  }'

echo "✅ Knowledge Base configured!"