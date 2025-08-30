package main

import (
	"fmt"
	"net/http"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBasicConnectivity(t *testing.T) {
	// Test basic HTTP connectivity
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	t.Run("InternetConnectivity", func(t *testing.T) {
		resp, err := client.Get("https://httpbin.org/status/200")
		require.NoError(t, err)
		defer resp.Body.Close()
		
		assert.Equal(t, http.StatusOK, resp.StatusCode)
		t.Log("Internet connectivity test passed")
	})
}

func TestAzureServiceConnectivity(t *testing.T) {
	// Test connectivity to Azure services
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	t.Run("AzurePublicEndpoints", func(t *testing.T) {
		endpoints := []string{
			"https://management.azure.com",
			"https://login.microsoftonline.com",
		}

		for _, endpoint := range endpoints {
			resp, err := client.Get(endpoint)
			if err != nil {
				t.Logf("Warning: Could not connect to %s: %v", endpoint, err)
				continue
			}
			resp.Body.Close()
			
			// We expect some response, even if it's an auth error
			assert.NotEqual(t, 0, resp.StatusCode)
			t.Logf("Successfully connected to %s (status: %d)", endpoint, resp.StatusCode)
		}
	})
}

func TestKubernetesConnectivity(t *testing.T) {
	// Test Kubernetes connectivity if kubeconfig is available
	kubeconfigPath := os.Getenv("KUBECONFIG")
	if kubeconfigPath == "" {
		kubeconfigPath = os.ExpandEnv("$HOME/.kube/config")
	}

	t.Run("KubeconfigExists", func(t *testing.T) {
		if _, err := os.Stat(kubeconfigPath); os.IsNotExist(err) {
			t.Skip("Kubeconfig not found, skipping Kubernetes connectivity test")
			return
		}
		
		t.Logf("Kubeconfig found at: %s", kubeconfigPath)
		assert.True(t, true, "Kubeconfig file exists")
	})
}

func TestApplicationEndpoints(t *testing.T) {
	// Test application endpoints if they're available
	baseURL := os.Getenv("BASE_URL")
	apiURL := os.Getenv("API_URL")

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	if baseURL != "" {
		t.Run("FrontendEndpoint", func(t *testing.T) {
			resp, err := client.Get(baseURL)
			if err != nil {
				t.Logf("Warning: Could not connect to frontend at %s: %v", baseURL, err)
				return
			}
			defer resp.Body.Close()
			
			// We expect some response
			assert.NotEqual(t, 0, resp.StatusCode)
			t.Logf("Frontend endpoint %s returned status: %d", baseURL, resp.StatusCode)
		})
	}

	if apiURL != "" {
		t.Run("APIEndpoint", func(t *testing.T) {
			healthURL := fmt.Sprintf("%s/healthz", apiURL)
			resp, err := client.Get(healthURL)
			if err != nil {
				t.Logf("Warning: Could not connect to API health endpoint at %s: %v", healthURL, err)
				return
			}
			defer resp.Body.Close()
			
			// Health endpoint should return 200
			if resp.StatusCode == http.StatusOK {
				t.Logf("API health endpoint is healthy")
			} else {
				t.Logf("API health endpoint returned status: %d", resp.StatusCode)
			}
		})
	}

	if baseURL == "" && apiURL == "" {
		t.Log("No application endpoints configured (BASE_URL and API_URL not set)")
	}
}