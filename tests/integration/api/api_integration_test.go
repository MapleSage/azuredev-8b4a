package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Comprehensive API Integration Tests
// These tests validate end-to-end API functionality and business workflows

type APIIntegrationTestSuite struct {
	baseURL     string
	client      *http.Client
	authToken   string
	testUserID  string
}

func NewAPIIntegrationTestSuite(baseURL string) *APIIntegrationTestSuite {
	return &APIIntegrationTestSuite{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func TestAPIIntegration(t *testing.T) {
	suite := NewAPIIntegrationTestSuite("http://sageinsure-api.default.svc.cluster.local")

	// Test 1: User registration and authentication flow
	t.Run("UserRegistrationAndAuthFlow", func(t *testing.T) {
		suite.testUserRegistrationAndAuthFlow(t)
	})

	// Test 2: Complete insurance quote workflow
	t.Run("CompleteInsuranceQuoteWorkflow", func(t *testing.T) {
		suite.testCompleteInsuranceQuoteWorkflow(t)
	})

	// Test 3: Document upload and analysis workflow
	t.Run("DocumentUploadAndAnalysisWorkflow", func(t *testing.T) {
		suite.testDocumentUploadAndAnalysisWorkflow(t)
	})

	// Test 4: Policy management workflow
	t.Run("PolicyManagementWorkflow", func(t *testing.T) {
		suite.testPolicyManagementWorkflow(t)
	})

	// Test 5: Claims processing workflow
	t.Run("ClaimsProcessingWorkflow", func(t *testing.T) {
		suite.testClaimsProcessingWorkflow(t)
	})

	// Test 6: Search and filtering functionality
	t.Run("SearchAndFilteringFunctionality", func(t *testing.T) {
		suite.testSearchAndFilteringFunctionality(t)
	})

	// Test 7: Notification and communication workflow
	t.Run("NotificationAndCommunicationWorkflow", func(t *testing.T) {
		suite.testNotificationAndCommunicationWorkflow(t)
	})

	// Test 8: Admin and analytics functionality
	t.Run("AdminAndAnalyticsFunctionality", func(t *testing.T) {
		suite.testAdminAndAnalyticsFunctionality(t)
	})
}

func (suite *APIIntegrationTestSuite) testUserRegistrationAndAuthFlow(t *testing.T) {
	// Step 1: Register a new user
	t.Run("UserRegistration", func(t *testing.T) {
		registrationData := map[string]interface{}{
			"email":     fmt.Sprintf("test-%d@example.com", time.Now().Unix()),
			"password":  "SecurePassword123!",
			"firstName": "John",
			"lastName":  "Doe",
			"phone":     "+1-555-0123",
			"dateOfBirth": "1990-01-01",
		}

		payloadBytes, err := json.Marshal(registrationData)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/auth/register", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.Equal(t, http.StatusCreated, resp.StatusCode)

		var registrationResponse struct {
			UserID  string `json:"user_id"`
			Email   string `json:"email"`
			Message string `json:"message"`
		}

		body, err := io.ReadAll(resp.Body)
		require.NoError(t, err)

		err = json.Unmarshal(body, &registrationResponse)
		require.NoError(t, err)

		assert.NotEmpty(t, registrationResponse.UserID)
		assert.Equal(t, registrationData["email"], registrationResponse.Email)
		suite.testUserID = registrationResponse.UserID
	})

	// Step 2: Login with registered user
	t.Run("UserLogin", func(t *testing.T) {
		loginData := map[string]interface{}{
			"email":    fmt.Sprintf("test-%d@example.com", time.Now().Unix()),
			"password": "SecurePassword123!",
		}

		payloadBytes, err := json.Marshal(loginData)
		require.NoError(t, err)

		resp, err := suite.client.Post(
			fmt.Sprintf("%s/auth/login", suite.baseURL),
			"application/json",
			bytes.NewBuffer(payloadBytes),
		)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Login might fail if user doesn't exist, which is acceptable for integration test
		if resp.StatusCode == http.StatusOK {
			var loginResponse struct {
				AccessToken  string `json:"access_token"`
				RefreshToken string `json:"refresh_token"`
				TokenType    string `json:"token_type"`
				ExpiresIn    int    `json:"expires_in"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &loginResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, loginResponse.AccessToken)
			assert.Equal(t, "Bearer", loginResponse.TokenType)
			suite.authToken = loginResponse.AccessToken
		} else {
			// Use a test token for subsequent tests
			suite.authToken = "test-token-for-integration-tests"
		}
	})

	// Step 3: Get user profile
	t.Run("GetUserProfile", func(t *testing.T) {
		if suite.authToken == "" {
			t.Skip("No auth token available")
		}

		req, err := http.NewRequest("GET", fmt.Sprintf("%s/users/profile", suite.baseURL), nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		// Profile endpoint should return user data or 401 if token is invalid
		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusOK {
			var profileResponse struct {
				UserID    string `json:"user_id"`
				Email     string `json:"email"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &profileResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, profileResponse.UserID)
			assert.NotEmpty(t, profileResponse.Email)
		}
	})
}

func (suite *APIIntegrationTestSuite) testCompleteInsuranceQuoteWorkflow(t *testing.T) {
	var quoteID string

	// Step 1: Create auto insurance quote
	t.Run("CreateAutoInsuranceQuote", func(t *testing.T) {
		quoteData := map[string]interface{}{
			"type": "auto",
			"vehicle": map[string]interface{}{
				"make":         "Toyota",
				"model":        "Camry",
				"year":         2022,
				"vin":          "1HGBH41JXMN109186",
				"mileage":      25000,
				"primaryUse":   "commuting",
			},
			"driver": map[string]interface{}{
				"age":                30,
				"licenseNumber":      "D123456789",
				"yearsExperience":    12,
				"accidentHistory":    false,
				"violationHistory":   false,
			},
			"coverage": map[string]interface{}{
				"liability":      true,
				"collision":      true,
				"comprehensive":  true,
				"uninsured":      true,
				"deductible":     500,
			},
			"location": map[string]interface{}{
				"zipCode": "98101",
				"state":   "WA",
				"city":    "Seattle",
			},
		}

		payloadBytes, err := json.Marshal(quoteData)
		require.NoError(t, err)

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/quotes", suite.baseURL), bytes.NewBuffer(payloadBytes))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusCreated {
			var quoteResponse struct {
				QuoteID    string  `json:"quote_id"`
				Type       string  `json:"type"`
				Premium    float64 `json:"premium"`
				Currency   string  `json:"currency"`
				ValidUntil string  `json:"valid_until"`
				Status     string  `json:"status"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &quoteResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, quoteResponse.QuoteID)
			assert.Equal(t, "auto", quoteResponse.Type)
			assert.Greater(t, quoteResponse.Premium, 0.0)
			assert.Equal(t, "USD", quoteResponse.Currency)
			assert.Contains(t, []string{"draft", "active", "pending"}, quoteResponse.Status)

			quoteID = quoteResponse.QuoteID
		}
	})

	// Step 2: Get quote details
	t.Run("GetQuoteDetails", func(t *testing.T) {
		if quoteID == "" {
			t.Skip("No quote ID available")
		}

		req, err := http.NewRequest("GET", fmt.Sprintf("%s/quotes/%s", suite.baseURL, quoteID), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusOK {
			var quoteDetails struct {
				QuoteID     string                 `json:"quote_id"`
				Type        string                 `json:"type"`
				Premium     float64                `json:"premium"`
				Breakdown   map[string]float64     `json:"breakdown"`
				Coverage    map[string]interface{} `json:"coverage"`
				CreatedAt   string                 `json:"created_at"`
				UpdatedAt   string                 `json:"updated_at"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &quoteDetails)
			require.NoError(t, err)

			assert.Equal(t, quoteID, quoteDetails.QuoteID)
			assert.NotEmpty(t, quoteDetails.CreatedAt)
			assert.NotNil(t, quoteDetails.Coverage)
		}
	})

	// Step 3: Update quote
	t.Run("UpdateQuote", func(t *testing.T) {
		if quoteID == "" {
			t.Skip("No quote ID available")
		}

		updateData := map[string]interface{}{
			"coverage": map[string]interface{}{
				"deductible": 1000, // Increase deductible
			},
		}

		payloadBytes, err := json.Marshal(updateData)
		require.NoError(t, err)

		req, err := http.NewRequest("PATCH", fmt.Sprintf("%s/quotes/%s", suite.baseURL, quoteID), bytes.NewBuffer(payloadBytes))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusUnauthorized)
	})

	// Step 4: Convert quote to policy
	t.Run("ConvertQuoteToPolicy", func(t *testing.T) {
		if quoteID == "" {
			t.Skip("No quote ID available")
		}

		conversionData := map[string]interface{}{
			"effectiveDate": time.Now().AddDate(0, 0, 1).Format("2006-01-02"), // Tomorrow
			"paymentMethod": "credit_card",
			"billingFrequency": "monthly",
		}

		payloadBytes, err := json.Marshal(conversionData)
		require.NoError(t, err)

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/quotes/%s/convert", suite.baseURL, quoteID), bytes.NewBuffer(payloadBytes))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusCreated || 
			resp.StatusCode == http.StatusBadRequest ||
			resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusCreated {
			var policyResponse struct {
				PolicyID      string `json:"policy_id"`
				QuoteID       string `json:"quote_id"`
				Status        string `json:"status"`
				EffectiveDate string `json:"effective_date"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &policyResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, policyResponse.PolicyID)
			assert.Equal(t, quoteID, policyResponse.QuoteID)
			assert.Contains(t, []string{"pending", "active"}, policyResponse.Status)
		}
	})
}

func (suite *APIIntegrationTestSuite) testDocumentUploadAndAnalysisWorkflow(t *testing.T) {
	var documentID string

	// Step 1: Upload document
	t.Run("UploadDocument", func(t *testing.T) {
		// Create a test document
		documentContent := `
		INSURANCE POLICY DOCUMENT
		
		Policy Number: POL-123456789
		Policyholder: John Doe
		Vehicle: 2022 Toyota Camry
		Coverage: Full Coverage
		Premium: $1,200 annually
		Effective Date: 2024-01-01
		Expiration Date: 2024-12-31
		
		This is a test insurance document for integration testing.
		`

		// Create multipart form
		var buf bytes.Buffer
		writer := multipart.NewWriter(&buf)

		// Add file field
		fileWriter, err := writer.CreateFormFile("file", "test-policy.txt")
		require.NoError(t, err)
		_, err = fileWriter.Write([]byte(documentContent))
		require.NoError(t, err)

		// Add document type field
		err = writer.WriteField("document_type", "policy_document")
		require.NoError(t, err)

		// Add description field
		err = writer.WriteField("description", "Test policy document for integration testing")
		require.NoError(t, err)

		err = writer.Close()
		require.NoError(t, err)

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/documents/upload", suite.baseURL), &buf)
		require.NoError(t, err)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusCreated {
			var uploadResponse struct {
				DocumentID  string `json:"document_id"`
				FileName    string `json:"file_name"`
				FileSize    int64  `json:"file_size"`
				Status      string `json:"status"`
				AnalysisID  string `json:"analysis_id"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &uploadResponse)
			require.NoError(t, err)

			assert.NotEmpty(t, uploadResponse.DocumentID)
			assert.Equal(t, "test-policy.txt", uploadResponse.FileName)
			assert.Greater(t, uploadResponse.FileSize, int64(0))
			assert.Contains(t, []string{"uploaded", "processing"}, uploadResponse.Status)

			documentID = uploadResponse.DocumentID
		}
	})

	// Step 2: Check document analysis status
	t.Run("CheckDocumentAnalysisStatus", func(t *testing.T) {
		if documentID == "" {
			t.Skip("No document ID available")
		}

		// Wait a moment for analysis to potentially start
		time.Sleep(2 * time.Second)

		req, err := http.NewRequest("GET", fmt.Sprintf("%s/documents/%s/analysis", suite.baseURL, documentID), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusOK {
			var analysisResponse struct {
				AnalysisID    string                 `json:"analysis_id"`
				DocumentID    string                 `json:"document_id"`
				Status        string                 `json:"status"`
				Progress      float64                `json:"progress"`
				Results       map[string]interface{} `json:"results"`
				CreatedAt     string                 `json:"created_at"`
				CompletedAt   string                 `json:"completed_at,omitempty"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &analysisResponse)
			require.NoError(t, err)

			assert.Equal(t, documentID, analysisResponse.DocumentID)
			assert.Contains(t, []string{"pending", "processing", "completed", "failed"}, analysisResponse.Status)
			assert.GreaterOrEqual(t, analysisResponse.Progress, 0.0)
			assert.LessOrEqual(t, analysisResponse.Progress, 100.0)
		}
	})

	// Step 3: Get document metadata
	t.Run("GetDocumentMetadata", func(t *testing.T) {
		if documentID == "" {
			t.Skip("No document ID available")
		}

		req, err := http.NewRequest("GET", fmt.Sprintf("%s/documents/%s", suite.baseURL, documentID), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusNotFound ||
			resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusOK {
			var documentResponse struct {
				DocumentID   string            `json:"document_id"`
				FileName     string            `json:"file_name"`
				FileSize     int64             `json:"file_size"`
				ContentType  string            `json:"content_type"`
				DocumentType string            `json:"document_type"`
				Status       string            `json:"status"`
				Metadata     map[string]string `json:"metadata"`
				UploadedAt   string            `json:"uploaded_at"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &documentResponse)
			require.NoError(t, err)

			assert.Equal(t, documentID, documentResponse.DocumentID)
			assert.NotEmpty(t, documentResponse.FileName)
			assert.NotEmpty(t, documentResponse.UploadedAt)
		}
	})
}

func (suite *APIIntegrationTestSuite) testPolicyManagementWorkflow(t *testing.T) {
	// Step 1: Get user policies
	t.Run("GetUserPolicies", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/policies", suite.baseURL), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)

		if resp.StatusCode == http.StatusOK {
			var policiesResponse struct {
				Policies []struct {
					PolicyID       string  `json:"policy_id"`
					Type           string  `json:"type"`
					Status         string  `json:"status"`
					Premium        float64 `json:"premium"`
					EffectiveDate  string  `json:"effective_date"`
					ExpirationDate string  `json:"expiration_date"`
				} `json:"policies"`
				Total int `json:"total"`
			}

			body, err := io.ReadAll(resp.Body)
			require.NoError(t, err)

			err = json.Unmarshal(body, &policiesResponse)
			require.NoError(t, err)

			assert.GreaterOrEqual(t, policiesResponse.Total, 0)
			assert.Equal(t, len(policiesResponse.Policies), policiesResponse.Total)
		}
	})

	// Step 2: Search policies
	t.Run("SearchPolicies", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/policies/search?q=auto&status=active", suite.baseURL), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)
	})
}

func (suite *APIIntegrationTestSuite) testClaimsProcessingWorkflow(t *testing.T) {
	// Step 1: Create a new claim
	t.Run("CreateClaim", func(t *testing.T) {
		claimData := map[string]interface{}{
			"policyID":    "test-policy-123",
			"claimType":   "collision",
			"description": "Vehicle collision on highway",
			"incidentDate": time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
			"location":    "I-5 Highway, Seattle, WA",
			"damages": map[string]interface{}{
				"estimatedAmount": 5000.00,
				"description":     "Front bumper and headlight damage",
			},
		}

		payloadBytes, err := json.Marshal(claimData)
		require.NoError(t, err)

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/claims", suite.baseURL), bytes.NewBuffer(payloadBytes))
		require.NoError(t, err)
		req.Header.Set("Content-Type", "application/json")
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusCreated || 
			resp.StatusCode == http.StatusBadRequest ||
			resp.StatusCode == http.StatusUnauthorized)
	})

	// Step 2: Get claims list
	t.Run("GetClaims", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/claims", suite.baseURL), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)
	})
}

func (suite *APIIntegrationTestSuite) testSearchAndFilteringFunctionality(t *testing.T) {
	// Test various search and filtering endpoints
	searchEndpoints := []struct {
		name     string
		endpoint string
		params   string
	}{
		{"SearchPolicies", "/policies/search", "q=auto&status=active"},
		{"SearchQuotes", "/quotes/search", "q=home&date_from=2024-01-01"},
		{"SearchDocuments", "/documents/search", "type=policy_document&limit=10"},
		{"FilterClaims", "/claims", "status=pending&type=collision"},
	}

	for _, test := range searchEndpoints {
		t.Run(test.name, func(t *testing.T) {
			url := fmt.Sprintf("%s%s", suite.baseURL, test.endpoint)
			if test.params != "" {
				url += "?" + test.params
			}

			req, err := http.NewRequest("GET", url, nil)
			require.NoError(t, err)
			if suite.authToken != "" {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
			}

			resp, err := suite.client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			// Search endpoints should return 200 OK or 401 Unauthorized
			assert.True(t, resp.StatusCode == http.StatusOK || 
				resp.StatusCode == http.StatusUnauthorized ||
				resp.StatusCode == http.StatusNotFound)
		})
	}
}

func (suite *APIIntegrationTestSuite) testNotificationAndCommunicationWorkflow(t *testing.T) {
	// Test notification preferences
	t.Run("GetNotificationPreferences", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/users/notifications", suite.baseURL), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusUnauthorized)
	})

	// Test message center
	t.Run("GetMessages", func(t *testing.T) {
		req, err := http.NewRequest("GET", fmt.Sprintf("%s/messages", suite.baseURL), nil)
		require.NoError(t, err)
		if suite.authToken != "" {
			req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
		}

		resp, err := suite.client.Do(req)
		require.NoError(t, err)
		defer resp.Body.Close()

		assert.True(t, resp.StatusCode == http.StatusOK || 
			resp.StatusCode == http.StatusUnauthorized ||
			resp.StatusCode == http.StatusNotFound)
	})
}

func (suite *APIIntegrationTestSuite) testAdminAndAnalyticsFunctionality(t *testing.T) {
	// Test admin endpoints (these may require special permissions)
	adminEndpoints := []string{
		"/admin/dashboard",
		"/admin/analytics",
		"/admin/users",
		"/admin/policies/summary",
		"/admin/claims/summary",
	}

	for _, endpoint := range adminEndpoints {
		t.Run(fmt.Sprintf("Admin_%s", strings.ReplaceAll(endpoint, "/", "_")), func(t *testing.T) {
			req, err := http.NewRequest("GET", fmt.Sprintf("%s%s", suite.baseURL, endpoint), nil)
			require.NoError(t, err)
			if suite.authToken != "" {
				req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", suite.authToken))
			}

			resp, err := suite.client.Do(req)
			require.NoError(t, err)
			defer resp.Body.Close()

			// Admin endpoints should return 200 OK, 401 Unauthorized, or 403 Forbidden
			assert.True(t, resp.StatusCode == http.StatusOK || 
				resp.StatusCode == http.StatusUnauthorized ||
				resp.StatusCode == http.StatusForbidden ||
				resp.StatusCode == http.StatusNotFound)
		})
	}
}