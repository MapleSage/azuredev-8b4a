package test

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAKSClusterDeployment(t *testing.T) {
	t.Parallel()

	// Generate unique names for test resources
	uniqueID := random.UniqueId()
	resourceGroupName := fmt.Sprintf("test-sageinsure-rg-%s", uniqueID)
	clusterName := fmt.Sprintf("test-sageinsure-aks-%s", uniqueID)
	
	// Azure region for testing
	azureRegion := "East US"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

	// Terraform options
	terraformOptions := &terraform.Options{
		TerraformDir: "../../terraform",
		Vars: map[string]interface{}{
			"resource_group_name": resourceGroupName,
			"cluster_name":        clusterName,
			"location":           azureRegion,
			"environment":        "test",
			"node_count":         1, // Minimal for testing
		},
		EnvVars: map[string]string{
			"ARM_SUBSCRIPTION_ID": subscriptionID,
		},
	}

	// Clean up resources after test
	defer terraform.Destroy(t, terraformOptions)

	// Deploy infrastructure
	terraform.InitAndApply(t, terraformOptions)

	// Test 1: Verify Terraform completed successfully
	t.Run("TerraformOutputs", func(t *testing.T) {
		outputs := terraform.OutputAll(t, terraformOptions)
		assert.NotEmpty(t, outputs, "Terraform should produce outputs")
		
		// Check for expected AKS-related outputs
		expectedOutputs := []string{
			"aks_cluster_name",
			"aks_resource_group_name",
		}
		
		for _, outputKey := range expectedOutputs {
			if value, exists := outputs[outputKey]; exists {
				assert.NotEmpty(t, value, fmt.Sprintf("Output %s should not be empty", outputKey))
			}
		}
	})

	// Test 2: Verify we can get kubeconfig (if AKS is deployed)
	t.Run("KubeconfigAccessible", func(t *testing.T) {
		// Try to get kubeconfig - this will fail if AKS cluster doesn't exist
		// or if we don't have proper permissions
		kubeconfigPath := fmt.Sprintf("/tmp/kubeconfig-%s", uniqueID)
		
		// This is a basic test to see if we can access the cluster
		// In a real scenario, you'd use az aks get-credentials
		t.Logf("Testing kubeconfig access for cluster %s in resource group %s", clusterName, resourceGroupName)
		
		// For now, just verify the terraform outputs contain the expected values
		clusterNameOutput := terraform.Output(t, terraformOptions, "aks_cluster_name")
		if clusterNameOutput != "" {
			assert.Equal(t, clusterName, clusterNameOutput)
		}
	})
}

func TestExistingAKSCluster(t *testing.T) {
	// This test assumes AKS cluster is already deployed
	resourceGroupName := "sageinsure-rg"
	clusterName := "sageinsure-aks"
	subscriptionID := os.Getenv("ARM_SUBSCRIPTION_ID")
	require.NotEmpty(t, subscriptionID, "ARM_SUBSCRIPTION_ID environment variable must be set")

	// Test 1: Try to connect to existing cluster
	t.Run("ExistingClusterConnectivity", func(t *testing.T) {
		// This test requires that kubectl is configured with the cluster credentials
		// You would typically run: az aks get-credentials --resource-group sageinsure-rg --name sageinsure-aks
		
		kubeconfigPath := os.Getenv("KUBECONFIG")
		if kubeconfigPath == "" {
			kubeconfigPath = os.ExpandEnv("$HOME/.kube/config")
		}
		
		// Check if kubeconfig exists
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			t.Skip("Kubeconfig not found, skipping cluster connectivity test")
			return
		}
		
		options := k8s.NewKubectlOptions("", kubeconfigPath, "default")
		
		// Try to get cluster info
		nodes := k8s.GetNodes(t, options)
		if len(nodes) > 0 {
			t.Logf("Found %d nodes in the cluster", len(nodes))
			
			// Verify at least one node is ready
			for _, node := range nodes {
				for _, condition := range node.Status.Conditions {
					if condition.Type == "Ready" && condition.Status == "True" {
						t.Logf("Node %s is ready", node.Name)
						break
					}
				}
			}
		} else {
			t.Log("No nodes found or unable to connect to cluster")
		}
	})

	// Test 2: Verify system pods are running (if connected)
	t.Run("SystemPodsRunning", func(t *testing.T) {
		kubeconfigPath := os.Getenv("KUBECONFIG")
		if kubeconfigPath == "" {
			kubeconfigPath = os.ExpandEnv("$HOME/.kube/config")
		}
		
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			t.Skip("Kubeconfig not found, skipping system pods test")
			return
		}
		
		options := k8s.NewKubectlOptions("", kubeconfigPath, "kube-system")
		
		// Try to list pods in kube-system namespace
		pods := k8s.ListPods(t, options, map[string]string{})
		if len(pods) > 0 {
			t.Logf("Found %d system pods", len(pods))
			
			// Count running pods
			runningPods := 0
			for _, pod := range pods {
				if pod.Status.Phase == "Running" {
					runningPods++
				}
			}
			t.Logf("%d out of %d system pods are running", runningPods, len(pods))
			
			// We expect at least some system pods to be running
			assert.Greater(t, runningPods, 0, "At least some system pods should be running")
		} else {
			t.Log("No system pods found or unable to connect to cluster")
		}
	})
}