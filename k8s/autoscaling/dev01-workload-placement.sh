#!/usr/bin/env bash
set -euo pipefail

CTX="${CTX:-aks-sageinfra-new-dev01}"
NS="${NS:-sageinfra-new-agents}"

# Pin SageInfra application workloads to the enterprise user node pool.
# The user pool is labeled by AKS nodepool creation with workload=sageinfra.
for deployment in \
  claims-manager \
  marine-specialist \
  policy-assistant \
  sageinfra-agentcore \
  sageinfra-frontend \
  underwriter-agent; do
  kubectl --context "$CTX" -n "$NS" patch deployment "$deployment" \
    --type merge \
    -p '{"spec":{"template":{"spec":{"nodeSelector":{"workload":"sageinfra"}}}}}'
done

kubectl --context "$CTX" -n "$NS" get pods -o wide
