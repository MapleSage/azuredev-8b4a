#!/bin/bash
# Test Autoscaling Configuration for SageInsure

set -e

NAMESPACE=${1:-default}
LOAD_DURATION=${2:-300}  # 5 minutes default

echo "🧪 Testing Autoscaling Configuration in namespace: $NAMESPACE"
echo "Load test duration: ${LOAD_DURATION} seconds"

# Function to generate load
generate_api_load() {
    local service_url=$1
    local duration=$2
    local concurrent_requests=${3:-10}
    
    echo "🔥 Generating load on $service_url for ${duration} seconds with ${concurrent_requests} concurrent requests..."
    
    # Use Apache Bench if available, otherwise use curl in a loop
    if command -v ab &> /dev/null; then
        ab -n $((duration * concurrent_requests)) -c $concurrent_requests "$service_url/health" &
    else
        # Fallback to curl-based load generation
        for ((i=1; i<=concurrent_requests; i++)); do
            (
                end_time=$((SECONDS + duration))
                while [ $SECONDS -lt $end_time ]; do
                    curl -s "$service_url/health" > /dev/null 2>&1 || true
                    sleep 0.1
                done
            ) &
        done
    fi
    
    LOAD_PID=$!
}

# Function to monitor HPA status
monitor_hpa() {
    local hpa_name=$1
    local duration=$2
    
    echo "📊 Monitoring HPA: $hpa_name"
    
    end_time=$((SECONDS + duration))
    while [ $SECONDS -lt $end_time ]; do
        current_replicas=$(kubectl get hpa "$hpa_name" -n "$NAMESPACE" -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "0")
        desired_replicas=$(kubectl get hpa "$hpa_name" -n "$NAMESPACE" -o jsonpath='{.status.desiredReplicas}' 2>/dev/null || echo "0")
        cpu_utilization=$(kubectl get hpa "$hpa_name" -n "$NAMESPACE" -o jsonpath='{.status.currentCPUUtilizationPercentage}' 2>/dev/null || echo "0")
        
        echo "$(date '+%H:%M:%S') - $hpa_name: Current: $current_replicas, Desired: $desired_replicas, CPU: ${cpu_utilization}%"
        sleep 10
    done
}

# Function to check pod resource usage
check_resource_usage() {
    local app_name=$1
    
    echo "📈 Resource usage for $app_name:"
    kubectl top pods -n "$NAMESPACE" -l "app.kubernetes.io/name=$app_name" 2>/dev/null || echo "Metrics not available"
}

# Function to test KEDA scaling
test_keda_scaling() {
    echo "🎯 Testing KEDA scaling..."
    
    # Check if KEDA ScaledObjects exist
    scaled_objects=$(kubectl get scaledobjects -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$scaled_objects" ]; then
        for so in $scaled_objects; do
            echo "KEDA ScaledObject: $so"
            kubectl describe scaledobject "$so" -n "$NAMESPACE"
        done
    else
        echo "No KEDA ScaledObjects found"
    fi
}

# Function to simulate queue load for worker scaling
simulate_queue_load() {
    echo "📋 Simulating queue load for worker scaling..."
    
    # Try to connect to Redis and add items to queue
    redis_pod=$(kubectl get pods -n "$NAMESPACE" -l "app=redis" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
    
    if [ -n "$redis_pod" ]; then
        echo "Adding items to Redis queue..."
        for i in {1..100}; do
            kubectl exec -n "$NAMESPACE" "$redis_pod" -- redis-cli lpush "queue:document_processing" "job_$i" > /dev/null 2>&1 || true
        done
        
        # Check queue length
        queue_length=$(kubectl exec -n "$NAMESPACE" "$redis_pod" -- redis-cli llen "queue:document_processing" 2>/dev/null || echo "0")
        echo "Queue length: $queue_length"
    else
        echo "⚠️  Redis pod not found, skipping queue load simulation"
    fi
}

# Main test execution
echo ""
echo "🔍 Pre-test Status Check"
echo "======================="

# Check current HPA status
echo "Current HPA status:"
kubectl get hpa -n "$NAMESPACE" 2>/dev/null || echo "No HPAs found"

# Check current pod counts
echo ""
echo "Current pod counts:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/part-of=sageinsure" -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,CPU-REQ:.spec.containers[0].resources.requests.cpu,MEM-REQ:.spec.containers[0].resources.requests.memory

# Check VPA recommendations (if available)
echo ""
echo "VPA recommendations:"
kubectl get vpa -n "$NAMESPACE" -o custom-columns=NAME:.metadata.name,MODE:.spec.updatePolicy.updateMode,CPU-REC:.status.recommendation.containerRecommendations[0].target.cpu,MEM-REC:.status.recommendation.containerRecommendations[0].target.memory 2>/dev/null || echo "VPA not available"

# Start load testing
echo ""
echo "🚀 Starting Load Tests"
echo "====================="

# Test API autoscaling
if kubectl get svc -n "$NAMESPACE" sageinsure-api &>/dev/null; then
    echo "Testing API autoscaling..."
    
    # Port forward to API service
    kubectl port-forward -n "$NAMESPACE" svc/sageinsure-api 8080:80 &
    PF_PID=$!
    sleep 3
    
    # Generate load
    generate_api_load "http://localhost:8080" "$LOAD_DURATION" 20
    
    # Monitor HPA in background
    monitor_hpa "sageinsure-api-hpa" "$LOAD_DURATION" &
    MONITOR_PID=$!
    
    # Wait for load test to complete
    sleep "$LOAD_DURATION"
    
    # Stop load generation
    kill $LOAD_PID 2>/dev/null || true
    kill $PF_PID 2>/dev/null || true
    kill $MONITOR_PID 2>/dev/null || true
    
    echo "✅ API load test completed"
else
    echo "⚠️  API service not found, skipping API load test"
fi

# Test worker autoscaling with queue simulation
echo ""
echo "Testing worker autoscaling..."
simulate_queue_load

# Monitor worker scaling
if kubectl get hpa -n "$NAMESPACE" sageinsure-worker-hpa &>/dev/null; then
    monitor_hpa "sageinsure-worker-hpa" 120 &  # Monitor for 2 minutes
    WORKER_MONITOR_PID=$!
    sleep 120
    kill $WORKER_MONITOR_PID 2>/dev/null || true
fi

# Test KEDA scaling
test_keda_scaling

# Post-test analysis
echo ""
echo "📊 Post-test Analysis"
echo "===================="

# Check final HPA status
echo "Final HPA status:"
kubectl get hpa -n "$NAMESPACE"

# Check final pod counts
echo ""
echo "Final pod counts:"
kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/part-of=sageinsure" -o custom-columns=NAME:.metadata.name,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount

# Check resource usage
echo ""
echo "Resource usage after load test:"
for app in sageinsure-api sageinsure-frontend sageinsure-worker; do
    check_resource_usage "$app"
done

# Check HPA events
echo ""
echo "Recent HPA events:"
kubectl get events -n "$NAMESPACE" --field-selector involvedObject.kind=HorizontalPodAutoscaler --sort-by='.lastTimestamp' | tail -10

# Check scaling events
echo ""
echo "Recent scaling events:"
kubectl get events -n "$NAMESPACE" --field-selector reason=SuccessfulRescale --sort-by='.lastTimestamp' | tail -10

# Performance metrics
echo ""
echo "📈 Performance Metrics"
echo "====================="

# Check if Prometheus is available for metrics
if kubectl get svc -n monitoring prometheus-operated &>/dev/null; then
    echo "Querying Prometheus for scaling metrics..."
    
    # Port forward to Prometheus
    kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090 &
    PROM_PID=$!
    sleep 3
    
    # Query some basic metrics
    echo "CPU utilization during test:"
    curl -s "http://localhost:9090/api/v1/query?query=rate(container_cpu_usage_seconds_total{namespace=\"$NAMESPACE\",pod=~\"sageinsure-.*\"}[5m])*100" | jq -r '.data.result[] | "\(.metric.pod): \(.value[1])%"' 2>/dev/null || echo "Metrics not available"
    
    echo ""
    echo "Memory utilization during test:"
    curl -s "http://localhost:9090/api/v1/query?query=container_memory_usage_bytes{namespace=\"$NAMESPACE\",pod=~\"sageinsure-.*\"}/1024/1024" | jq -r '.data.result[] | "\(.metric.pod): \(.value[1])MB"' 2>/dev/null || echo "Metrics not available"
    
    kill $PROM_PID 2>/dev/null || true
else
    echo "⚠️  Prometheus not available for metrics"
fi

# Cleanup
echo ""
echo "🧹 Cleanup"
echo "=========="

# Clear Redis queue if it exists
redis_pod=$(kubectl get pods -n "$NAMESPACE" -l "app=redis" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$redis_pod" ]; then
    echo "Clearing Redis queue..."
    kubectl exec -n "$NAMESPACE" "$redis_pod" -- redis-cli del "queue:document_processing" > /dev/null 2>&1 || true
fi

echo ""
echo "🧪 Autoscaling test completed!"
echo ""
echo "📋 Test Summary:"
echo "- Load test duration: ${LOAD_DURATION} seconds"
echo "- Namespace: $NAMESPACE"
echo "- Components tested: API, Worker, Frontend"
echo "- Scaling mechanisms: HPA, VPA, KEDA"
echo ""
echo "💡 Next steps:"
echo "- Review scaling behavior and adjust thresholds if needed"
echo "- Monitor autoscaling in production workloads"
echo "- Set up alerts for scaling events"
echo "- Optimize resource requests and limits based on VPA recommendations"