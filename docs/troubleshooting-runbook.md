# SageInsure AKS Migration Troubleshooting Runbook

This runbook provides step-by-step procedures for diagnosing and resolving common issues with the SageInsure AKS Terraform migration.

## Quick Reference

### Emergency Contacts

- **DevOps Team**: devops@sageinsure.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Azure Support**: Portal or phone support

### Critical Resources

- **Resource Group**: `sageinsure-rg`
- **AKS Cluster**: `sageinsure-aks`
- **Key Vault**: `kv-eedfa81f`
- **Storage Account**: `policydocseedfa81f`

## Common Issues and Solutions

### 1. AKS Cluster Issues

#### Issue: AKS Cluster Not Responding

**Symptoms**:

- `kubectl` commands timeout
- Applications not accessible
- Pods stuck in pending state

**Diagnosis**:

```bash
# Check cluster status
az aks show --resource-group sageinsure-rg --name sageinsure-aks --query provisioningState

# Check node status
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system
```

**Resolution**:

1. **Check cluster health**:

   ```bash
   az aks show --resource-group sageinsure-rg --name sageinsure-aks
   ```

2. **Restart cluster if needed**:

   ```bash
   az aks stop --resource-group sageinsure-rg --name sageinsure-aks
   az aks start --resource-group sageinsure-rg --name sageinsure-aks
   ```

3. **Scale node pools**:
   ```bash
   az aks nodepool scale --cluster-name sageinsure-aks \
     --resource-group sageinsure-rg \
     --name nodepool1 \
     --node-count 3
   ```

#### Issue: Pods Failing to Start

**Symptoms**:

- Pods in `CrashLoopBackOff` state
- Image pull errors
- Resource constraints

**Diagnosis**:

```bash
# Check pod status
kubectl get pods -o wide

# Describe failing pod
kubectl describe pod <pod-name>

# Check pod logs
kubectl logs <pod-name> --previous
```

**Resolution**:

1. **Image pull issues**:

   ```bash
   # Check if image exists
   az acr repository show --name <registry> --image <image>

   # Update image pull secrets
   kubectl create secret docker-registry acr-secret \
     --docker-server=<registry>.azurecr.io \
     --docker-username=<username> \
     --docker-password=<password>
   ```

2. **Resource constraints**:

   ```bash
   # Check node resources
   kubectl top nodes
   kubectl describe node <node-name>

   # Scale cluster if needed
   az aks scale --resource-group sageinsure-rg \
     --name sageinsure-aks \
     --node-count 5
   ```

3. **Configuration issues**:

   ```bash
   # Check ConfigMaps and Secrets
   kubectl get configmaps
   kubectl get secrets

   # Verify environment variables
   kubectl exec -it <pod-name> -- env
   ```

### 2. Networking Issues

#### Issue: Service Not Accessible

**Symptoms**:

- External services not reachable
- Internal service communication failing
- DNS resolution issues

**Diagnosis**:

```bash
# Check services
kubectl get services

# Check ingress
kubectl get ingress

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default
```

**Resolution**:

1. **Check ingress controller**:

   ```bash
   kubectl get pods -n ingress-nginx
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
   ```

2. **Verify service endpoints**:

   ```bash
   kubectl get endpoints
   kubectl describe service <service-name>
   ```

3. **Check network policies**:
   ```bash
   kubectl get networkpolicies
   kubectl describe networkpolicy <policy-name>
   ```

#### Issue: Load Balancer Not Working

**Symptoms**:

- External IP stuck in `<pending>` state
- Traffic not reaching pods

**Diagnosis**:

```bash
# Check load balancer service
kubectl get service <service-name> -o yaml

# Check Azure load balancer
az network lb list --resource-group MC_sageinsure-rg_sageinsure-aks_eastus
```

**Resolution**:

1. **Check service configuration**:

   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: my-service
   spec:
     type: LoadBalancer
     ports:
       - port: 80
         targetPort: 8080
     selector:
       app: my-app
   ```

2. **Verify Azure quotas**:
   ```bash
   az vm list-usage --location eastus --query "[?name.value=='publicIPAddresses']"
   ```

### 3. Authentication and Authorization Issues

#### Issue: RBAC Permission Denied

**Symptoms**:

- `kubectl` commands return permission errors
- Pods cannot access Azure services
- Service accounts not working

**Diagnosis**:

```bash
# Check current user permissions
kubectl auth can-i --list

# Check service account
kubectl get serviceaccount
kubectl describe serviceaccount <sa-name>

# Check role bindings
kubectl get rolebindings,clusterrolebindings
```

**Resolution**:

1. **Update kubeconfig**:

   ```bash
   az aks get-credentials --resource-group sageinsure-rg \
     --name sageinsure-aks --overwrite-existing
   ```

2. **Check Azure AD integration**:

   ```bash
   az aks show --resource-group sageinsure-rg \
     --name sageinsure-aks \
     --query aadProfile
   ```

3. **Fix RBAC bindings**:
   ```bash
   kubectl create clusterrolebinding cluster-admin-binding \
     --clusterrole=cluster-admin \
     --user=<user-email>
   ```

#### Issue: Workload Identity Not Working

**Symptoms**:

- Pods cannot access Azure Key Vault
- Managed identity authentication failing

**Diagnosis**:

```bash
# Check workload identity configuration
kubectl describe serviceaccount <sa-name>

# Check federated identity
az identity federated-credential list \
  --identity-name <identity-name> \
  --resource-group sageinsure-rg
```

**Resolution**:

1. **Verify service account annotations**:

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: workload-identity-sa
     annotations:
       azure.workload.identity/client-id: <client-id>
   ```

2. **Check pod labels**:
   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     labels:
       azure.workload.identity/use: "true"
   spec:
     serviceAccountName: workload-identity-sa
   ```

### 4. Storage and Persistent Volume Issues

#### Issue: Persistent Volume Claims Stuck

**Symptoms**:

- PVCs in `Pending` state
- Pods cannot mount volumes
- Storage class issues

**Diagnosis**:

```bash
# Check PVCs
kubectl get pvc

# Check storage classes
kubectl get storageclass

# Check persistent volumes
kubectl get pv
```

**Resolution**:

1. **Check storage class**:

   ```bash
   kubectl describe storageclass managed-csi
   ```

2. **Verify Azure disk quotas**:

   ```bash
   az vm list-usage --location eastus --query "[?name.value=='disks']"
   ```

3. **Create manual PV if needed**:
   ```yaml
   apiVersion: v1
   kind: PersistentVolume
   metadata:
     name: manual-pv
   spec:
     capacity:
       storage: 10Gi
     accessModes:
       - ReadWriteOnce
     azureDisk:
       diskName: <disk-name>
       diskURI: <disk-uri>
   ```

### 5. Application-Specific Issues

#### Issue: FastAPI Application Not Starting

**Symptoms**:

- API pods crashing
- Health checks failing
- Database connection errors

**Diagnosis**:

```bash
# Check pod logs
kubectl logs deployment/sageinsure-api

# Check environment variables
kubectl exec deployment/sageinsure-api -- env | grep -E "(DATABASE|OPENAI|SEARCH)"

# Test health endpoint
kubectl port-forward deployment/sageinsure-api 8080:8000
curl http://localhost:8080/healthz
```

**Resolution**:

1. **Check secrets**:

   ```bash
   kubectl get secret sageinsure-secrets -o yaml
   ```

2. **Verify Azure service connectivity**:

   ```bash
   # Test from within cluster
   kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
     curl -H "Authorization: Bearer <token>" \
     https://sageinsure-openai.openai.azure.com/
   ```

3. **Update configuration**:
   ```bash
   kubectl edit configmap sageinsure-config
   kubectl rollout restart deployment/sageinsure-api
   ```

#### Issue: Next.js Frontend Not Loading

**Symptoms**:

- Frontend returns 404 errors
- Static assets not loading
- Build failures

**Diagnosis**:

```bash
# Check frontend pods
kubectl get pods -l app=sageinsure-frontend

# Check ingress configuration
kubectl describe ingress sageinsure-ingress

# Check service
kubectl describe service sageinsure-frontend
```

**Resolution**:

1. **Check build process**:

   ```bash
   # Verify image build
   docker run --rm <registry>/sageinsure-frontend:latest npm run build
   ```

2. **Update ingress rules**:
   ```yaml
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: sageinsure-ingress
   spec:
     rules:
       - host: sageinsure.local
         http:
           paths:
             - path: /
               pathType: Prefix
               backend:
                 service:
                   name: sageinsure-frontend
                   port:
                     number: 80
   ```

### 6. Monitoring and Observability Issues

#### Issue: Prometheus Not Collecting Metrics

**Symptoms**:

- Missing metrics in Grafana
- Prometheus targets down
- ServiceMonitor not working

**Diagnosis**:

```bash
# Check Prometheus pods
kubectl get pods -n monitoring

# Check Prometheus configuration
kubectl get prometheus -n monitoring -o yaml

# Check service monitors
kubectl get servicemonitor -n monitoring
```

**Resolution**:

1. **Restart Prometheus**:

   ```bash
   kubectl rollout restart statefulset/prometheus-prometheus -n monitoring
   ```

2. **Check service monitor labels**:
   ```yaml
   apiVersion: monitoring.coreos.com/v1
   kind: ServiceMonitor
   metadata:
     name: sageinsure-api-monitor
     labels:
       app: sageinsure-api
   spec:
     selector:
       matchLabels:
         app: sageinsure-api
     endpoints:
       - port: metrics
   ```

### 7. Terraform and Infrastructure Issues

#### Issue: Terraform Apply Failures

**Symptoms**:

- Terraform plan/apply errors
- Resource conflicts
- State file corruption

**Diagnosis**:

```bash
# Check Terraform state
terraform state list
terraform show

# Validate configuration
terraform validate
terraform plan
```

**Resolution**:

1. **Fix state issues**:

   ```bash
   # Refresh state
   terraform refresh

   # Import existing resources
   terraform import azurerm_kubernetes_cluster.main /subscriptions/.../resourceGroups/.../providers/Microsoft.ContainerService/managedClusters/sageinsure-aks
   ```

2. **Resolve conflicts**:

   ```bash
   # Force unlock if needed
   terraform force-unlock <lock-id>

   # Remove problematic resources from state
   terraform state rm azurerm_resource_group.main
   ```

#### Issue: Azure Resource Quota Exceeded

**Symptoms**:

- Resource creation failures
- Quota exceeded errors
- Regional capacity issues

**Diagnosis**:

```bash
# Check quotas
az vm list-usage --location eastus
az network list-usages --location eastus
```

**Resolution**:

1. **Request quota increase**:

   ```bash
   # Create support request through Azure portal
   # Or use Azure CLI
   az support tickets create \
     --ticket-name "Quota Increase Request" \
     --description "Need to increase VM quota for AKS deployment"
   ```

2. **Use different region**:
   ```bash
   # Update Terraform variables
   variable "location" {
     default = "westus2"
   }
   ```

## Escalation Procedures

### Level 1: Self-Service Resolution

1. Check this runbook
2. Review application logs
3. Verify basic connectivity
4. Restart services if safe

### Level 2: Team Support

1. Contact DevOps team via Slack
2. Create incident ticket
3. Provide diagnostic information
4. Follow team guidance

### Level 3: Vendor Support

1. Open Azure support case
2. Engage Microsoft support
3. Provide detailed logs and configuration
4. Follow vendor recommendations

## Monitoring and Alerting

### Key Metrics to Monitor

- **Cluster Health**: Node status, pod restarts
- **Application Performance**: Response times, error rates
- **Resource Utilization**: CPU, memory, storage
- **Network**: Connectivity, DNS resolution

### Alert Thresholds

- **Critical**: Service down, cluster unreachable
- **Warning**: High resource usage, increased error rates
- **Info**: Deployment events, configuration changes

### Monitoring Tools

- **Azure Monitor**: Infrastructure metrics and logs
- **Prometheus/Grafana**: Application metrics and dashboards
- **kubectl**: Real-time cluster status
- **Azure CLI**: Resource status and configuration

## Backup and Recovery

### Backup Procedures

1. **Kubernetes Resources**:

   ```bash
   # Backup all resources
   kubectl get all --all-namespaces -o yaml > cluster-backup.yaml

   # Backup specific namespace
   kubectl get all -n sageinsure -o yaml > sageinsure-backup.yaml
   ```

2. **Persistent Data**:
   ```bash
   # Create disk snapshots
   az snapshot create \
     --resource-group sageinsure-rg \
     --name backup-$(date +%Y%m%d) \
     --source <disk-id>
   ```

### Recovery Procedures

1. **Restore from backup**:

   ```bash
   kubectl apply -f cluster-backup.yaml
   ```

2. **Disaster recovery**:
   ```bash
   # Deploy to secondary region
   terraform apply -var="location=westus2"
   ```

## Preventive Maintenance

### Regular Tasks

- **Weekly**: Review cluster health, update documentation
- **Monthly**: Update Kubernetes version, review security patches
- **Quarterly**: Disaster recovery testing, capacity planning

### Health Checks

```bash
# Run automated health checks
bash scripts/test-health-checks.sh

# Manual verification
kubectl get nodes
kubectl get pods --all-namespaces
az aks show --resource-group sageinsure-rg --name sageinsure-aks
```

## Documentation Updates

When resolving issues:

1. Update this runbook with new solutions
2. Document root cause analysis
3. Share learnings with the team
4. Update monitoring and alerting as needed

## Contact Information

- **Primary On-Call**: devops-oncall@sageinsure.com
- **Secondary On-Call**: sre-team@sageinsure.com
- **Management Escalation**: engineering-manager@sageinsure.com
- **Azure Support**: https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade
