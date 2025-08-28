package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/azure"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

func TestNetworkInfrastructure(t *testing.T) {
	t.Parallel()

	// Generate unique names for test resources
	uniqueID := random.UniqueId()
	resourceGroupName := fmt.Sprintf("test-network-rg-%s", uniqueID)
	vnetName := fmt.Sprintf("test-sageinsure-vnet-%s", uniqueID)
	
	// Azure region for testing
	azureRegion := "East US"
	subscriptionID := azure.GetSubscriptionIDFromEnvVar(t)

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
		vnet := azure.GetVirtualNetwork(t, vnetName, resourceGroupName, subscriptionID)
		assert.NotNil(t, vnet)
		assert.Equal(t, vnetName, *vnet.Name)
		assert.Equal(t, "Succeeded", *vnet.ProvisioningState)
	})

	// Test 2: Verify subnets are created correctly
	t.Run("SubnetsConfigured", func(t *testing.T) {
		expectedSubnets := []string{
			"aks-nodes-subnet",
			"aks-pods-subnet", 
			"application-gateway-subnet",
		}

		for _, subnetName := range expectedSubnets {
			subnet := azure.GetSubnet(t, subnetName, vnetName, resourceGroupName, subscriptionID)
			assert.NotNil(t, subnet)
			assert.Equal(t, subnetName, *subnet.Name)
			assert.Equal(t, "Succeeded", *subnet.ProvisioningState)
		}
	})

	// Test 3: Verify Network Security Groups
	t.Run("NetworkSecurityGroups", func(t *testing.T) {
		expectedNSGs := []string{
			fmt.Sprintf("%s-aks-nsg", vnetName),
			fmt.Sprintf("%s-appgw-nsg", vnetName),
		}

		for _, nsgName := range expectedNSGs {
			nsg := azure.GetNetworkSecurityGroup(t, nsgName, resourceGroupName, subscriptionID)
			assert.NotNil(t, nsg)
			assert.Equal(t, nsgName, *nsg.Name)
			assert.Equal(t, "Succeeded", *nsg.ProvisioningState)
		}
	})

	// Test 4: Verify Route Tables
	t.Run("RouteTables", func(t *testing.T) {
		routeTableName := fmt.Sprintf("%s-aks-rt", vnetName)
		routeTable := azure.GetRouteTable(t, routeTableName, resourceGroupName, subscriptionID)
		assert.NotNil(t, routeTable)
		assert.Equal(t, routeTableName, *routeTable.Name)
		assert.Equal(t, "Succeeded", *routeTable.ProvisioningState)
	})

	// Test 5: Verify Private DNS Zones
	t.Run("PrivateDNSZones", func(t *testing.T) {
		expectedZones := []string{
			"privatelink.azurecr.io",
			"privatelink.vaultcore.azure.net",
			"privatelink.openai.azure.com",
		}

		for _, zoneName := range expectedZones {
			zone := azure.GetPrivateDNSZone(t, zoneName, resourceGroupName, subscriptionID)
			assert.NotNil(t, zone)
			assert.Equal(t, zoneName, *zone.Name)
			assert.Equal(t, "Succeeded", *zone.ProvisioningState)
		}
	})
}

func TestNetworkConnectivity(t *testing.T) {
	t.Parallel()

	// This test assumes infrastructure is already deployed
	resourceGroupName := "sageinsure-rg"
	vnetName := "sageinsure-vnet"
	subscriptionID := azure.GetSubscriptionIDFromEnvVar(t)

	// Test 1: Verify VNet peering (if applicable)
	t.Run("VNetPeering", func(t *testing.T) {
		vnet := azure.GetVirtualNetwork(t, vnetName, resourceGroupName, subscriptionID)
		assert.NotNil(t, vnet)
		
		// Check if peering is configured correctly
		if vnet.VirtualNetworkPeerings != nil && len(*vnet.VirtualNetworkPeerings) > 0 {
			for _, peering := range *vnet.VirtualNetworkPeerings {
				assert.Equal(t, "Connected", *peering.PeeringState)
				assert.Equal(t, "Succeeded", *peering.ProvisioningState)
			}
		}
	})

	// Test 2: Verify subnet IP ranges don't overlap
	t.Run("SubnetIPRanges", func(t *testing.T) {
		subnets := azure.GetSubnetsInVirtualNetwork(t, vnetName, resourceGroupName, subscriptionID)
		assert.NotEmpty(t, subnets)

		// Collect all address prefixes
		addressPrefixes := make([]string, 0)
		for _, subnet := range subnets {
			if subnet.AddressPrefix != nil {
				addressPrefixes = append(addressPrefixes, *subnet.AddressPrefix)
			}
		}

		// Verify we have expected number of subnets
		assert.GreaterOrEqual(t, len(addressPrefixes), 3)
		
		// Basic validation that prefixes are different
		uniquePrefixes := make(map[string]bool)
		for _, prefix := range addressPrefixes {
			assert.False(t, uniquePrefixes[prefix], fmt.Sprintf("Duplicate subnet prefix found: %s", prefix))
			uniquePrefixes[prefix] = true
		}
	})
}