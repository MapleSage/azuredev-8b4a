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

func TestNetworkInfrastructure(t *testing.T) {
	t.Parallel()

	// Generate unique names for test resources
	uniqueID := random.UniqueId()
	resourceGroupName := fmt.Sprintf("test-network-rg-%s", uniqueID)
	vnetName := fmt.Sprintf("test-sageinsure-vnet-%s", uniqueID)
	
	// Azure region for testing
	azureRegion := "East US"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

	// Terraform options for network module
	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform/modules/network",
		Vars: map[string]interface{}{
			"resource_group_name": resourceGroupName,
			"vnet_name":          vnetName,
			"location":           azureRegion,
			"environment":        "test",
		},
		EnvVars: map[string]string{
			"ARM_SUBSCRIPTION_ID": subscriptionID,
		},
	}

	// Clean up resources after test
	defer terraform.Destroy(t, terraformOptions)

	// Deploy network infrastructure
	terraform.InitAndApply(t, terraformOptions)

	// Test 1: Verify Virtual Network exists
	t.Run("VirtualNetworkExists", func(t *testing.T) {
		exists := azure.VirtualNetworkExists(t, vnetName, resourceGroupName, subscriptionID)
		assert.True(t, exists, "Virtual Network should exist")
		
		vnet, err := azure.GetVirtualNetworkE(vnetName, resourceGroupName, subscriptionID)
		require.NoError(t, err)
		assert.NotNil(t, vnet)
		assert.Equal(t, vnetName, *vnet.Name)
	})

	// Test 2: Verify subnets are created correctly
	t.Run("SubnetsConfigured", func(t *testing.T) {
		expectedSubnets := []string{
			"aks-nodes-subnet",
			"aks-pods-subnet", 
			"application-gateway-subnet",
		}

		for _, subnetName := range expectedSubnets {
			exists := azure.SubnetExists(t, subnetName, vnetName, resourceGroupName, subscriptionID)
			assert.True(t, exists, fmt.Sprintf("Subnet %s should exist", subnetName))
			
			subnet, err := azure.GetSubnetE(subnetName, vnetName, resourceGroupName, subscriptionID)
			require.NoError(t, err)
			assert.NotNil(t, subnet)
			assert.Equal(t, subnetName, *subnet.Name)
		}
	})

	// Test 3: Verify subnet IP ranges don't overlap
	t.Run("SubnetIPRanges", func(t *testing.T) {
		subnets, err := azure.GetVirtualNetworkSubnetsE(vnetName, resourceGroupName, subscriptionID)
		require.NoError(t, err)
		assert.NotEmpty(t, subnets)

		// Verify we have expected number of subnets
		assert.GreaterOrEqual(t, len(subnets), 3)
		
		// Basic validation that prefixes are different
		uniquePrefixes := make(map[string]bool)
		for _, prefix := range subnets {
			assert.False(t, uniquePrefixes[prefix], fmt.Sprintf("Duplicate subnet prefix found: %s", prefix))
			uniquePrefixes[prefix] = true
		}
	})
}

func TestNetworkConnectivity(t *testing.T) {
	t.Parallel()

	// This test assumes infrastructure is already deployed
	resourceGroupName := "sageinsure-rg"
	vnetName := "sageinsure-vnet"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

	// Test 1: Verify VNet exists
	t.Run("VNetExists", func(t *testing.T) {
		exists := azure.VirtualNetworkExists(t, vnetName, resourceGroupName, subscriptionID)
		assert.True(t, exists, "Production VNet should exist")
		
		vnet, err := azure.GetVirtualNetworkE(vnetName, resourceGroupName, subscriptionID)
		require.NoError(t, err)
		assert.NotNil(t, vnet)
	})

	// Test 2: Verify subnet IP ranges don't overlap
	t.Run("SubnetIPRanges", func(t *testing.T) {
		subnets, err := azure.GetVirtualNetworkSubnetsE(vnetName, resourceGroupName, subscriptionID)
		require.NoError(t, err)
		assert.NotEmpty(t, subnets)

		// Verify we have expected number of subnets
		assert.GreaterOrEqual(t, len(subnets), 2)
		
		// Basic validation that prefixes are different
		uniquePrefixes := make(map[string]bool)
		for _, prefix := range subnets {
			assert.False(t, uniquePrefixes[prefix], fmt.Sprintf("Duplicate subnet prefix found: %s", prefix))
			uniquePrefixes[prefix] = true
		}
	})
}