package contract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Contract testing for SageInsure API
// This ensures API contracts remain stable across deployments

type APIContractTestSuite struct {
	baseURL string
	client  *http.Client
}

func NewAPIContractTestSuite(baseURL string) *APIContractTestSuite {
	return &APIContractTestSuite{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func TestAPIContracts(t *testing.T) {
	suite := NewAPIContractTestSuite("http://sageinsure-api.default.svc.cluster.local")

	// Test 1: Health endpoint contract
	t.Run("HealthEndpointContract", func(t *testing.T) {
		suite.testHealthEndpointContract(t)
	})

	// Test 2: Authentication endpoint contracts
	t.Run("AuthenticationEndpointContracts", func(t *testing.T) {
		suite.testAuthenticationEndpointContracts(t)
	})

	// Test 3: Quote generation endpoint contracts
	t.Run("QuoteGenerationEndpointContracts", func(t *testing.T) {
		suite.testQuoteGenerationEndpointContracts(t)
	})

	// Test 4: Document upload endpoint contracts
	t.Run("DocumentUploadEndpointContracts", func(t *testing.T) {
		suite.testDocumentUploadEndpointContracts(t)
	})

	// Test 5: Policy management endpoint contracts
	t.Run("PolicyManagementEndpointContracts", func(t *testing.T) {
		suite.testPolicyManagementEndpointContracts(t)
	})

	// Test 6: Error response contracts
	t.Run("ErrorResponseContracts", func(t *testing.T) {
		suite.testErrorResponseContracts(t)
	})

	// Test 7: API versioning contracts
	t.Run("APIVersioningContracts", func(t *testing.T) {
		suite.testAPIVersioningContracts(t)
	})
}

func (suite *APIContractTestSuite) testHealthEndpointContract(t *testing.T) {
	resp, err := suite.client.Get(fmt.Sprintf("%s/health", suite.baseURL))
	require.NoError(t, err)
	defer resp.Body.Close()

	// Contract: Health endpoint should return 200 OK
	assert.Equal(t, http.StatusOK, resp.StatusCode)

	// Contract: Response should be JSON
	contentType := resp.Header.Get("Content-Type")
	assert.Contains(t, contentType, "application/json")

	// Contract: Response should have specific structure
	var healthResponse struct {
		Status    string `json:"status"`
		Timestamp string `json:"timestamp"`
		Version   string `json:"version"`
		Services  struct {
			Database struct {
				Status  string `json:"status"`
				Latency string `json:"latency"`
			} `json:"database"`
			OpenAI struct {
				Status string `json:"status"`
				Model  string `json:"model"`
			} `json:"openai"`
			Search struct {
				Status  string `json:"status"`
				Indexes int    `json:"indexes"`
			} `json:"search"`
		} `json:"services"`
	}

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	err = json.Unmarshal(body, &healthResponse)
	require.NoError(t, err)

	// Contract: Required fields must be present
	assert.NotEmpty(t, healthResponse.Status)
	assert.NotEmpty(t, healthResponse.Timestamp)
	assert.NotEmpty(t, healthResponse.Version)
	assert.Contains(t, []string{"healthy", "degraded", "unhealthy"}, healthResponse.Status)

	// Contract: Services section must be present
	assert.NotEmpty(t, healthResponse.Services.Database.Status)
	assert.NotEmpty(t, healthResponse.Services.OpenAI.Status)
	assert.NotEmpty(t, healthResponse.Services.Search.Status)
}

func (suite *APIContractTestSuite) testAuthenticationEndpointContracts(t *testing.T) {
	// Test login endpoint contract
	t.Run("LoginEndpointContract", func(t *testing.T) {
		loginPayload := map[string]interface{}{
			"email":    "test@example.com",
			"password": "testpassword",
		}

		payloadBytes, err := json.Marshal(loginPayload)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/auth/login", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 200 OK or 401 Unauthorized
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		if resp.StatusCode == http.StatusOK {
			// Contract: Success response structure
			var loginResponse struct {
				AccessToken  string `json:"access_token"`
				RefreshToken string `json:"refresh_token"`
				TokenType    string `json:"token_type"`
				ExpiresIn    int    `json:"expires_in"`
				User         struct {
					ID    string `json:"id"`
					Email string `json:"email"`
					Name  string `json:"name"`
				} `json:"user"`
			}

			err = json.Unmarshal(body, &loginResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, loginResponse.AccessToken)
			assert.NotEmpty(t, loginResponse.RefreshToken)
			assert.Equal(t, "Bearer", loginResponse.TokenType)
			assert.Greater(t, loginResponse.ExpiresIn, 0)
			assert.NotEmpty(t, loginResponse.User.ID)
			assert.NotEmpty(t, loginResponse.User.Email)
		} else {
			// Contract: Error response structure
			var errorResponse struct {
				Error struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			}

			err = json.Unmarshal(body, &errorResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, errorResponse.Error.Code)
			assert.NotEmpty(t, errorResponse.Error.Message)
		}
	})

	// Test token refresh endpoint contract
	t.Run("TokenRefreshEndpointContract", func(t *testing.T) {
		refreshPayload := map[string]interface{}{
			"refresh_token": "test-refresh-token",
		}

		payloadBytes, err := json.Marshal(refreshPayload)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/auth/refresh", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 200 OK or 401 Unauthorized
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")
	})
}

func (suite *APIContractTestSuite) testQuoteGenerationEndpointContracts(t *testing.T) {
	// Test auto insurance quote contract
	t.Run("AutoInsuranceQuoteContract", func(t *testing.T) {
		quotePayload := map[string]interface{}{
			"type": "auto",
			"vehicle": map[string]interface{}{
				"make":  "Toyota",
				"model": "Camry",
				"year":  2022,
				"vin":   "1HGBH41JXMN109186",
			},
			"driver": map[string]interface{}{
				"age":              30,
				"license_number":   "D123456789",
				"years_experience": 10,
			},
			"coverage": map[string]interface{}{
				"liability":   true,
				"collision":   true,
				"comprehensive": true,
			},
		}

		payloadBytes, err := json.Marshal(quotePayload)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/quotes", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 201 Created or 400 Bad Request
		assert.True(t, resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusBadRequest)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		if resp.StatusCode == http.StatusCreated {
			// Contract: Success response structure
			var quoteResponse struct {
				QuoteID   string  `json:"quote_id"`
				Type      string  `json:"type"`
				Premium   float64 `json:"premium"`
				Currency  string  `json:"currency"`
				ValidUntil string `json:"valid_until"`
				Coverage  struct {
					Liability     float64 `json:"liability"`
					Collision     float64 `json:"collision"`
					Comprehensive float64 `json:"comprehensive"`
				} `json:"coverage"`
				CreatedAt string `json:"created_at"`
			}

			err = json.Unmarshal(body, &quoteResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, quoteResponse.QuoteID)
			assert.Equal(t, "auto", quoteResponse.Type)
			assert.Greater(t, quoteResponse.Premium, 0.0)
			assert.Equal(t, "USD", quoteResponse.Currency)
			assert.NotEmpty(t, quoteResponse.ValidUntil)
			assert.NotEmpty(t, quoteResponse.CreatedAt)
		}
	})

	// Test home insurance quote contract
	t.Run("HomeInsuranceQuoteContract", func(t *testing.T) {
		quotePayload := map[string]interface{}{
			"type": "home",
			"property": map[string]interface{}{
				"address": "123 Main St, Seattle, WA 98101",
				"type":    "single_family",
				"value":   500000,
				"year_built": 1995,
				"square_feet": 2500,
			},
			"coverage": map[string]interface{}{
				"dwelling":          true,
				"personal_property": true,
				"liability":         true,
			},
		}

		payloadBytes, err := json.Marshal(quotePayload)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/quotes", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 201 Created or 400 Bad Request
		assert.True(t, resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusBadRequest)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")
	})
}

func (suite *APIContractTestSuite) testDocumentUploadEndpointContracts(t *testing.T) {
	// Test document upload contract
	documentContent := "Test insurance document content"
	
	// Create multipart form data
	var buf bytes.Buffer
	// In a real implementation, you would use multipart.Writer
	// For this test, we'll simulate the request structure

	resp, err := suite.client.Post(
		fmt.Sprintf("%s/documents/upload", suite.baseURL),
		"multipart/form-data",
		bytes.NewBufferString(documentContent),
	)
	require.NoError(t, err)
	defer resp.Body.Close()

	// Contract: Should return 201 Created, 400 Bad Request, or 413 Payload Too Large
	assert.True(t, resp.StatusCode == http.StatusCreated || 
		resp.StatusCode == http.StatusBadRequest ||
		resp.StatusCode == http.StatusRequestEntityTooLarge)

	// Contract: Response should be JSON
	contentType := resp.Header.Get("Content-Type")
	assert.Contains(t, contentType, "application/json")

	body, err := io.ReadAll(resp.Body)
	require.NoError(t, err)

	if resp.StatusCode == http.StatusCreated {
		// Contract: Success response structure
		var uploadResponse struct {
			DocumentID   string `json:"document_id"`
			FileName     string `json:"file_name"`
			FileSize     int64  `json:"file_size"`
			ContentType  string `json:"content_type"`
			UploadedAt   string `json:"uploaded_at"`
			Status       string `json:"status"`
			AnalysisID   string `json:"analysis_id,omitempty"`
		}

		err = json.Unmarshal(body, &uploadResponse)
		require.NoError(t, err)

		assert.NotEmpty(t, uploadResponse.DocumentID)
		assert.NotEmpty(t, uploadResponse.FileName)
		assert.Greater(t, uploadResponse.FileSize, int64(0))
		assert.NotEmpty(t, uploadResponse.ContentType)
		assert.NotEmpty(t, uploadResponse.UploadedAt)
		assert.Contains(t, []string{"uploaded", "processing", "analyzed"}, uploadResponse.Status)
	}
}

func (suite *APIContractTestSuite) testPolicyManagementEndpointContracts(t *testing.T) {
	// Test get policies contract
	t.Run("GetPoliciesContract", func(t *testing.T) {
		resp, err := suite.client.Get(fmt.Sprintf("%s/policies", suite.baseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 200 OK or 401 Unauthorized
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")

		if resp.StatusCode == http.StatusOK {
			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			// Contract: Success response structure
			var policiesResponse struct {
				Policies []struct {
					PolicyID     string  `json:"policy_id"`
					Type         string  `json:"type"`
					Status       string  `json:"status"`
					Premium      float64 `json:"premium"`
					Currency     string  `json:"currency"`
					EffectiveDate string `json:"effective_date"`
					ExpirationDate string `json:"expiration_date"`
				} `json:"policies"`
				Total  int `json:"total"`
				Page   int `json:"page"`
				Limit  int `json:"limit"`
			}

			err = json.Unmarshal(body, &policiesResponse)
			require.NoError(t, err)

			assert.NotNil(t, policiesResponse.Policies)
			assert.GreaterOrEqual(t, policiesResponse.Total, 0)
			assert.GreaterOrEqual(t, policiesResponse.Page, 1)
			assert.GreaterOrEqual(t, policiesResponse.Limit, 1)

			// Validate individual policy structure if policies exist
			for _, policy := range policiesResponse.Policies {
				assert.NotEmpty(t, policy.PolicyID)
				assert.Contains(t, []string{"auto", "home", "life", "health"}, policy.Type)
				assert.Contains(t, []string{"active", "expired", "cancelled", "pending"}, policy.Status)
				assert.Greater(t, policy.Premium, 0.0)
				assert.Equal(t, "USD", policy.Currency)
				assert.NotEmpty(t, policy.EffectiveDate)
				assert.NotEmpty(t, policy.ExpirationDate)
			}
		}
	})

	// Test get specific policy contract
	t.Run("GetSpecificPolicyContract", func(t *testing.T) {
		testPolicyID := "test-policy-123"
		
		resp, err := suite.client.Get(fmt.Sprintf("%s/policies/%s", suite.baseURL, testPolicyID))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 200 OK, 404 Not Found, or 401 Unauthorized
		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusUnauthorized)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")
	})
}

func (suite *APIContractTestSuite) testErrorResponseContracts(t *testing.T) {
	// Test 404 error contract
	t.Run("NotFoundErrorContract", func(t *testing.T) {
		resp, err := suite.client.Get(fmt.Sprintf("%s/nonexistent-endpoint", suite.baseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 404 Not Found
		assert.Equal(t, http.StatusNotFound, resp.StatusCode)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		// Contract: Error response structure
		var errorResponse struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
				Details string `json:"details,omitempty"`
			} `json:"error"`
			RequestID string `json:"request_id"`
			Timestamp string `json:"timestamp"`
		}

		err = json.Unmarshal(body, &errorResponse)
		require.NoError(t, err)

		assert.Equal(t, "NOT_FOUND", errorResponse.Error.Code)
		assert.NotEmpty(t, errorResponse.Error.Message)
		assert.NotEmpty(t, errorResponse.RequestID)
		assert.NotEmpty(t, errorResponse.Timestamp)
	})

	// Test validation error contract
	t.Run("ValidationErrorContract", func(t *testing.T) {
		invalidPayload := map[string]interface{}{
			"invalid_field": "invalid_value",
		}

		payloadBytes, err := json.Marshal(invalidPayload)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/quotes", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return 400 Bad Request
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

		// Contract: Response should be JSON
		contentType := resp.Header.Get("Content-Type")
		assert.Contains(t, contentType, "application/json")

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		// Contract: Validation error response structure
		var validationErrorResponse struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
				Fields  []struct {
					Field   string `json:"field"`
					Message string `json:"message"`
				} `json:"fields"`
			} `json:"error"`
			RequestID string `json:"request_id"`
			Timestamp string `json:"timestamp"`
		}

		err = json.Unmarshal(body, &validationErrorResponse)
		require.NoError(t, err)

		assert.Equal(t, "VALIDATION_ERROR", validationErrorResponse.Error.Code)
		assert.NotEmpty(t, validationErrorResponse.Error.Message)
		assert.NotEmpty(t, validationErrorResponse.RequestID)
		assert.NotEmpty(t, validationErrorResponse.Timestamp)
	})
}

func (suite *APIContractTestSuite) testAPIVersioningContracts(t *testing.T) {
	// Test API version header contract
	t.Run("APIVersionHeaderContract", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/health", suite.baseURL), nil)
		require.NoError(t, err)

		req.Header.Set("Accept", "application/vnd.sageinsure.v1+json")

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Should return version in response headers
		apiVersion := resp.Header.Get("X-API-Version")
		assert.NotEmpty(t, apiVersion)
		assert.Regexp(t, `^v\d+\.\d+\.\d+$`, apiVersion) // e.g., v1.0.0
	})

	// Test deprecated endpoint contract
	t.Run("DeprecatedEndpointContract", func(t *testing.T) {
		resp, err := suite.client.Get(fmt.Sprintf("%s/v1/deprecated-endpoint", suite.baseURL))
		require.NoError(t, err)
		defer resp.Body.Close()

		// Contract: Deprecated endpoints should include deprecation headers
		if resp.StatusCode == http.StatusOK {
			deprecationHeader := resp.Header.Get("Deprecation")
			sunsetHeader := resp.Header.Get("Sunset")
			
			// At least one deprecation indicator should be present
			assert.True(t, deprecationHeader != "" || sunsetHeader != "",
				"Deprecated endpoints should include Deprecation or Sunset headers")
		}
	})
}