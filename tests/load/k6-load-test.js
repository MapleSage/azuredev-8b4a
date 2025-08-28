import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("error_rate");
const responseTime = new Trend("response_time");
const requestCount = new Counter("request_count");

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: "2m", target: 10 }, // Ramp up to 10 users over 2 minutes
    { duration: "5m", target: 10 }, // Stay at 10 users for 5 minutes
    { duration: "2m", target: 50 }, // Ramp up to 50 users over 2 minutes
    { duration: "10m", target: 50 }, // Stay at 50 users for 10 minutes
    { duration: "2m", target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: "10m", target: 100 }, // Stay at 100 users for 10 minutes
    { duration: "5m", target: 0 }, // Ramp down to 0 users over 5 minutes
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests should be below 2s
    http_req_failed: ["rate<0.05"], // Error rate should be less than 5%
    error_rate: ["rate<0.05"], // Custom error rate should be less than 5%
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || "https://sageinsure.local";
const API_URL = __ENV.API_URL || "https://api.sageinsure.local";

// Test data
const testUsers = [
  { email: "test1@example.com", password: "testpass123" },
  { email: "test2@example.com", password: "testpass123" },
  { email: "test3@example.com", password: "testpass123" },
];

const insuranceQuotes = [
  {
    type: "auto",
    vehicle: { make: "Toyota", model: "Camry", year: 2020 },
    coverage: "full",
  },
  {
    type: "home",
    property: { type: "house", value: 300000, location: "Seattle, WA" },
    coverage: "comprehensive",
  },
  {
    type: "life",
    person: { age: 35, health: "good", coverage: 500000 },
    term: 20,
  },
];

export default function () {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const quote =
    insuranceQuotes[Math.floor(Math.random() * insuranceQuotes.length)];

  // Test 1: Homepage load
  testHomepage();

  // Test 2: API health check
  testAPIHealth();

  // Test 3: User authentication
  const authToken = testAuthentication(user);

  if (authToken) {
    // Test 4: Insurance quote generation
    testQuoteGeneration(authToken, quote);

    // Test 5: Document upload
    testDocumentUpload(authToken);

    // Test 6: Policy management
    testPolicyManagement(authToken);
  }

  sleep(1); // Wait 1 second between iterations
}

function testHomepage() {
  const response = http.get(`${BASE_URL}/`);

  const success = check(response, {
    "homepage status is 200": (r) => r.status === 200,
    "homepage loads in <2s": (r) => r.timings.duration < 2000,
    "homepage contains title": (r) => r.body.includes("SageInsure"),
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
}

function testAPIHealth() {
  const response = http.get(`${API_URL}/health`);

  const success = check(response, {
    "API health status is 200": (r) => r.status === 200,
    "API health responds in <1s": (r) => r.timings.duration < 1000,
    "API health returns JSON": (r) =>
      r.headers["Content-Type"].includes("application/json"),
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
}

function testAuthentication(user) {
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(`${API_URL}/auth/login`, loginPayload, params);

  const success = check(response, {
    "login status is 200 or 201": (r) => [200, 201].includes(r.status),
    "login responds in <3s": (r) => r.timings.duration < 3000,
    "login returns token": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.access_token !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);

  if (success && response.status < 300) {
    try {
      const body = JSON.parse(response.body);
      return body.access_token;
    } catch {
      return null;
    }
  }

  return null;
}

function testQuoteGeneration(authToken, quoteData) {
  const payload = JSON.stringify(quoteData);

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = http.post(`${API_URL}/quotes`, payload, params);

  const success = check(response, {
    "quote generation status is 200 or 201": (r) =>
      [200, 201].includes(r.status),
    "quote generation responds in <5s": (r) => r.timings.duration < 5000,
    "quote returns quote_id": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.quote_id !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
}

function testDocumentUpload(authToken) {
  // Simulate document upload with a small test file
  const fileData = "test document content for insurance analysis";

  const params = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const response = http.post(
    `${API_URL}/documents/upload`,
    {
      file: http.file(fileData, "test-document.txt", "text/plain"),
      document_type: "policy_document",
    },
    params
  );

  const success = check(response, {
    "document upload status is 200 or 201": (r) =>
      [200, 201].includes(r.status),
    "document upload responds in <10s": (r) => r.timings.duration < 10000,
    "document upload returns document_id": (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.document_id !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
}

function testPolicyManagement(authToken) {
  const params = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  // Test getting user policies
  const response = http.get(`${API_URL}/policies`, params);

  const success = check(response, {
    "policies list status is 200": (r) => r.status === 200,
    "policies list responds in <2s": (r) => r.timings.duration < 2000,
    "policies list returns array": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.policies);
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);
  responseTime.add(response.timings.duration);
  requestCount.add(1);
}

// Stress test scenario
export function stressTest() {
  const response = http.get(`${API_URL}/health`);
  check(response, {
    "stress test - API responds": (r) => r.status < 500,
  });
}

// Spike test scenario
export function spikeTest() {
  const responses = http.batch([
    ["GET", `${BASE_URL}/`],
    ["GET", `${API_URL}/health`],
    ["GET", `${API_URL}/quotes`],
  ]);

  responses.forEach((response, index) => {
    check(response, {
      [`spike test ${index} - status ok`]: (r) => r.status < 500,
    });
  });
}

// Volume test scenario
export function volumeTest() {
  const user = testUsers[0];
  const authToken = testAuthentication(user);

  if (authToken) {
    // Generate multiple quotes rapidly
    for (let i = 0; i < 5; i++) {
      const quote = insuranceQuotes[i % insuranceQuotes.length];
      testQuoteGeneration(authToken, quote);
    }
  }
}
