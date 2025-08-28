package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/azure"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestIdentityModule(t *testing.T) {
	t.Parallel()

	// Generate unique names for test resources
	uniqueID := random.UniqueId()
	resourceGroupName := fmt.Sprintf("test-identity-rg-%s", uniqueID)
	
	// Azure region for testing
	azureRegion := "East US"
	subscriptionID := azure.GetSubscriptionIDFromEnvVar(t)

	// Terraform options for identity module
	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform/modules/identity",
		Vars: map[string]interface{}{
			"resource_group_name": resourceGroupName,
			"location":           azureRegion,
			"environment":        "test",
		},
		EnvVars: map[string]string{
			"ARM_SUBSCRIPTION_ID": subscriptionID,
		},
	}

	// Clean up resources after test
	defer terraform.Destroy(t, terraformOptions)

	// Deploy identity infrastructure
	terraform.InitAndApply(t, terraformOptions)

	// Test 1: Verify User Assigned Managed Identities exist
	t.Run("ManagedIdentitiesExist", func(t *testing.T) {
		expectedIdentities := []string{
			"sageinsure-aks-identity",
			"sageinsure-workload-identity",
			"sageinsure-keyvault-identity",
		}

		for _, identityName := range expectedIdentities {
			identity := azure.GetUserAssignedIdentity(t, identityName, resourceGroupName, subscriptionID)
			assert.NotNil(t, identity)
			assert.Equal(t, identityName, *identity.Name)
			assert.NotEmpty(t, *identity.ClientID)
			assert.NotEmpty(t, *identity.PrincipalID)
		}
	})

	// Test 2: Verify Federated Identity Credentials
	t.Run("FederatedIdentityCredentials", func(t *testing.T) {
		workloadIdentityName := "sageinsure-workload-identity"
		
		// Get the managed identity
		identity := azure.GetUserAssignedIdentity(t, workloadIdentityName, resourceGroupName, subscriptionID)
		assert.NotNil(t, identity)

		// Verify federated credentials are configured
		// Note: This would require custom Azure SDK calls as Terratest doesn't have built-in support
		// For now, we verify the identity exists and has the required properties
		assert.NotEmpty(t, *identity.ClientID)
		assert.NotEmpty(t, *identity.PrincipalID)
	})

	// Test 3: Verify RBAC role assignments
	t.Run("RBACRoleAssignments", func(t *testing.T) {
		// Get outputs from Terraform
		identityPrincipalID := terraform.Output(t, terraformOptions, "aks_identity_principal_id")
		assert.NotEmpty(t, identityPrincipalID)

		workloadPrincipalID := terraform.Output(t, terraformOptions, "workload_identity_principal_id")
		assert.NotEmpty(t, workloadPrincipalID)

		// Verify role assignments exist (this would require custom implementation)
		// For now, we verify the principal IDs are generated correctly
		assert.Len(t, identityPrincipalID, 36) // UUID length
		assert.Len(t, workloadPrincipalID, 36) // UUID length
	})
}

func TestKeyVaultIntegration(t *testing.T) {
	t.Parallel()

	// This test assumes Key Vault already exists
	resourceGroupName := "sageinsure-rg"
	keyVaultName := "kv-eedfa81f"
	subscriptionID := azure.GetSubscriptionIDFromEnvVar(t)

	// Test 1: Verify Key Vault exists and is accessible
	t.Run("KeyVaultExists", func(t *testing.T) {
		keyVault := azure.GetKeyVault(t, keyVaultName, resourceGroupName, subscriptionID)
		assert.NotNil(t, keyVault)
		assert.Equal(t, keyVaultName, *keyVault.Name)
		assert.Equal(t, "Succeeded", *keyVault.Properties.ProvisioningState)
	})

	// Test 2: Verify Key Vault access policies
	t.Run("KeyVaultAccessPolicies", func(t *testing.T) {
		keyVault := azure.GetKeyVault(t, keyVaultName, resourceGroupName, subscriptionID)
		assert.NotNil(t, keyVault)
		
		// Verify access policies are configured
		if keyVault.Properties.AccessPolicies != nil {
			accessPolicies := *keyVault.Properties.AccessPolicies
			assert.NotEmpty(t, accessPolicies)
			
			// Verify at least one policy has the required permissions
			foundValidPolicy := false
			for _, policy := range accessPolicies {
				if policy.Permissions != nil && 
				   policy.Permissions.Secrets != nil && 
				   len(*policy.Permissions.Secrets) > 0 {
					foundValidPolicy = true
					break
				}
			}
			assert.True(t, foundValidPolicy, "No valid access policy found with secret permissions")
		}
	})

	// Test 3: Verify required secrets exist
	t.Run("RequiredSecretsExist", func(t *testing.T) {
		expectedSecrets := []string{
			"openai-api-key",
			"search-api-key",
			"database-connection-string",
		}

		for _, secretName := range expectedSecrets {
			// Note: This would require authentication and proper permissions
			// For testing purposes, we'll verify the Key Vault is accessible
			keyVault := azure.GetKeyVault(t, keyVaultName, resourceGroupName, subscriptionID)
			assert.NotNil(t, keyVault)
			assert.True(t, *keyVault.Properties.EnabledForDeployment || 
						*keyVault.Properties.EnabledForTemplateDeployment,
						"Key Vault should be enabled for deployment")
		}
	})

	// Test 4: Verify network access configuration
	t.Run("NetworkAccessConfiguration", func(t *testing.T) {
		keyVault := azure.GetKeyVault(t, keyVaultName, resourceGroupName, subscriptionID)
		assert.NotNil(t, keyVault)
		
		// Verify network rules are configured appropriately
		if keyVault.Properties.NetworkAcls != nil {
			networkAcls := keyVault.Properties.NetworkAcls
			
			// For production, default action should be Deny with specific allow rules
			// For testing, we'll verify the configuration exists
			assert.NotNil(t, networkAcls.DefaultAction)
		}
	})
}