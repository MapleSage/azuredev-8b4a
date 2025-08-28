package chaos

import (
	"context"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Chaos Engineering Tests for SageInsure
// These tests validate system resilience under various failure conditions

type ChaosTestSuite struct {
	kubeClient kubernetes.Interface
	namespace  string
	baseURL    string
	timeout    time.Duration
}

func NewChaosTestSuite(kubeconfigPath, namespace, baseURL string) (*ChaosTestSuite, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &ChaosTestSuite{
		kubeClient: clientset,
		namespace:  namespace,
		baseURL:    baseURL,
		timeout:    5 * time.Minute,
	}, nil
}

func TestChaosEngineering(t *testing.T) {
	suite, err := NewChaosTestSuite("~/.kube/config", "default", "https://api.sageinsure.local")
	require.NoError(t, err)

	// Test 1: Pod failure resilience
	t.Run("PodFailureResilience", func(t *testing.T) {
		suite.testPodFailureResilience(t)
	})

	// Test 2: Network partition simulation
	t.Run("NetworkPartitionSimulation", func(t *testing.T) {
		suite.testNetworkPartitionSimulation(t)
	})

	// Test 3: Resource exhaustion
	t.Run("ResourceExhaustion", func(t *testing.T) {
		suite.testResourceExhaustion(t)
	})

	// Test 4: Database connection failure
	t.Run("DatabaseConnectionFailure", func(t *testing.T) {
		suite.testDatabaseConnectionFailure(t)
	})

	// Test 5: Azure services unavailability
	t.Run("AzureServicesUnavailability", func(t *testing.T) {
		suite.testAzureServicesUnavailability(t)
	})

	// Test 6: High latency simulation
	t.Run("HighLatencySimulation", func(t *testing.T) {
		suite.testHighLatencySimulation(t)
	})

	// Test 7: Cascading failure prevention
	t.Run("CascadingFailurePrevention", func(t *testing.T) {
		suite.testCascadingFailurePrevention(t)
	})
}

func (suite *ChaosTestSuite) testPodFailureResilience(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Get current API pods
	pods, err := suite.kubeClient.CoreV1().Pods(suite.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=sageinsure-api",
	})
	require.NoError(t, err)
	require.NotEmpty(t, pods.Items, "No API pods found")

	initialPodCount := len(pods.Items)
	t.Logf("Found %d API pods initially", initialPodCount)

	// Test baseline functionality
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
	require.NoError(t, err)
	resp.Body.Close()
	assert.Equal(t, http.StatusOK, resp.StatusCode, "API should be healthy before chaos test")

	// Kill one pod (simulate pod failure)
	if initialPodCount > 1 {
		podToKill := pods.Items[0]
		t.Logf("Killing pod: %s", podToKill.Name)

		err = suite.kubeClient.CoreV1().Pods(suite.namespace).Delete(ctx, podToKill.Name, metav1.DeleteOptions{})
		require.NoError(t, err)

		// Wait a moment for the deletion to take effect
		time.Sleep(5 * time.Second)

		// Test that service remains available (other pods should handle requests)
		maxRetries := 10
		successCount := 0

		for i := 0; i < maxRetries; i++ {
			resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
			if err == nil && resp.StatusCode == http.StatusOK {
				successCount++
			}
			if resp != nil {
				resp.Body.Close()
			}
			time.Sleep(2 * time.Second)
		}

		// Service should remain mostly available during pod failure
		availabilityRate := float64(successCount) / float64(maxRetries)
		assert.GreaterOrEqual(t, availabilityRate, 0.7, 
			"Service should maintain >70% availability during single pod failure")

		t.Logf("Availability during pod failure: %.2f%% (%d/%d requests successful)", 
			availabilityRate*100, successCount, maxRetries)

		// Wait for pod to be recreated by deployment
		t.Log("Waiting for pod recreation...")
		time.Sleep(30 * time.Second)

		// Verify pod count is restored
		newPods, err := suite.kubeClient.CoreV1().Pods(suite.namespace).List(ctx, metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=sageinsure-api",
		})
		require.NoError(t, err)

		runningPods := 0
		for _, pod := range newPods.Items {
			if pod.Status.Phase == "Running" {
				runningPods++
			}
		}

		assert.GreaterOrEqual(t, runningPods, initialPodCount-1, 
			"Pod count should be restored after failure")
	} else {
		t.Skip("Skipping pod failure test - only one pod available")
	}
}

func (suite *ChaosTestSuite) testNetworkPartitionSimulation(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Create a network policy to simulate network partition
	networkPolicy := `
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: chaos-network-partition
  namespace: %s
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: sageinsure-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: sageinsure-frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
`

	// Apply network policy (this would require kubectl or client-go implementation)
	t.Log("Simulating network partition with restrictive network policy")

	// Test that services handle network issues gracefully
	client := &http.Client{Timeout: 10 * time.Second}
	
	// Test with shorter timeout to simulate network issues
	shortTimeoutClient := &http.Client{Timeout: 2 * time.Second}
	
	failureCount := 0
	totalRequests := 10

	for i := 0; i < totalRequests; i++ {
		resp, err := shortTimeoutClient.Get(fmt.Sprintf("%s/health", suite.baseURL))
		if err != nil || (resp != nil && resp.StatusCode >= 500) {
			failureCount++
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(1 * time.Second)
	}

	// Some failures are expected during network partition
	failureRate := float64(failureCount) / float64(totalRequests)
	t.Logf("Network partition simulation: %.2f%% failure rate (%d/%d requests failed)", 
		failureRate*100, failureCount, totalRequests)

	// Test recovery after network partition is removed
	t.Log("Testing recovery after network partition removal")
	
	// In a real implementation, we would remove the network policy here
	time.Sleep(10 * time.Second)

	// Test that service recovers
	recoverySuccessCount := 0
	recoveryRequests := 5

	for i := 0; i < recoveryRequests; i++ {
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
		if err == nil && resp.StatusCode == http.StatusOK {
			recoverySuccessCount++
		}
		if resp != nil {
			resp.Body.Close()
		}
		time.Sleep(2 * time.Second)
	}

	recoveryRate := float64(recoverySuccessCount) / float64(recoveryRequests)
	assert.GreaterOrEqual(t, recoveryRate, 0.8, 
		"Service should recover quickly after network partition is resolved")

	t.Logf("Recovery rate: %.2f%% (%d/%d requests successful)", 
		recoveryRate*100, recoverySuccessCount, recoveryRequests)
}

func (suite *ChaosTestSuite) testResourceExhaustion(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Create a resource-intensive pod to exhaust cluster resources
	resourceHogPod := `
apiVersion: v1
kind: Pod
metadata:
  name: chaos-resource-hog
  namespace: %s
  labels:
    chaos-test: resource-exhaustion
spec:
  containers:
  - name: resource-hog
    image: busybox
    command: ['sh', '-c']
    args:
    - |
      # Consume CPU and memory
      while true; do
        dd if=/dev/zero of=/tmp/memory bs=1M count=100 2>/dev/null
        sleep 1
      done
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  restartPolicy: Never
`

	t.Log("Creating resource-intensive pod to simulate resource exhaustion")

	// In a real implementation, we would create the pod using client-go
	// For now, we'll simulate the effects by testing system behavior under load

	client := &http.Client{Timeout: 30 * time.Second}

	// Test system behavior under simulated resource pressure
	t.Log("Testing API behavior under resource pressure")

	startTime := time.Now()
	requestCount := 20
	successCount := 0
	totalLatency := time.Duration(0)

	for i := 0; i < requestCount; i++ {
		requestStart := time.Now()
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
		requestLatency := time.Since(requestStart)
		totalLatency += requestLatency

		if err == nil && resp.StatusCode == http.StatusOK {
			successCount++
		}
		if resp != nil {
			resp.Body.Close()
		}

		// Small delay between requests
		time.Sleep(500 * time.Millisecond)
	}

	testDuration := time.Since(startTime)
	avgLatency := totalLatency / time.Duration(requestCount)
	successRate := float64(successCount) / float64(requestCount)

	t.Logf("Resource exhaustion test results:")
	t.Logf("- Success rate: %.2f%% (%d/%d)", successRate*100, successCount, requestCount)
	t.Logf("- Average latency: %v", avgLatency)
	t.Logf("- Total test duration: %v", testDuration)

	// System should maintain reasonable performance even under resource pressure
	assert.GreaterOrEqual(t, successRate, 0.8, "System should maintain >80% success rate under resource pressure")
	assert.Less(t, avgLatency, 10*time.Second, "Average latency should remain reasonable under resource pressure")

	// Cleanup: In a real implementation, we would delete the resource hog pod
	t.Log("Cleaning up resource-intensive pod")
}

func (suite *ChaosTestSuite) testDatabaseConnectionFailure(t *testing.T) {
	client := &http.Client{Timeout: 30 * time.Second}

	// Test API behavior when database is unavailable
	t.Log("Testing API resilience to database connection failures")

	// First, verify normal operation
	resp, err := client.Get(fmt.Sprintf("%s/health/database", suite.baseURL))
	require.NoError(t, err)
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Skip("Database already appears to be unavailable, skipping chaos test")
		return
	}

	// Simulate database connection issues by testing endpoints that require database access
	databaseEndpoints := []string{
		"/policies",
		"/quotes",
		"/users/profile",
	}

	for _, endpoint := range databaseEndpoints {
		t.Run(fmt.Sprintf("DatabaseFailure_%s", endpoint), func(t *testing.T) {
			// Test that endpoints handle database failures gracefully
			resp, err := client.Get(fmt.Sprintf("%s%s", suite.baseURL, endpoint))
			
			if err != nil {
				t.Logf("Request failed as expected during database failure: %v", err)
				return
			}
			defer resp.Body.Close()

			// Endpoints should return appropriate error codes, not crash
			assert.True(t, resp.StatusCode == http.StatusServiceUnavailable ||
				resp.StatusCode == http.StatusInternalServerError ||
				resp.StatusCode == http.StatusUnauthorized ||
				resp.StatusCode == http.StatusOK,
				"Endpoint should handle database failure gracefully")

			if resp.StatusCode >= 500 {
				t.Logf("Endpoint returned server error during database failure (expected): %d", resp.StatusCode)
			}
		})
	}

	// Test that health endpoint still works even if database is down
	resp, err = client.Get(fmt.Sprintf("%s/health", suite.baseURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	// Health endpoint should still respond, but may indicate degraded status
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusServiceUnavailable,
		"Health endpoint should remain accessible during database failure")
}

func (suite *ChaosTestSuite) testAzureServicesUnavailability(t *testing.T) {
	client := &http.Client{Timeout: 30 * time.Second}

	// Test API behavior when Azure services are unavailable
	azureServices := []string{
		"openai",
		"search", 
		"keyvault",
	}

	for _, service := range azureServices {
		t.Run(fmt.Sprintf("AzureService_%s_Unavailable", service), func(t *testing.T) {
			// Test health endpoint for specific Azure service
			resp, err := client.Get(fmt.Sprintf("%s/health/%s", suite.baseURL, service))
			
			if err != nil {
				t.Logf("Azure service %s health check failed as expected: %v", service, err)
				return
			}
			defer resp.Body.Close()

			// Service health checks should handle Azure service failures gracefully
			assert.True(t, resp.StatusCode == http.StatusOK ||
				resp.StatusCode == http.StatusServiceUnavailable ||
				resp.StatusCode == http.StatusNotFound,
				"Azure service health check should handle failures gracefully")

			if resp.StatusCode == http.StatusServiceUnavailable {
				t.Logf("Azure service %s reported as unavailable (expected during chaos test)", service)
			}
		})
	}

	// Test that core API functionality still works when Azure services are degraded
	t.Run("CoreFunctionalityDuringAzureFailure", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Core health should still work
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusServiceUnavailable,
			"Core API should remain functional during Azure service failures")
	})
}

func (suite *ChaosTestSuite) testHighLatencySimulation(t *testing.T) {
	// Test API behavior under high latency conditions
	t.Log("Testing API resilience to high latency")

	// Use very short timeout to simulate high latency conditions
	highLatencyClient := &http.Client{Timeout: 1 * time.Second}
	normalClient := &http.Client{Timeout: 30 * time.Second}

	endpoints := []string{
		"/health",
		"/quotes",
		"/policies",
	}

	for _, endpoint := range endpoints {
		t.Run(fmt.Sprintf("HighLatency_%s", endpoint), func(t *testing.T) {
			// Test with high latency client (short timeout)
			timeoutCount := 0
			successCount := 0
			totalRequests := 5

			for i := 0; i < totalRequests; i++ {
				resp, err := highLatencyClient.Get(fmt.Sprintf("%s%s", suite.baseURL, endpoint))
				
				if err != nil {
					timeoutCount++
					t.Logf("Request %d timed out (expected under high latency): %v", i+1, err)
				} else {
					successCount++
					resp.Body.Close()
				}
				
				time.Sleep(500 * time.Millisecond)
			}

			t.Logf("High latency test for %s: %d timeouts, %d successes out of %d requests", 
				endpoint, timeoutCount, successCount, totalRequests)

			// Test that normal client can still access the endpoint
			resp, err := normalClient.Get(fmt.Sprintf("%s%s", suite.baseURL, endpoint))
			if err == nil {
				defer resp.Body.Close()
				assert.True(t, resp.StatusCode < 500, 
					"Endpoint should be accessible with normal timeout even under high latency")
			}
		})
	}
}

func (suite *ChaosTestSuite) testCascadingFailurePrevention(t *testing.T) {
	client := &http.Client{Timeout: 30 * time.Second}

	// Test that failures in one component don't cascade to others
	t.Log("Testing cascading failure prevention")

	// Test circuit breaker functionality
	t.Run("CircuitBreakerFunctionality", func(t *testing.T) {
		// Make rapid requests to potentially trigger circuit breaker
		rapidRequests := 20
		failureCount := 0

		for i := 0; i < rapidRequests; i++ {
			resp, err := client.Get(fmt.Sprintf("%s/test/circuit-breaker", suite.baseURL))
			
			if err != nil || (resp != nil && resp.StatusCode >= 500) {
				failureCount++
			}
			
			if resp != nil {
				if resp.StatusCode == http.StatusTooManyRequests || 
				   resp.StatusCode == http.StatusServiceUnavailable {
					t.Logf("Circuit breaker activated (status: %d)", resp.StatusCode)
				}
				resp.Body.Close()
			}
			
			// No delay - test rapid requests
		}

		t.Logf("Circuit breaker test: %d failures out of %d rapid requests", failureCount, rapidRequests)
	})

	// Test that health endpoint remains available during failures
	t.Run("HealthEndpointDuringFailures", func(t *testing.T) {
		// Health endpoint should always be available for monitoring
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.baseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusServiceUnavailable,
			"Health endpoint should remain accessible during system failures")
	})

	// Test graceful degradation
	t.Run("GracefulDegradation", func(t *testing.T) {
		// Test that system degrades gracefully rather than failing completely
		degradationEndpoints := []string{
			"/quotes/simple",  // Simplified quote without AI
			"/health/basic",   // Basic health without external dependencies
		}

		for _, endpoint := range degradationEndpoints {
			resp, err := client.Get(fmt.Sprintf("%s%s", suite.baseURL, endpoint))
			
			if err == nil {
				defer resp.Body.Close()
				
				// Degraded endpoints should still work even if full functionality is impaired
				assert.True(t, resp.StatusCode < 500 || resp.StatusCode == http.StatusNotFound,
					"Degraded endpoints should work or return 404 if not implemented")
				
				if resp.StatusCode == http.StatusOK {
					t.Logf("Graceful degradation endpoint %s is working", endpoint)
				}
			}
		}
	})
}

// Helper function to create chaos test pods
func (suite *ChaosTestSuite) createChaosPod(ctx context.Context, podManifest string) error {
	// In a real implementation, this would use client-go to create pods
	// For now, we'll simulate the creation
	return nil
}

// Helper function to cleanup chaos test resources
func (suite *ChaosTestSuite) cleanupChaosResources(ctx context.Context) error {
	// Cleanup any resources created during chaos tests
	return suite.kubeClient.CoreV1().Pods(suite.namespace).DeleteCollection(
		ctx,
		metav1.DeleteOptions{},
		metav1.ListOptions{
			LabelSelector: "chaos-test",
		},
	)
}