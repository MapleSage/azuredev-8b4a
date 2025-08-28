package test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/azure"
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
	subscriptionID := azure.GetSubscriptionIDFromEnvVar(t)

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

	// Test 1: Verify AKS cluster exists and is running
	t.Run("AKSClusterExists", func(t *testing.T) {
		cluster := azure.GetManagedCluster(t, resourceGroupName, clusterName, subscriptionID)
		assert.NotNil(t, cluster)
		assert.Equal(t, "Succeeded", *cluster.ProvisioningState)
	})

	// Test 2: Verify node pools are healthy
	t.Run("NodePoolsHealthy", func(t *testing.T) {
		nodePools := azure.GetManagedClusterNodePools(t, resourceGroupName, clusterName, subscriptionID)
		assert.NotEmpty(t, nodePools)
		
		for _, nodePool := range nodePools {
			assert.Equal(t, "Succeeded", *nodePool.ProvisioningState)
			assert.True(t, *nodePool.Count >= 1)
		}
	})

	// Test 3: Verify Kubernetes API is accessible
	t.Run("KubernetesAPIAccessible", func(t *testing.T) {
		// Get kubeconfig
		kubeConfig := azure.GetManagedClusterKubeConfig(t, resourceGroupName, clusterName, subscriptionID)
		
		// Test cluster connectivity
		options := k8s.NewKubectlOptions("", kubeConfig, "default")
		nodes := k8s.GetNodes(t, options)
		
		assert.NotEmpty(t, nodes)
		
		// Verify all nodes are ready
		for _, node := range nodes {
			k8s.WaitUntilNodeReady(t, options, node.Name, 10, 30*time.Second)
		}
	})

	// Test 4: Verify system pods are running
	t.Run("SystemPodsRunning", func(t *testing.T) {
		kubeConfig := azure.GetManagedClusterKubeConfig(t, resourceGroupName, clusterName, subscriptionID)
		options := k8s.NewKubectlOptions("", kubeConfig, "kube-system")
		
		// Wait for system pods to be ready
		k8s.WaitUntilNumPodsCreated(t, options, map[string]string{}, 5, 10, 30*time.Second)
		
		pods := k8s.ListPods(t, options, map[string]string{})
		assert.NotEmpty(t, pods)
		
		// Verify critical system pods are running
		systemPods := []string{"coredns", "kube-proxy", "azure-cni"}
		for _, podPrefix := range systemPods {
			found := false
			for _, pod := range pods {
				if len(pod.Name) > len(podPrefix) && pod.Name[:len(podPrefix)] == podPrefix {
					assert.Equal(t, "Running", string(pod.Status.Phase))
					found = true
					break
				}
			}
			assert.True(t, found, fmt.Sprintf("System pod with prefix %s not found", podPrefix))
		}
	})

	// Test 5: Verify network connectivity
	t.Run("NetworkConnectivity", func(t *testing.T) {
		kubeConfig := azure.GetManagedClusterKubeConfig(t, resourceGroupName, clusterName, subscriptionID)
		options := k8s.NewKubectlOptions("", kubeConfig, "default")
		
		// Deploy test pod for network testing
		testPodManifest := `
apiVersion: v1
kind: Pod
metadata:
  name: network-test-pod
spec:
  containers:
  - name: test
    image: busybox
    command: ['sleep', '3600']
`
		
		k8s.KubectlApplyFromString(t, options, testPodManifest)
		defer k8s.KubectlDeleteFromString(t, options, testPodManifest)
		
		// Wait for pod to be ready
		k8s.WaitUntilPodAvailable(t, options, "network-test-pod", 10, 30*time.Second)
		
		// Test DNS resolution
		output := k8s.RunKubectl(t, options, "exec", "network-test-pod", "--", "nslookup", "kubernetes.default.svc.cluster.local")
		assert.Contains(t, output, "kubernetes.default.svc.cluster.local")
		
		// Test external connectivity
		output = k8s.RunKubectl(t, options, "exec", "network-test-pod", "--", "wget", "-q", "-O-", "https://www.google.com")
		assert.NotEmpty(t, output)
	})
}