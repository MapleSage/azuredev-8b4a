# dev01 enterprise infrastructure hardening plan

## Current live findings
- AKS cluster: `aks-sageinfra-new-dev01` in `rg-sageinfra-new-dev01`, Kubernetes 1.34, AKS tier `Free`.
- Node pool: single system pool `nodepool1`, `Standard_B2s`, count 1, cluster autoscaler disabled.
- Node pressure: requested resources are already high for a one-node cluster: CPU requests 1757m/92%, memory requests 2664Mi/95%.
- Workloads: all pods are pinned onto the single B2s node.
- Load balancer: Azure Standard Load Balancer already exists with public IP `20.102.7.114` for `sageinfra-frontend`.
- Service exposure: frontend is a single `LoadBalancer` service; backend agents are internal ClusterIP services.
- Kubernetes resiliency gaps: no HPAs or PDBs currently present in `sageinfra-new-agents`; most backend deployments lack readiness/liveness probes.
- VPN gateway: no Azure VPN Gateway resource exists in `rg-sageinfra-new-dev01`. If “VPN” means actual private network access, this is a new architecture decision, not autoscaling of an existing VPN.

## Recommended enterprise-grade target for dev01
1. Upgrade AKS to Standard tier for API server SLA.
2. Add a new non-burstable system node pool:
   - Name: `sysent`
   - Mode: System
   - Size: `Standard_D4s_v5` or equivalent current-gen 4 vCPU SKU
   - Autoscaler: min 2, max 3
   - Zones: 1,2,3 if quota/region supports it
3. Add a user workload node pool:
   - Name: `userent`
   - Mode: User
   - Size: `Standard_D4s_v5`
   - Autoscaler: min 2, max 6
   - Zones: 1,2,3 if supported
4. Keep the old `Standard_B2s` pool only as a temporary migration fallback; drain/delete it after workloads are verified on enterprise pools.
5. Apply HPA/PDB manifests for service resilience and safe rolling updates.
6. Convert frontend deployment away from `Recreate` before scaling it horizontally. Current Caddy TLS storage is local `emptyDir`; multi-replica Caddy should use shared cert storage or move TLS to Front Door/App Gateway/Application Gateway for Containers.
7. For actual VPN/private access: create a separate design for zone-redundant Azure VPN Gateway (`VpnGw2AZ` or higher, active-active/BGP if needed). There is no existing VPN gateway to autoscale.

## Exact AKS scale commands, pending approval
These commands create paid Azure capacity and should be approved before execution.

```bash
az aks update \
  --resource-group rg-sageinfra-new-dev01 \
  --name aks-sageinfra-new-dev01 \
  --tier standard

az aks nodepool add \
  --resource-group rg-sageinfra-new-dev01 \
  --cluster-name aks-sageinfra-new-dev01 \
  --name sysent \
  --mode System \
  --node-vm-size Standard_D4s_v5 \
  --node-count 2 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 3 \
  --zones 1 2 3 \
  --labels pool=system-enterprise workload=system

az aks nodepool add \
  --resource-group rg-sageinfra-new-dev01 \
  --cluster-name aks-sageinfra-new-dev01 \
  --name userent \
  --mode User \
  --node-vm-size Standard_D4s_v5 \
  --node-count 2 \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 6 \
  --zones 1 2 3 \
  --labels pool=user-enterprise workload=sageinfra
```

## Exact workload hardening commands, after new nodes exist
```bash
kubectl --context aks-sageinfra-new-dev01 apply -f k8s/autoscaling/dev01-hpa-pdb.yaml
```

After the new node pools are Ready, update/patch workload placement to prefer `workload=sageinfra`, then verify:

```bash
kubectl --context aks-sageinfra-new-dev01 get nodes -o wide
kubectl --context aks-sageinfra-new-dev01 -n sageinfra-new-agents get deploy,hpa,pdb,svc,pods -o wide
kubectl --context aks-sageinfra-new-dev01 -n sageinfra-new-agents top pods
```
