# SageInsure Security and Compliance Guide

## Overview

This guide covers the comprehensive security and compliance controls implemented for the SageInsure application on Azure Kubernetes Service (AKS).

## Security Architecture

The security implementation follows a defense-in-depth approach with multiple layers:

1. **Pod Security Standards**: Kubernetes-native pod security controls
2. **Network Policies**: Zero-trust network segmentation
3. **OPA Gatekeeper**: Policy-as-code admission control
4. **RBAC**: Least-privilege access control
5. **Container Security**: Image scanning and runtime security
6. **Compliance Monitoring**: Continuous compliance validation

## Components

### 1. Pod Security Standards

#### Implementation

- **Production namespace**: `restricted` security policy
- **Staging namespace**: `baseline` security policy with `restricted` audit
- **Development namespace**: `baseline` security policy

#### Key Controls

- Non-root user execution
- Read-only root filesystem
- No privilege escalation
- Dropped capabilities
- Seccomp profiles

#### Configuration Files

- `kubernetes/security/pod-security/pod-security-standards.yaml`

### 2. Network Policies

#### Zero-Trust Model

- Default deny all ingress and egress traffic
- Explicit allow rules for required communication
- DNS resolution allowed for all pods
- Monitoring access from monitoring namespace

#### Network Segmentation

- **API pods**: Only accept traffic from ingress controller
- **Frontend pods**: Can communicate with API, accept ingress traffic
- **Worker pods**: Can access Azure services via HTTPS
- **Cross-namespace**: Monitoring and ingress access only

#### Configuration Files

- `kubernetes/security/network-policies/network-policies.yaml`

### 3. OPA Gatekeeper Policies

#### Constraint Templates

- **K8sRequireSecurityContext**: Enforces security context settings
- **K8sRequireResourceLimits**: Mandates resource limits and requests
- **K8sDisallowPrivileged**: Prevents privileged containers
- **K8sRequireLabels**: Ensures proper labeling

#### Applied Constraints

- Security context enforcement for SageInsure workloads
- Resource limits for all deployments
- Label requirements for proper identification
- Privileged container prevention

#### Configuration Files

- `kubernetes/security/opa-gatekeeper/constraint-templates.yaml`
- `kubernetes/security/opa-gatekeeper/constraints.yaml`

### 4. RBAC Configuration

#### Service Accounts

- **sageinsure-api-sa**: Minimal permissions for API operations
- **sageinsure-frontend-sa**: Frontend-specific permissions
- **sageinsure-worker-sa**: Batch job and worker permissions

#### Roles and Permissions

- **API Role**: ConfigMap/Secret read access, pod listing
- **Worker Role**: Job creation, ConfigMap/Secret access
- **Monitoring Role**: Read-only cluster access

#### Configuration Files

- `kubernetes/security/rbac/service-accounts.yaml`

### 5. Container Security Scanning

#### CI/CD Integration

- **Code scanning**: Semgrep, Bandit, npm audit
- **Container scanning**: Trivy, Grype, Snyk
- **Kubernetes scanning**: Checkov
- **SARIF integration**: GitHub Security tab integration

#### Scan Types

- **Static code analysis**: Security vulnerabilities in source code
- **Dependency scanning**: Known vulnerabilities in dependencies
- **Container image scanning**: OS and application vulnerabilities
- **Infrastructure scanning**: Kubernetes misconfigurations

#### Configuration Files

- `.github/workflows/security-scanning.yaml`

## Deployment

### Prerequisites

- AKS cluster with RBAC enabled
- Helm 3.x installed
- kubectl configured for cluster access
- Appropriate Azure permissions

### Installation

1. **Deploy all security controls:**

   ```bash
   ./scripts/deploy-security.sh
   ```

2. **Validate deployment:**
   ```bash
   ./scripts/validate-security.sh
   ```

### Manual Deployment Steps

1. **Install OPA Gatekeeper:**

   ```bash
   helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts
   helm install gatekeeper gatekeeper/gatekeeper --namespace gatekeeper-system --create-namespace
   ```

2. **Apply Pod Security Standards:**

   ```bash
   kubectl apply -f kubernetes/security/pod-security/pod-security-standards.yaml
   ```

3. **Apply Network Policies:**

   ```bash
   kubectl apply -f kubernetes/security/network-policies/network-policies.yaml
   ```

4. **Apply RBAC configurations:**

   ```bash
   kubectl apply -f kubernetes/security/rbac/service-accounts.yaml
   ```

5. **Apply Gatekeeper policies:**
   ```bash
   kubectl apply -f kubernetes/security/opa-gatekeeper/constraint-templates.yaml
   kubectl apply -f kubernetes/security/opa-gatekeeper/constraints.yaml
   ```

## Security Controls

### 1. Runtime Security

#### Container Security Context

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  runAsGroup: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault
```

#### Container-level Security

```yaml
containerSecurityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  capabilities:
    drop: [ALL]
  seccompProfile:
    type: RuntimeDefault
```

### 2. Network Security

#### Default Deny Policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
```

#### Selective Allow Rules

- DNS resolution (UDP/TCP 53)
- HTTPS to Azure services (TCP 443)
- Inter-service communication (specific ports)
- Monitoring access (TCP 8080, 9090)

### 3. Admission Control

#### Gatekeeper Policies

- **Security Context Validation**: Ensures proper security settings
- **Resource Limits**: Prevents resource exhaustion
- **Label Requirements**: Enforces proper labeling
- **Privilege Prevention**: Blocks privileged containers

### 4. Access Control

#### Least Privilege RBAC

- Service-specific service accounts
- Minimal required permissions
- No cluster-admin access
- Workload Identity integration

## Compliance

### Industry Standards

#### CIS Kubernetes Benchmark

- Pod Security Standards implementation
- Network policy enforcement
- RBAC configuration
- Audit logging

#### NIST Cybersecurity Framework

- **Identify**: Asset inventory and risk assessment
- **Protect**: Access controls and security policies
- **Detect**: Monitoring and alerting
- **Respond**: Incident response procedures
- **Recover**: Backup and recovery processes

#### SOC 2 Type II

- Access controls and authentication
- System monitoring and logging
- Change management processes
- Data protection measures

### Compliance Monitoring

#### Continuous Validation

- Automated policy enforcement
- Security scanning in CI/CD
- Runtime compliance monitoring
- Regular security assessments

#### Audit Trail

- Kubernetes audit logs
- Gatekeeper violation logs
- Security scan results
- Access control logs

## Monitoring and Alerting

### Security Metrics

- Policy violations
- Failed authentication attempts
- Privileged access usage
- Network policy denials

### Alert Rules

- **Critical**: Privileged container creation attempts
- **Warning**: Policy violations
- **Info**: Security scan findings

### Integration

- Prometheus metrics collection
- Grafana dashboard visualization
- AlertManager notifications
- SIEM integration capabilities

## Incident Response

### Security Incident Types

1. **Policy Violations**: Gatekeeper constraint violations
2. **Unauthorized Access**: RBAC violations
3. **Container Vulnerabilities**: High/Critical CVEs
4. **Network Anomalies**: Unexpected traffic patterns

### Response Procedures

1. **Detection**: Automated alerting and monitoring
2. **Assessment**: Impact and scope analysis
3. **Containment**: Isolation and mitigation
4. **Eradication**: Root cause remediation
5. **Recovery**: Service restoration
6. **Lessons Learned**: Process improvement

## Maintenance

### Regular Tasks

#### Weekly

- Review security scan results
- Update vulnerability databases
- Check policy violation reports

#### Monthly

- Security policy review
- Access control audit
- Compliance assessment

#### Quarterly

- Security architecture review
- Penetration testing
- Policy effectiveness analysis

### Updates and Patches

#### Container Images

- Regular base image updates
- Security patch application
- Vulnerability remediation

#### Kubernetes Components

- Cluster version updates
- Security patch installation
- Configuration updates

#### Security Policies

- Policy rule updates
- New threat mitigation
- Compliance requirement changes

## Troubleshooting

### Common Issues

#### Gatekeeper Policy Violations

```bash
# Check constraint violations
kubectl get constraints
kubectl describe constraint <constraint-name>

# View violation details
kubectl get events --field-selector reason=ConstraintViolation
```

#### Network Policy Issues

```bash
# Test network connectivity
kubectl run test-pod --image=busybox --rm -it -- /bin/sh

# Check network policy rules
kubectl describe networkpolicy <policy-name>
```

#### RBAC Permission Denied

```bash
# Check service account permissions
kubectl auth can-i <verb> <resource> --as=system:serviceaccount:<namespace>:<sa-name>

# Review role bindings
kubectl describe rolebinding <binding-name>
```

### Debugging Commands

```bash
# Gatekeeper status
kubectl get constrainttemplates
kubectl get constraints
kubectl logs -n gatekeeper-system deployment/gatekeeper-controller-manager

# Network policies
kubectl get networkpolicies --all-namespaces
kubectl describe networkpolicy <policy-name> -n <namespace>

# RBAC
kubectl get serviceaccounts,roles,rolebindings -n <namespace>
kubectl auth can-i --list --as=system:serviceaccount:<namespace>:<sa-name>

# Security contexts
kubectl get pods -o jsonpath='{.items[*].spec.securityContext}'
```

## Best Practices

### Development

1. **Security by Design**: Implement security from the start
2. **Least Privilege**: Minimal required permissions
3. **Defense in Depth**: Multiple security layers
4. **Regular Updates**: Keep components current

### Operations

1. **Continuous Monitoring**: Real-time security monitoring
2. **Automated Enforcement**: Policy-as-code implementation
3. **Regular Audits**: Periodic security assessments
4. **Incident Preparedness**: Response plan maintenance

### Compliance

1. **Documentation**: Maintain security documentation
2. **Evidence Collection**: Audit trail preservation
3. **Regular Reviews**: Compliance validation
4. **Training**: Security awareness programs

## Integration with CI/CD

### Security Gates

- Code security scanning
- Container vulnerability assessment
- Policy compliance validation
- Deployment security checks

### Automated Remediation

- Vulnerability patching
- Policy violation alerts
- Security configuration updates
- Compliance reporting

### Continuous Improvement

- Security metrics analysis
- Policy effectiveness review
- Threat landscape adaptation
- Security tool optimization
