#!/usr/bin/env python3
"""
Locust load testing script for SageInsure application
"""

import json
import random
import time
from locust import HttpUser, task, between, events
from locust.exception import StopUser

class SageInsureUser(HttpUser):
    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    
    def on_start(self):
        """Called when a user starts"""
        self.auth_token = None
        self.user_data = {
            "email": f"test{random.randint(1, 1000)}@example.com",
            "password": "testpass123"
        }
        self.authenticate()
    
    def authenticate(self):
        """Authenticate user and get access token"""
        response = self.client.post("/auth/login", json=self.user_data)
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                self.auth_token = data.get("access_token")
                if not self.auth_token:
                    print(f"No access token in response: {data}")
            except json.JSONDecodeError:
                print(f"Invalid JSON in auth response: {response.text}")
        else:
            print(f"Authentication failed: {response.status_code} - {response.text}")
    
    @property
    def auth_headers(self):
        """Get authorization headers"""
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}
    
    @task(3)
    def view_homepage(self):
        """Load the homepage"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                if "SageInsure" in response.text:
                    response.success()
                else:
                    response.failure("Homepage doesn't contain expected content")
            else:
                response.failure(f"Got status code {response.status_code}")
    
    @task(5)
    def check_api_health(self):
        """Check API health endpoint"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data.get("status") == "healthy":
                        response.success()
                    else:
                        response.failure("API not healthy")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in health response")
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(4)
    def generate_quote(self):
        """Generate an insurance quote"""
        if not self.auth_token:
            return
        
        quote_types = [
            {
                "type": "auto",
                "vehicle": {
                    "make": random.choice(["Toyota", "Honda", "Ford", "BMW"]),
                    "model": random.choice(["Camry", "Civic", "F-150", "X3"]),
                    "year": random.randint(2015, 2024)
                },
                "coverage": random.choice(["basic", "full", "premium"])
            },
            {
                "type": "home",
                "property": {
                    "type": "house",
                    "value": random.randint(200000, 800000),
                    "location": random.choice(["Seattle, WA", "Portland, OR", "San Francisco, CA"])
                },
                "coverage": random.choice(["basic", "comprehensive", "premium"])
            },
            {
                "type": "life",
                "person": {
                    "age": random.randint(25, 65),
                    "health": random.choice(["excellent", "good", "fair"]),
                    "coverage": random.randint(100000, 1000000)
                },
                "term": random.choice([10, 15, 20, 30])
            }
        ]
        
        quote_data = random.choice(quote_types)
        
        with self.client.post("/quotes", 
                            json=quote_data, 
                            headers=self.auth_headers,
                            catch_response=True) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if "quote_id" in data:
                        response.success()
                        # Store quote_id for later use
                        if not hasattr(self, 'quote_ids'):
                            self.quote_ids = []
                        self.quote_ids.append(data["quote_id"])
                    else:
                        response.failure("No quote_id in response")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in quote response")
            else:
                response.failure(f"Quote generation failed: {response.status_code}")
    
    @task(2)
    def upload_document(self):
        """Upload a document for analysis"""
        if not self.auth_token:
            return
        
        # Simulate document content
        document_content = f"Test insurance document {random.randint(1, 1000)}"
        document_types = ["policy_document", "claim_form", "medical_record", "vehicle_registration"]
        
        files = {
            'file': ('test_document.txt', document_content, 'text/plain')
        }
        data = {
            'document_type': random.choice(document_types)
        }
        
        with self.client.post("/documents/upload",
                            files=files,
                            data=data,
                            headers=self.auth_headers,
                            catch_response=True) as response:
            if response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if "document_id" in data:
                        response.success()
                    else:
                        response.failure("No document_id in response")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in upload response")
            else:
                response.failure(f"Document upload failed: {response.status_code}")
    
    @task(2)
    def view_policies(self):
        """View user's policies"""
        if not self.auth_token:
            return
        
        with self.client.get("/policies",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "policies" in data and isinstance(data["policies"], list):
                        response.success()
                    else:
                        response.failure("Invalid policies response format")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in policies response")
            else:
                response.failure(f"Policies view failed: {response.status_code}")
    
    @task(1)
    def search_policies(self):
        """Search through policies"""
        if not self.auth_token:
            return
        
        search_terms = ["auto", "home", "life", "health", "travel"]
        search_term = random.choice(search_terms)
        
        with self.client.get(f"/policies/search?q={search_term}",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "results" in data:
                        response.success()
                    else:
                        response.failure("Invalid search response format")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in search response")
            else:
                response.failure(f"Policy search failed: {response.status_code}")
    
    @task(1)
    def get_quote_details(self):
        """Get details of a previously generated quote"""
        if not self.auth_token or not hasattr(self, 'quote_ids') or not self.quote_ids:
            return
        
        quote_id = random.choice(self.quote_ids)
        
        with self.client.get(f"/quotes/{quote_id}",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    if "quote_id" in data:
                        response.success()
                    else:
                        response.failure("Invalid quote details response")
                except json.JSONDecodeError:
                    response.failure("Invalid JSON in quote details response")
            elif response.status_code == 404:
                # Quote not found, remove from list
                self.quote_ids.remove(quote_id)
                response.success()  # This is expected behavior
            else:
                response.failure(f"Quote details failed: {response.status_code}")


class AdminUser(HttpUser):
    """Admin user with different behavior patterns"""
    wait_time = between(2, 5)
    weight = 1  # Lower weight means fewer admin users
    
    def on_start(self):
        self.auth_token = None
        self.admin_data = {
            "email": "admin@sageinsure.com",
            "password": "adminpass123"
        }
        self.authenticate()
    
    def authenticate(self):
        """Authenticate admin user"""
        response = self.client.post("/auth/login", json=self.admin_data)
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                self.auth_token = data.get("access_token")
            except json.JSONDecodeError:
                pass
    
    @property
    def auth_headers(self):
        if self.auth_token:
            return {"Authorization": f"Bearer {self.auth_token}"}
        return {}
    
    @task(3)
    def view_dashboard(self):
        """View admin dashboard"""
        if not self.auth_token:
            return
        
        with self.client.get("/admin/dashboard",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Dashboard failed: {response.status_code}")
    
    @task(2)
    def view_analytics(self):
        """View system analytics"""
        if not self.auth_token:
            return
        
        with self.client.get("/admin/analytics",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Analytics failed: {response.status_code}")
    
    @task(1)
    def manage_users(self):
        """Manage users"""
        if not self.auth_token:
            return
        
        with self.client.get("/admin/users",
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"User management failed: {response.status_code}")


# Event handlers for custom metrics
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, context, **kwargs):
    """Custom request handler for additional metrics"""
    if exception:
        print(f"Request failed: {request_type} {name} - {exception}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts"""
    print("Starting SageInsure load test...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops"""
    print("SageInsure load test completed.")


# Custom user classes for different scenarios
class SpikeTestUser(SageInsureUser):
    """User class for spike testing - more aggressive behavior"""
    wait_time = between(0.1, 0.5)  # Very short wait times
    
    @task(10)
    def rapid_health_checks(self):
        """Rapid health check requests"""
        self.check_api_health()


class StressTestUser(SageInsureUser):
    """User class for stress testing - sustained high load"""
    wait_time = between(0.5, 1)  # Short wait times
    
    @task(5)
    def continuous_quote_generation(self):
        """Continuous quote generation"""
        self.generate_quote()
    
    @task(3)
    def continuous_document_upload(self):
        """Continuous document uploads"""
        self.upload_document()


if __name__ == "__main__":
    # This allows running the script directly for testing
    import subprocess
    import sys
    
    print("To run this load test, use:")
    print("locust -f tests/load/locust-load-test.py --host=https://api.sageinsure.local")
    print("\nFor web UI: locust -f tests/load/locust-load-test.py --host=https://api.sageinsure.local --web-host=0.0.0.0")
    print("\nFor headless: locust -f tests/load/locust-load-test.py --host=https://api.sageinsure.local --headless -u 50 -r 5 -t 300s")