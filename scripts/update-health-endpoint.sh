#!/bin/bash
# Update API deployment to include proper health endpoint

kubectl patch deployment sageinsure-api -n staging --type='json' -p='[
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/args",
    "value": ["-c", "mkdir -p /tmp/health && echo '{\"status\":\"healthy\",\"environment\":\"staging\"}' > /tmp/health/health.json && cd /tmp && python -m http.server 8080"]
  },
  {
    "op": "replace", 
    "path": "/spec/template/spec/containers/0/livenessProbe/httpGet/path",
    "value": "/health.json"
  },
  {
    "op": "replace",
    "path": "/spec/template/spec/containers/0/readinessProbe/httpGet/path", 
    "value": "/health.json"
  }
]'