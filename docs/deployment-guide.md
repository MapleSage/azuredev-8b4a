# SageInsure AKS Migration Deployment Guide

This guide provides step-by-step instructions for deploying the SageInsure application to Azure Kubernetes Service (AKS) using Terraform.

## Overview

The deployment process involves:

1. Infrastructure provisioning with Terraform
2. Application deployment with Helm charts
3. Configuration and verification
4. Monitoring setup

## Prerequisites

### Required Tools

- **Terraform** 1.6+
- **Azure CLI** 2.50+
- **kubectl** 1.28+
- **Helm** 3.12+
- **Docker** (for building images)

### Required Permissions

- **Azure Subscription**: Contributor or Owner role
- **Azure AD**: Application Administrator (for service principals)
- **Container Registry**: AcrPush role

### Environment Setup

1. **Install required tools**:

   ```bash
   # Install Azure CLI
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

   # Install Terraform
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/

   # Install kubectl
   curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
   sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

   # Install Helm
   curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
   ```

2. **Authenticate with Azure**:
   ```bash
   az login
   az account set --subscription "your-subscription-id"
   ```

## Deployment Steps

### Phase 1: Infrastructure Deployment

#### Step 1: Prepare Terraform Configuration

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-org/sageinsure-aks-migration.git
   cd sageinsure-aks-migration
   ```

2. **Configure Terraform variables**:

   ```bash
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   ```

   Edit `terraform/terraform.tfvars`:

   ```hcl
   # Basic Configuration
   environment = "production"
   location    = "East US"

   # Networking
   vnet_address_space = ["10.0.0.0/16"]
   aks_subnet_cidr    = "10.0.1.0/24"
   pods_subnet_cidr   = "10.0.2.0/24"

   # AKS Configuration
   kubernetes_version = "1.28.3"
   node_count        = 3
   node_vm_size      = "Standard_D4s_v3"

   # Application Configuration
   enable_monitoring = true
   enable_ingress   = true
   ```

#### Step 2: Initialize and Plan Terraform

1. **Initialize Terraform**:

   ```bash
   cd terraform
   terraform init
   ```

2. **Create execution plan**:

   ```bash
   terraform plan -out=tfplan
   ```

3. **Review the plan** and ensure all resources are correct.

#### Step 3: Deploy Infrastructure

1. **Apply Terraform configuration**:

   ```bash
   terraform apply tfplan
   ```

2. **Verify deployment**:

   ```bash
   # Check resource group
   az group show --name sageinsure-rg

   # Check AKS cluster
   az aks show --resource-group sageinsure-rg --name sageinsure-aks

   # Get AKS credentials
   az aks get-credentials --resource-group sageinsure-rg --name sageinsure-aks

   # Verify cluster connectivity
   kubectl cluster-info
   kubectl get nodes
   ```

### Phase 2: Application Deployment

#### Step 1: Prepare Container Images

1. **Build application images**:

   ```bash
   # Build API image
   docker build -t sageinsure-api:latest ./backend

   # Build frontend image
   docker build -t sageinsure-frontend:latest ./frontend
   ```

2. **Push to Azure Container Registry**:

   ```bash
   # Get ACR login server
   ACR_NAME=$(terraform output -raw acr_name)

   # Login to ACR
   az acr login --name $ACR_NAME

   # Tag and push images
   docker tag sageinsure-api:latest $ACR_NAME.azurecr.io/sageinsure-api:v1.0.0
   docker tag sageinsure-frontend:latest $ACR_NAME.azurecr.io/sageinsure-frontend:v1.0.0

   docker push $ACR_NAME.azurecr.io/sageinsure-api:v1.0.0
   docker push $ACR_NAME.azurecr.io/sageinsure-frontend:v1.0.0
   ```

#### Step 2: Configure Kubernetes Secrets

1. **Create namespace**:

   ```bash
   kubectl create namespace sageinsure
   ```

2. **Configure secrets** (if not using Key Vault CSI driver):
   ```bash
   kubectl create secret generic sageinsure-secrets \
     --from-literal=openai-api-key="your-openai-key" \
     --from-literal=search-api-key="your-search-key" \
     --from-literal=database-connection-string="your-db-connection" \
     -n sageinsure
   ```

#### Step 3: Deploy Applications with Helm

1. **Add Helm repositories**:

   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo update
   ```

2. **Deploy ingress controller**:

   ```bash
   helm install ingress-nginx ingress-nginx/ingress-nginx \
     --namespace ingress-nginx \
     --create-namespace \
     --set controller.service.type=LoadBalancer
   ```

3. **Deploy monitoring stack**:

   ```bash
   helm install prometheus prometheus-community/kube-prometheus-stack \
     --namespace monitoring \
     --create-namespace \
     --values helm/monitoring/values.yaml
   ```

4. **Deploy SageInsure application**:

   ```bash
   # Deploy API
   helm install sageinsure-api ./helm/sageinsure-api \
     --namespace sageinsure \
     --set image.repository=$ACR_NAME.azurecr.io/sageinsure-api \
     --set image.tag=v1.0.0

   # Deploy frontend
   helm install sageinsure-frontend ./helm/sageinsure-frontend \
     --namespace sageinsure \
     --set image.repository=$ACR_NAME.azurecr.io/sageinsure-frontend \
     --set image.tag=v1.0.0
   ```

#### Step 4: Configure Ingress and DNS

1. **Get ingress controller external IP**:

   ```bash
   kubectl get service ingress-nginx-controller -n ingress-nginx
   ```

2. **Configure DNS records**:

   ```bash
   # Create A records pointing to the external IP
   # sageinsure.local -> <external-ip>
   # api.sageinsure.local -> <external-ip>
   ```

3. **Deploy ingress resources**:
   ```bash
   kubectl apply -f k8s/ingress.yaml
   ```

### Phase 3: Verification and Testing

#### Step 1: Health Checks

1. **Run infrastructure health checks**:

   ```bash
   bash scripts/test-health-checks.sh
   ```

2. **Verify application pods**:
   ```bash
   kubectl get pods -n sageinsure
   kubectl get services -n sageinsure
   kubectl get ingress -n sageinsure
   ```

#### Step 2: Application Testing

1. **Test API endpoints**:

   ```bash
   # Health check
   curl https://api.sageinsure.local/healthz

   # API functionality
   curl -X POST https://api.sageinsure.local/api/v1/query \
     -H "Content-Type: application/json" \
     -d '{"query": "test query"}'
   ```

2. **Test frontend**:
   ```bash
   curl -I https://sageinsure.local
   ```

#### Step 3: Load Testing

1. **Run load tests**:
   ```bash
   cd tests/load
   k6 run --vus 10 --duration 5m k6-load-test.js
   ```

### Phase 4: Monitoring and Observability

#### Step 1: Configure Monitoring

1. **Access Grafana dashboard**:

   ```bash
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
   # Access http://localhost:3000 (admin/prom-operator)
   ```

2. **Import custom dashboards**:
   - Navigate to Grafana UI
   - Import dashboards from `monitoring/dashboards/`

#### Step 2: Set Up Alerting

1. **Configure AlertManager**:

   ```bash
   kubectl apply -f monitoring/alerts/
   ```

2. **Test alerts**:
   ```bash
   # Trigger test alert
   kubectl scale deployment sageinsure-api --replicas=0 -n sageinsure
   # Wait for alert, then restore
   kubectl scale deployment sageinsure-api --replicas=3 -n sageinsure
   ```

## Environment-Specific Configurations

### Development Environment

```hcl
# terraform/environments/dev/terraform.tfvars
environment = "dev"
node_count  = 1
node_vm_size = "Standard_B2s"
enable_monitoring = false
```

### Staging Environment

```hcl
# terraform/environments/staging/terraform.tfvars
environment = "staging"
node_count  = 2
node_vm_size = "Standard_D2s_v3"
enable_monitoring = true
```

### Production Environment

```hcl
# terraform/environments/prod/terraform.tfvars
environment = "production"
node_count  = 5
node_vm_size = "Standard_D4s_v3"
enable_monitoring = true
enable_backup = true
```

## CI/CD Integration

### GitHub Actions Deployment

1. **Configure secrets**:

   ```bash
   # In GitHub repository settings, add secrets:
   AZURE_CLIENT_ID
   AZURE_CLIENT_SECRET
   AZURE_SUBSCRIPTION_ID
   AZURE_TENANT_ID
   ACR_USERNAME
   ACR_PASSWORD
   ```

2. **Deployment workflow**:

   ```yaml
   # .github/workflows/deploy.yml
   name: Deploy to AKS
   on:
     push:
       branches: [main]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - name: Deploy Infrastructure
           run: |
             terraform init
             terraform apply -auto-approve
         - name: Deploy Application
           run: |
             helm upgrade --install sageinsure-api ./helm/sageinsure-api
   ```

### Azure DevOps Deployment

1. **Create service connection** in Azure DevOps
2. **Configure pipeline**:

   ```yaml
   # azure-pipelines.yml
   trigger:
     branches:
       include:
         - main

   stages:
     - stage: Infrastructure
       jobs:
         - job: Terraform
           steps:
             - task: TerraformInstaller@0
             - task: TerraformTaskV4@4
               inputs:
                 command: "apply"

     - stage: Application
       jobs:
         - job: Deploy
           steps:
             - task: HelmDeploy@0
               inputs:
                 command: "upgrade"
                 chartPath: "./helm/sageinsure-api"
   ```

## Rollback Procedures

### Application Rollback

1. **Helm rollback**:

   ```bash
   # List releases
   helm list -n sageinsure

   # Rollback to previous version
   helm rollback sageinsure-api -n sageinsure
   ```

2. **Manual rollback**:
   ```bash
   # Deploy previous image version
   kubectl set image deployment/sageinsure-api \
     api=$ACR_NAME.azurecr.io/sageinsure-api:v0.9.0 \
     -n sageinsure
   ```

### Infrastructure Rollback

1. **Terraform rollback**:

   ```bash
   # Revert to previous state
   git checkout <previous-commit>
   terraform plan
   terraform apply
   ```

2. **Emergency procedures**:

   ```bash
   # Scale down problematic resources
   kubectl scale deployment sageinsure-api --replicas=0 -n sageinsure

   # Redirect traffic
   kubectl patch ingress sageinsure-ingress -p '{"spec":{"rules":[]}}'
   ```

## Security Considerations

### Network Security

1. **Private cluster** (recommended for production):

   ```hcl
   private_cluster_enabled = true
   authorized_ip_ranges    = ["10.0.0.0/8"]
   ```

2. **Network policies**:
   ```bash
   kubectl apply -f k8s/network-policies/
   ```

### Secret Management

1. **Use Azure Key Vault CSI driver**:
   ```yaml
   apiVersion: secrets-store.csi.x-k8s.io/v1
   kind: SecretProviderClass
   metadata:
     name: sageinsure-secrets
   spec:
     provider: azure
     parameters:
       keyvaultName: kv-eedfa81f
       objects: |
         array:
           - |
             objectName: openai-api-key
             objectType: secret
   ```

### RBAC Configuration

1. **Create service accounts**:

   ```bash
   kubectl create serviceaccount sageinsure-api -n sageinsure
   ```

2. **Apply RBAC policies**:
   ```bash
   kubectl apply -f k8s/rbac/
   ```

## Maintenance and Updates

### Regular Maintenance Tasks

1. **Weekly**:

   - Review cluster health
   - Check for security updates
   - Monitor resource usage

2. **Monthly**:

   - Update Kubernetes version
   - Update Helm charts
   - Review and rotate secrets

3. **Quarterly**:
   - Disaster recovery testing
   - Capacity planning review
   - Security audit

### Update Procedures

1. **Kubernetes cluster update**:

   ```bash
   # Check available versions
   az aks get-upgrades --resource-group sageinsure-rg --name sageinsure-aks

   # Upgrade cluster
   az aks upgrade --resource-group sageinsure-rg --name sageinsure-aks --kubernetes-version 1.28.4
   ```

2. **Application updates**:
   ```bash
   # Update Helm chart
   helm upgrade sageinsure-api ./helm/sageinsure-api \
     --set image.tag=v1.1.0 \
     -n sageinsure
   ```

## Troubleshooting

For troubleshooting issues, refer to the [Troubleshooting Runbook](troubleshooting-runbook.md).

Common issues:

- **Pod startup failures**: Check logs and resource limits
- **Network connectivity**: Verify ingress and service configuration
- **Authentication issues**: Check RBAC and service accounts
- **Performance problems**: Review resource allocation and scaling

## Support and Documentation

- **Technical Documentation**: `/docs/`
- **API Documentation**: `https://api.sageinsure.local/docs`
- **Monitoring Dashboards**: Grafana at `https://monitoring.sageinsure.local`
- **Support Contact**: devops@sageinsure.com

## Appendix

### Useful Commands

```bash
# Cluster information
kubectl cluster-info
kubectl get nodes -o wide
kubectl top nodes

# Application status
kubectl get all -n sageinsure
kubectl describe pod <pod-name> -n sageinsure
kubectl logs -f deployment/sageinsure-api -n sageinsure

# Terraform operations
terraform plan
terraform apply
terraform destroy
terraform output

# Helm operations
helm list --all-namespaces
helm status sageinsure-api -n sageinsure
helm history sageinsure-api -n sageinsure
```

### Resource Sizing Guidelines

| Environment | Node Count | Node Size       | Total vCPUs | Total RAM |
| ----------- | ---------- | --------------- | ----------- | --------- |
| Development | 1          | Standard_B2s    | 2           | 4 GB      |
| Staging     | 2          | Standard_D2s_v3 | 4           | 8 GB      |
| Production  | 3-5        | Standard_D4s_v3 | 12-20       | 24-40 GB  |

### Cost Optimization

- Use **Spot instances** for non-critical workloads
- Enable **cluster autoscaler** for dynamic scaling
- Implement **resource quotas** to prevent over-provisioning
- Use **Azure Reserved Instances** for predictable workloads
- Monitor costs with **Azure Cost Management**
