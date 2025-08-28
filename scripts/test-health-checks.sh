#!/bin/bash
# Test health check endpoints for SageInsure applications

set -e

NAMESPACE=${1:-default}
TIMEOUT=30

echo "🏥 Testing Health Check Endpoints in namespace: $NAMESPACE"

# Function to test HTTP endpoint
test_endpoint() {
    local service=$1
    local path=$2
    local expected_status=$3
    local description=$4
    
    echo "Testing $description..."
    
    # Port forward in background
    kubectl port-forward -n "$NAMESPACE" "svc/$service" 8080:80 &
    PF_PID=$!
    
    # Wait for port forward to be ready
    sleep 3
    
    # Test endpoint
    response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "http://localhost:8080$path" || echo "000")
    
    # Kill port forward
    kill $PF_PID 2>/dev/null || true
    
    if [ "$response" = "$expected_status" ]; then
        echo "✅ $description: HTTP $response"
        if [ -f /tmp/health_response.json ]; then
            status=$(jq -r '.status // "unknown"' /tmp/health_response.json 2>/dev/null || echo "unknown")
            echo "   Status: $status"
        fi
    else
        echo "❌ $description: Expected HTTP $expected_status, got $response"
        if [ -f /tmp/health_response.json ]; then
            echo "   Response: $(cat /tmp/health_response.json)"
        fi
        return 1
    fi
    
    rm -f /tmp/health_response.json
}

# Function to test pod health directly
test_pod_health() {
    local app_name=$1
    local path=$2
    local description=$3
    
    echo "Testing $description via pod exec..."
    
    # Get first pod
    pod=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=$app_name" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -z "$pod" ]; then
        echo "⚠️  No pods found for $app_name"
        return 1
    fi
    
    # Test endpoint directly in pod
    response=$(kubectl exec -n "$NAMESPACE" "$pod" -- curl -s -w "%{http_code}" -o /tmp/response.json "http://localhost:8000$path" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "503" ]; then
        echo "✅ $description (pod $pod): HTTP $response"
        
        # Get response body
        response_body=$(kubectl exec -n "$NAMESPACE" "$pod" -- cat /tmp/response.json 2>/dev/null || echo "{}")
        status=$(echo "$response_body" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
        echo "   Status: $status"
    else
        echo "❌ $description (pod $pod): HTTP $response"
        return 1
    fi
}

# Test API health endpoints
echo ""
echo "🔍 Testing API Health Endpoints"
echo "================================"

if kubectl get svc -n "$NAMESPACE" sageinsure-api &>/dev/null; then
    test_endpoint "sageinsure-api" "/health" "200" "API General Health Check"
    test_endpoint "sageinsure-api" "/health/live" "200" "API Liveness Probe"
    test_endpoint "sageinsure-api" "/health/ready" "200" "API Readiness Probe"
    test_endpoint "sageinsure-api" "/health/startup" "200" "API Startup Probe"
    test_endpoint "sageinsure-api" "/health?details=true" "200" "API Detailed Health Check"
    test_endpoint "sageinsure-api" "/health/metrics" "200" "API Health Metrics"
    test_endpoint "sageinsure-api" "/health/version" "200" "API Version Info"
    
    # Test pod health directly
    test_pod_health "sageinsure-api" "/health/live" "API Liveness (Direct)"
    test_pod_health "sageinsure-api" "/health/ready" "API Readiness (Direct)"
else
    echo "⚠️  API service not found in namespace $NAMESPACE"
fi

# Test Frontend health endpoints
echo ""
echo "🌐 Testing Frontend Health Endpoints"
echo "===================================="

if kubectl get svc -n "$NAMESPACE" sageinsure-frontend &>/dev/null; then
    test_endpoint "sageinsure-frontend" "/api/health" "200" "Frontend General Health Check"
    test_endpoint "sageinsure-frontend" "/api/health/live" "200" "Frontend Liveness Probe"
    test_endpoint "sageinsure-frontend" "/api/health/ready" "200" "Frontend Readiness Probe"
    test_endpoint "sageinsure-frontend" "/api/health?details=true" "200" "Frontend Detailed Health Check"
else
    echo "⚠️  Frontend service not found in namespace $NAMESPACE"
fi

# Test Worker health (if accessible)
echo ""
echo "⚙️  Testing Worker Health"
echo "========================"

worker_pods=$(kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/name=sageinsure-worker" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

if [ -n "$worker_pods" ]; then
    for pod in $worker_pods; do
        echo "Testing worker pod: $pod"
        
        # Test if worker has health endpoint (assuming it runs on port 8080)
        health_response=$(kubectl exec -n "$NAMESPACE" "$pod" -- curl -s -w "%{http_code}" -o /tmp/worker_health.json "http://localhost:8080/health" 2>/dev/null || echo "000")
        
        if [ "$health_response" = "200" ]; then
            echo "✅ Worker $pod: HTTP $health_response"
            status=$(kubectl exec -n "$NAMESPACE" "$pod" -- cat /tmp/worker_health.json 2>/dev/null | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
            echo "   Status: $status"
        else
            echo "⚠️  Worker $pod: No health endpoint or HTTP $health_response"
        fi
    done
else
    echo "⚠️  No worker pods found in namespace $NAMESPACE"
fi

# Test Kubernetes probe status
echo ""
echo "🔍 Testing Kubernetes Probe Status"
echo "=================================="

# Check pod readiness
echo "Pod Readiness Status:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/part-of=sageinsure" -o custom-columns=NAME:.metadata.name,READY:.status.conditions[?@.type==\"Ready\"].status,STATUS:.status.phase

# Check for recent restarts
echo ""
echo "Recent Pod Restarts:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/part-of=sageinsure" -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[0].restartCount,LAST-RESTART:.status.containerStatuses[0].lastState.terminated.finishedAt

# Check probe failures in events
echo ""
echo "Recent Probe Failure Events:"
kubectl get events -n "$NAMESPACE" --field-selector reason=Unhealthy --sort-by='.lastTimestamp' | tail -10 || echo "No recent probe failures"

# Performance test
echo ""
echo "⚡ Performance Testing"
echo "===================="

if kubectl get svc -n "$NAMESPACE" sageinsure-api &>/dev/null; then
    echo "Testing API health endpoint performance..."
    
    # Port forward for performance test
    kubectl port-forward -n "$NAMESPACE" svc/sageinsure-api 8080:80 &
    PF_PID=$!
    sleep 3
    
    # Run multiple requests to test performance
    total_time=0
    successful_requests=0
    failed_requests=0
    
    for i in {1..10}; do
        start_time=$(date +%s%N)
        response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8080/health" 2>/dev/null || echo "000")
        end_time=$(date +%s%N)
        
        duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [ "$response" = "200" ]; then
            successful_requests=$((successful_requests + 1))
            total_time=$((total_time + duration))
            echo "  Request $i: ${duration}ms (HTTP $response)"
        else
            failed_requests=$((failed_requests + 1))
            echo "  Request $i: Failed (HTTP $response)"
        fi
    done
    
    # Kill port forward
    kill $PF_PID 2>/dev/null || true
    
    if [ $successful_requests -gt 0 ]; then
        average_time=$((total_time / successful_requests))
        echo ""
        echo "Performance Summary:"
        echo "  Successful requests: $successful_requests/10"
        echo "  Failed requests: $failed_requests/10"
        echo "  Average response time: ${average_time}ms"
        
        if [ $average_time -lt 100 ]; then
            echo "  ✅ Performance: Excellent (< 100ms)"
        elif [ $average_time -lt 500 ]; then
            echo "  ✅ Performance: Good (< 500ms)"
        elif [ $average_time -lt 1000 ]; then
            echo "  ⚠️  Performance: Acceptable (< 1s)"
        else
            echo "  ❌ Performance: Poor (> 1s)"
        fi
    fi
fi

echo ""
echo "🏥 Health Check Testing Complete!"
echo ""
echo "📊 Summary:"
echo "- Test health endpoints for all services"
echo "- Verify Kubernetes probe configurations"
echo "- Check for recent failures and restarts"
echo "- Measure health endpoint performance"
echo ""
echo "💡 Next steps:"
echo "- Review any failed health checks"
echo "- Adjust probe timeouts if needed"
echo "- Monitor health metrics in Grafana"
echo "- Set up alerting for health check failures"