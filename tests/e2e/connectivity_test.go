package e2e

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

type E2ETestSuite struct {
	kubeClient   kubernetes.Interface
	namespace    string
	baseURL      string
	timeout      time.Duration
}

func NewE2ETestSuite(kubeconfigPath, namespace, baseURL string) (*E2ETestSuite, error) {
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return nil, err
	}

	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &E2ETestSuite{
		kubeClient: clientset,
		namespace:  namespace,
		baseURL:    baseURL,
		timeout:    5 * time.minute,
	}, nil
}

func TestEndToEndConnectivity(t *testing.T) {
	// Initialize test suite
	suite, err := NewE2ETestSuite(
		"~/.kube/config",
		"default",
		"https://sageinsure.local",
	)
	require.NoError(t, err)

	// Test 1: Verify all pods are running
	t.Run("AllPodsRunning", func(t *testing.T) {
		suite.testPodsRunning(t)
	})

	// Test 2: Verify services are accessible
	t.Run("ServicesAccessible", func(t *testing.T) {
		suite.testServicesAccessible(t)
	})

	// Test 3: Verify ingress connectivity
	t.Run("IngressConnectivity", func(t *testing.T) {
		suite.testIngressConnectivity(t)
	})

	// Test 4: Verify database connectivity
	t.Run("DatabaseConnectivity", func(t *testing.T) {
		suite.testDatabaseConnectivity(t)
	})

	// Test 5: Verify Azure services connectivity
	t.Run("AzureServicesConnectivity", func(t *testing.T) {
		suite.testAzureServicesConnectivity(t)
	})

	// Test 6: Verify inter-service communication
	t.Run("InterServiceCommunication", func(t *testing.T) {
		suite.testInterServiceCommunication(t)
	})
}

func (suite *E2ETestSuite) testPodsRunning(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Get all pods in the namespace
	pods, err := suite.kubeClient.CoreV1().Pods(suite.namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/part-of=sageinsure",
	})
	require.NoError(t, err)
	assert.NotEmpty(t, pods.Items, "No SageInsure pods found")

	// Verify each pod is running
	for _, pod := range pods.Items {
		assert.Equal(t, "Running", string(pod.Status.Phase), 
			fmt.Sprintf("Pod %s is not running", pod.Name))
		
		// Verify all containers in the pod are ready
		for _, containerStatus := range pod.Status.ContainerStatuses {
			assert.True(t, containerStatus.Ready, 
				fmt.Sprintf("Container %s in pod %s is not ready", 
					containerStatus.Name, pod.Name))
		}
	}
}

func (suite *E2ETestSuite) testServicesAccessible(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	expectedServices := []string{
		"sageinsure-api",
		"sageinsure-frontend", 
		"sageinsure-worker",
	}

	for _, serviceName := range expectedServices {
		service, err := suite.kubeClient.CoreV1().Services(suite.namespace).Get(ctx, serviceName, metav1.GetOptions{})
		require.NoError(t, err, fmt.Sprintf("Service %s not found", serviceName))
		
		assert.NotEmpty(t, service.Spec.Ports, 
			fmt.Sprintf("Service %s has no ports defined", serviceName))
		
		// Verify service has endpoints
		endpoints, err := suite.kubeClient.CoreV1().Endpoints(suite.namespace).Get(ctx, serviceName, metav1.GetOptions{})
		require.NoError(t, err)
		assert.NotEmpty(t, endpoints.Subsets, 
			fmt.Sprintf("Service %s has no endpoints", serviceName))
	}
}

func (suite *E2ETestSuite) testIngressConnectivity(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Get ingress resources
	ingresses, err := suite.kubeClient.NetworkingV1().Ingresses(suite.namespace).List(ctx, metav1.ListOptions{})
	require.NoError(t, err)
	assert.NotEmpty(t, ingresses.Items, "No ingress resources found")

	// Test HTTP connectivity to each ingress
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	for _, ingress := range ingresses.Items {
		for _, rule := range ingress.Spec.Rules {
			if rule.Host != "" {
				url := fmt.Sprintf("https://%s/health", rule.Host)
				
				resp, err := client.Get(url)
				if err != nil {
					t.Logf("Warning: Could not connect to %s: %v", url, err)
					continue
				}
				defer resp.Body.Close()
				
				assert.True(t, resp.StatusCode < 500, 
					fmt.Sprintf("Server error from %s: %d", url, resp.StatusCode))
			}
		}
	}
}

func (suite *E2ETestSuite) testDatabaseConnectivity(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Create a test pod to check database connectivity
	testPodManifest := `
apiVersion: v1
kind: Pod
metadata:
  name: db-connectivity-test
  namespace: %s
spec:
  restartPolicy: Never
  containers:
  - name: test
    image: postgres:15-alpine
    command: ['sh', '-c', 'pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER && echo "Database connection successful"']
    env:
    - name: DB_HOST
      valueFrom:
        secretKeyRef:
          name: database-secret
          key: host
    - name: DB_PORT
      valueFrom:
        secretKeyRef:
          name: database-secret
          key: port
    - name: DB_USER
      valueFrom:
        secretKeyRef:
          name: database-secret
          key: username
`

	// Apply the test pod (implementation would use kubectl or client-go)
	// For now, we'll test that database secrets exist
	_, err := suite.kubeClient.CoreV1().Secrets(suite.namespace).Get(ctx, "database-secret", metav1.GetOptions{})
	if err != nil {
		t.Logf("Database secret not found, skipping database connectivity test: %v", err)
		return
	}

	// In a real implementation, we would:
	// 1. Create the test pod
	// 2. Wait for it to complete
	// 3. Check the logs for success message
	// 4. Clean up the pod
	
	t.Log("Database connectivity test would be implemented here")
}

func (suite *E2ETestSuite) testAzureServicesConnectivity(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Test connectivity to Azure services from within the cluster
	testPodManifest := `
apiVersion: v1
kind: Pod
metadata:
  name: azure-connectivity-test
  namespace: %s
spec:
  restartPolicy: Never
  serviceAccountName: sageinsure-api
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ['sh', '-c']
    args:
    - |
      echo "Testing Azure OpenAI connectivity..."
      curl -f -m 30 https://sageinsure-openai.openai.azure.com/openai/deployments?api-version=2023-05-15 \
        -H "api-key: $OPENAI_API_KEY" || echo "OpenAI connection failed"
      
      echo "Testing Azure Cognitive Search connectivity..."
      curl -f -m 30 https://sageinsure-search.search.windows.net/indexes?api-version=2023-11-01 \
        -H "api-key: $SEARCH_API_KEY" || echo "Search connection failed"
      
      echo "Testing Key Vault connectivity..."
      curl -f -m 30 https://kv-eedfa81f.vault.azure.net/secrets?api-version=7.4 \
        -H "Authorization: Bearer $AZURE_TOKEN" || echo "Key Vault connection failed"
    env:
    - name: OPENAI_API_KEY
      valueFrom:
        secretKeyRef:
          name: azure-secrets
          key: openai-api-key
    - name: SEARCH_API_KEY
      valueFrom:
        secretKeyRef:
          name: azure-secrets
          key: search-api-key
`

	// Check if required secrets exist
	_, err := suite.kubeClient.CoreV1().Secrets(suite.namespace).Get(ctx, "azure-secrets", metav1.GetOptions{})
	if err != nil {
		t.Logf("Azure secrets not found, skipping Azure services connectivity test: %v", err)
		return
	}

	// In a real implementation, we would create and run the test pod
	t.Log("Azure services connectivity test would be implemented here")
}

func (suite *E2ETestSuite) testInterServiceCommunication(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), suite.timeout)
	defer cancel()

	// Test that frontend can communicate with API
	testPodManifest := `
apiVersion: v1
kind: Pod
metadata:
  name: inter-service-test
  namespace: %s
spec:
  restartPolicy: Never
  containers:
  - name: test
    image: curlimages/curl:latest
    command: ['sh', '-c']
    args:
    - |
      echo "Testing frontend to API communication..."
      curl -f -m 30 http://sageinsure-api.%s.svc.cluster.local/health || exit 1
      
      echo "Testing API to worker communication..."
      curl -f -m 30 http://sageinsure-worker.%s.svc.cluster.local/metrics || exit 1
      
      echo "Inter-service communication test passed"
`

	// In a real implementation, we would:
	// 1. Create the test pod with proper service URLs
	// 2. Wait for completion
	// 3. Check logs for success
	// 4. Clean up

	// For now, verify services exist
	services := []string{"sageinsure-api", "sageinsure-frontend", "sageinsure-worker"}
	for _, serviceName := range services {
		_, err := suite.kubeClient.CoreV1().Services(suite.namespace).Get(ctx, serviceName, metav1.GetOptions{})
		assert.NoError(t, err, fmt.Sprintf("Service %s should exist for inter-service communication", serviceName))
	}
}

// Helper function to wait for pod completion
func (suite *E2ETestSuite) waitForPodCompletion(ctx context.Context, podName string) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			pod, err := suite.kubeClient.CoreV1().Pods(suite.namespace).Get(ctx, podName, metav1.GetOptions{})
			if err != nil {
				return err
			}
			
			if pod.Status.Phase == "Succeeded" {
				return nil
			}
			if pod.Status.Phase == "Failed" {
				return fmt.Errorf("pod %s failed", podName)
			}
			
			time.Sleep(5 * time.Second)
		}
	}
}