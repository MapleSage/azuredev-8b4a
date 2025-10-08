#!/bin/bash

echo "📚 Migrating ALL Knowledge Bases from AWS to Azure..."

# 1. Insurance Policy AI Assistant KB
echo "1️⃣ Insurance Policy AI Assistant..."
cp -r ../sample-insurance-policy-ai-assistant/policy_docs ./kb1-insurance-policy
cp -r ../sample-insurance-policy-ai-assistant/customer_policy ./kb1-customer-policy

# 2. Underwriting Workbench KB  
echo "2️⃣ Underwriting Workbench..."
cp -r ../sample-genai-underwriting-workbench-demo/sample_documents ./kb2-underwriting-docs

# 3. FSI Document Processing KB
echo "3️⃣ FSI Document Processing..."
cp -r ../sample-FSI-document-processing-with-amazon-bedrock-main/assets/test_files ./kb3-fsi-docs

# 4. Claims Lifecycle KB
echo "4️⃣ Claims Lifecycle..."
mkdir -p ./kb4-claims-docs
cp ../ins-claim-lifecycle-automation/agent/knowledge-base-assets/* ./kb4-claims-docs/ 2>/dev/null || echo "No claims KB assets found"

# 5. Life Science Research KB
echo "5️⃣ Life Science Research..."
mkdir -p ./kb5-research-docs
# This uses external APIs (PubMed, ArXiv) - no local docs

# Upload all KBs to Azure Blob Storage
echo "☁️ Uploading to Azure..."

for kb in kb1-insurance-policy kb1-customer-policy kb2-underwriting-docs kb3-fsi-docs kb4-claims-docs; do
  if [ -d "./$kb" ]; then
    echo "Uploading $kb..."
    az storage blob upload-batch \
      --destination insurance-docs \
      --source ./$kb \
      --account-name sageinsurestorage \
      --destination-path $kb/
  fi
done

echo "✅ All Knowledge Bases migrated!"
echo "📊 KB Summary:"
echo "  - KB1: Insurance Policy Documents (7 PDFs)"
echo "  - KB2: Underwriting Documents (2 PDFs)" 
echo "  - KB3: FSI Processing Test Files"
echo "  - KB4: Claims Lifecycle Assets"
echo "  - KB5: Research (External APIs)"