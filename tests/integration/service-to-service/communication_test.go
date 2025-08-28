package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type ServiceTestSuite struct {
	kubeClient  kubernetes.Interface
	namespace   string
	apiBaseURL  string
	frontendURL string
	workerURL   string
	timeout     time.Duration
}

func NewServiceTestSuite(kubeconfigPath, namespace string) (*ServiceTestSuite, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &ServiceTestSuite{
		kubeClient:  clientset,
		namespace:   namespace,
		apiBaseURL:  fmt.Sprintf("http://sageinsure-api.%s.svc.cluster.local", namespace),
		frontendURL: fmt.Sprintf("http://sageinsure-frontend.%s.svc.cluster.local", namespace),
		workerURL:   fmt.Sprintf("http://sageinsure-worker.%s.svc.cluster.local", namespace),
		timeout:     30 * time.Second,
	}, nil
}

func TestServiceToServiceCommunication(t *testing.T) {
	suite, err := NewServiceTestSuite("~/.kube/config", "default")
	require.NoError(t, err)

	// Test 1: API to Database communication
	t.Run("APIToDatabaseCommunication", func(t *testing.T) {
		suite.testAPIToDatabaseCommunication(t)
	})

	// Test 2: API to Azure services communication
	t.Run("APIToAzureServicesCommunication", func(t *testing.T) {
		suite.testAPIToAzureServicesCommunication(t)
	})

	// Test 3: Frontend to API communication
	t.Run("FrontendToAPICommunication", func(t *testing.T) {
		suite.testFrontendToAPICommunication(t)
	})

	// Test 4: Worker to API communication
	t.Run("WorkerToAPICommunication", func(t *testing.T) {
		suite.testWorkerToAPICommunication(t)
	})

	// Test 5: API to Worker job dispatch
	t.Run("APIToWorkerJobDispatch", func(t *testing.T) {
		suite.testAPIToWorkerJobDispatch(t)
	})

	// Test 6: Cross-service authentication
	t.Run("CrossServiceAuthentication", func(t *testing.T) {
		suite.testCrossServiceAuthentication(t)
	})

	// Test 7: Service discovery and load balancing
	t.Run("ServiceDiscoveryAndLoadBalancing", func(t *testing.T) {
		suite.testServiceDiscoveryAndLoadBalancing(t)
	})
}

func (suite *ServiceTestSuite) testAPIToDatabaseCommunication(t *testing.T) {
	// Test database connectivity through API health endpoint
	client := &http.Client{Timeout: suite.timeout}
	
	resp, err := client.Get(fmt.Sprintf("%s/health/database", suite.apiBaseURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	var healthResponse struct {
		Status   string `json:"status"`
		Database struct {
			Connected bool   `json:"connected"`
			Latency   string `json:"latency"`
		} `json:"database"`
	}

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	err = json.Unmarshal(body, &healthResponse)
	require.NoError(t, err)

	assert.Equal(t, "healthy", healthResponse.Status)
	assert.True(t, healthResponse.Database.Connected)
	assert.NotEmpty(t, healthResponse.Database.Latency)
}

func (suite *ServiceTestSuite) testAPIToAzureServicesCommunication(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test Azure OpenAI connectivity
	t.Run("AzureOpenAIConnectivity", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/health/openai", suite.apiBaseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var openaiHealth struct {
			Status string `json:"status"`
			OpenAI struct {
				Available bool   `json:"available"`
				Latency   string `json:"latency"`
				Model     string `json:"model"`
			} `json:"openai"`
		}

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		err = json.Unmarshal(body, &openaiHealth)
		require.NoError(t, err)

		assert.Equal(t, "healthy", openaiHealth.Status)
		assert.True(t, openaiHealth.OpenAI.Available)
		assert.NotEmpty(t, openaiHealth.OpenAI.Model)
	})

	// Test Azure Cognitive Search connectivity
	t.Run("AzureCognitiveSearchConnectivity", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/health/search", suite.apiBaseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var searchHealth struct {
			Status string `json:"status"`
			Search struct {
				Available bool   `json:"available"`
				Latency   string `json:"latency"`
				Indexes   int    `json:"indexes"`
			} `json:"search"`
		}

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		err = json.Unmarshal(body, &searchHealth)
		require.NoError(t, err)

		assert.Equal(t, "healthy", searchHealth.Status)
		assert.True(t, searchHealth.Search.Available)
		assert.GreaterOrEqual(t, searchHealth.Search.Indexes, 0)
	})

	// Test Key Vault connectivity
	t.Run("KeyVaultConnectivity", func(t *testing.T) {
		resp, err := client.Get(fmt.Sprintf("%s/health/keyvault", suite.apiBaseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var kvHealth struct {
			Status   string `json:"status"`
			KeyVault struct {
				Available bool `json:"available"`
				Secrets   int  `json:"secrets"`
			} `json:"keyvault"`
		}

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		err = json.Unmarshal(body, &kvHealth)
		require.NoError(t, err)

		assert.Equal(t, "healthy", kvHealth.Status)
		assert.True(t, kvHealth.KeyVault.Available)
		assert.GreaterOrEqual(t, kvHealth.KeyVault.Secrets, 1)
	})
}

func (suite *ServiceTestSuite) testFrontendToAPICommunication(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test frontend can reach API through internal service
	resp, err := client.Get(fmt.Sprintf("%s/api/proxy/health", suite.frontendURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	// Frontend should proxy the request to API and return the response
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusNotFound)

	// Test frontend static assets are served
	resp, err = client.Get(fmt.Sprintf("%s/", suite.frontendURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	
	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	
	// Should contain Next.js application content
	bodyStr := string(body)
	assert.Contains(t, bodyStr, "SageInsure")
}

func (suite *ServiceTestSuite) testWorkerToAPICommunication(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test worker metrics endpoint
	resp, err := client.Get(fmt.Sprintf("%s/metrics", suite.workerURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	// Should contain Prometheus metrics
	bodyStr := string(body)
	assert.Contains(t, bodyStr, "# HELP")
	assert.Contains(t, bodyStr, "# TYPE")
}

func (suite *ServiceTestSuite) testAPIToWorkerJobDispatch(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Create a test job through API
	jobPayload := map[string]interface{}{
		"type": "document_analysis",
		"data": map[string]interface{}{
			"document_id": "test-doc-123",
			"document_type": "policy_document",
		},
		"priority": "normal",
	}

	payloadBytes, err := json.Marshal(jobPayload)
	require.NoError(t, err)

	resp, err := client.Post(
		fmt.Sprintf("%s/jobs", suite.apiBaseURL),
		"application/json",
		bytes.NewBuffer(payloadBytes),
	)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.True(t, resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusAccepted)

	var jobResponse struct {
		JobID  string `json:"job_id"`
		Status string `json:"status"`
	}

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	err = json.Unmarshal(body, &jobResponse)
	require.NoError(t, err)

	assert.NotEmpty(t, jobResponse.JobID)
	assert.Contains(t, []string{"queued", "processing", "completed"}, jobResponse.Status)

	// Check job status
	time.Sleep(2 * time.Second) // Allow time for processing

	resp, err = client.Get(fmt.Sprintf("%s/jobs/%s", suite.apiBaseURL, jobResponse.JobID))
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusOK, resp.StatusCode)
}

func (suite *ServiceTestSuite) testCrossServiceAuthentication(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test that services can authenticate with each other using service accounts
	// This would typically involve JWT tokens or mutual TLS

	// Test API service account authentication
	resp, err := client.Get(fmt.Sprintf("%s/auth/service-account/verify", suite.apiBaseURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	// Should return authentication status
	assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

	if resp.StatusCode == http.StatusOK {
		var authResponse struct {
			Authenticated bool   `json:"authenticated"`
			ServiceName   string `json:"service_name"`
			Namespace     string `json:"namespace"`
		}

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		err = json.Unmarshal(body, &authResponse)
		require.NoError(t, err)

		assert.True(t, authResponse.Authenticated)
		assert.Equal(t, "sageinsure-api", authResponse.ServiceName)
		assert.Equal(t, suite.namespace, authResponse.Namespace)
	}
}

func (suite *ServiceTestSuite) testServiceDiscoveryAndLoadBalancing(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test multiple requests to verify load balancing
	responses := make(map[string]int)
	
	for i := 0; i < 10; i++ {
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.apiBaseURL))
		require.NoError(t, err)
		
		// Get the pod name from response headers or body
		podName := resp.Header.Get("X-Pod-Name")
		if podName == "" {
			// If not in headers, try to get from response body
			var healthResponse struct {
				PodName string `json:"pod_name"`
			}
			
			body, err := io.ReadAll(resp.Body)
			if err == nil {
				json.Unmarshal(body, &healthResponse)
				podName = healthResponse.PodName
			}
		}
		resp.Body.Close()

		if podName != "" {
			responses[podName]++
		}

		assert.Equal(t, http.StatusOK, resp.StatusCode)
		
		// Small delay between requests
		time.Sleep(100 * time.Millisecond)
	}

	// If there are multiple pods, requests should be distributed
	if len(responses) > 1 {
		t.Logf("Load balancing detected across %d pods: %v", len(responses), responses)
		
		// Verify that no single pod handled all requests (basic load balancing check)
		for podName, count := range responses {
			assert.Less(t, count, 10, fmt.Sprintf("Pod %s handled all requests, load balancing may not be working", podName))
		}
	} else {
		t.Log("Single pod detected or pod names not available in responses")
	}
}

// Helper function to test service resilience
func (suite *ServiceTestSuite) testServiceResilience(t *testing.T) {
	client := &http.Client{Timeout: suite.timeout}

	// Test API resilience with rapid requests
	successCount := 0
	totalRequests := 20

	for i := 0; i < totalRequests; i++ {
		resp, err := client.Get(fmt.Sprintf("%s/health", suite.apiBaseURL))
		if err == nil && resp.StatusCode == http.StatusOK {
			successCount++
		}
		if resp != nil {
			resp.Body.Close()
		}
		
		// No delay - test rapid requests
	}

	successRate := float64(successCount) / float64(totalRequests)
	assert.GreaterOrEqual(t, successRate, 0.9, "Service should handle rapid requests with >90% success rate")

	t.Logf("Service resilience test: %d/%d requests successful (%.2f%%)", 
		successCount, totalRequests, successRate*100)
}

// Test circuit breaker functionality
func (suite *ServiceTestSuite) testCircuitBreaker(t *testing.T) {
	client := &http.Client{Timeout: 1 * time.Second} // Short timeout to trigger failures

	// Test circuit breaker by making requests to a potentially failing endpoint
	resp, err := client.Get(fmt.Sprintf("%s/test/circuit-breaker", suite.apiBaseURL))
	if err != nil {
		t.Logf("Circuit breaker test endpoint not available: %v", err)
		return
	}
	defer resp.Body.Close()

	// Circuit breaker should return appropriate status codes
	assert.True(t, resp.StatusCode == http.StatusOK || 
		resp.StatusCode == http.StatusServiceUnavailable ||
		resp.StatusCode == http.StatusTooManyRequests)

	if resp.StatusCode != http.StatusOK {
		t.Logf("Circuit breaker is active (status: %d)", resp.StatusCode)
	}
}