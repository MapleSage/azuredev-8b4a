resource_group_name   = "sageinsure-rg"
location              = "East US"

aad_tenant_id         = "e9394f90-446d-41dd-8c8c-98ac08c5f090" # <- your Default Directory tenant

app_display_name      = "SageInsurePolicyApp"

openai_account_name   = "sageinsure-openai"
openai_deployment_name= "gpt4o-deployment"

search_service_name   = "sageinsure-search"

storage_account_prefix= "policydocs"
api_app_name          = "sageinsure-api"
api_runtime_stack     = "PYTHON|3.11"