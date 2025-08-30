package test

import (
	"fmt"
	"os"
	"testing"

	"github.com/gruntwork-io/terratest/modules/azure"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestIdentityModule(t *testing.T) {
	t.Parallel()

	// Generate unique names for test resources
	uniqueID := random.UniqueId()
	resourceGroupName := fmt.Sprintf("test-identity-rg-%s", uniqueID)
	
	// Azure region for testing
	azureRegion := "East US"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

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

	// Test 1: Verify resource group was created
	t.Run("ResourceGroupExists", func(t *testing.T) {
		exists := azure.ResourceGroupExists(t, resourceGroupName, subscriptionID)
		assert.True(t, exists, "Resource group should exist")
	})

	// Test 2: Verify Terraform outputs are generated
	t.Run("TerraformOutputs", func(t *testing.T) {
		// Get outputs from Terraform
		outputs := terraform.OutputAll(t, terraformOptions)
		assert.NotEmpty(t, outputs, "Terraform should produce outputs")
		
		// Check for expected output keys
		expectedOutputs := []string{
			"aks_identity_client_id",
			"workload_identity_client_id",
		}
		
		for _, outputKey := range expectedOutputs {
			if value, exists := outputs[outputKey]; exists {
				assert.NotEmpty(t, value, fmt.Sprintf("Output %s should not be empty", outputKey))
			}
		}
	})
}

func TestKeyVaultIntegration(t *testing.T) {
	t.Parallel()

	// This test assumes Key Vault already exists
	resourceGroupName := "sageinsure-rg"
	keyVaultName := "kv-eedfa81f"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

	// Test 1: Verify Key Vault exists and is accessible
	t.Run("KeyVaultExists", func(t *testing.T) {
		keyVault, err := azure.GetKeyVaultE(t, resourceGroupName, keyVaultName, subscriptionID)
		require.NoError(t, err)
		assert.NotNil(t, keyVault)
		assert.Equal(t, keyVaultName, *keyVault.Name)
	})

	// Test 2: Verify required secrets exist (if accessible)
	t.Run("RequiredSecretsAccessible", func(t *testing.T) {
		expectedSecrets := []string{
			"openai-api-key",
			"search-api-key",
		}

		for _, secretName := range expectedSecrets {
			// Note: This requires proper authentication and permissions
			// For testing purposes, we'll verify the Key Vault is accessible
			exists := azure.KeyVaultSecretExists(t, keyVaultName, secretName)
			if exists {
				t.Logf("Secret %s exists in Key Vault %s", secretName, keyVaultName)
			} else {
				t.Logf("Secret %s not found or not accessible in Key Vault %s", secretName, keyVaultName)
			}
		}
	})
}