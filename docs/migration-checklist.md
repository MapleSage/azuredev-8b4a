# SageInsure AKS Migration - Final Checklist

This document provides a comprehensive checklist for the final migration validation and production cutover.

## Pre-Migration Checklist

### ✅ Infrastructure Readiness

- [x] **AKS Cluster Deployed**: Cluster is in 'Succeeded' state with 2 node pools
- [x] **Network Configuration**: Virtual network with 3 subnets configured
- [x] **Security Setup**: Azure AD integration enabled, managed identities configured
- [x] **Key Vault Integration**: 10 secrets available, OpenAI key accessible
- [x] **Azure Services**: OpenAI, Cognitive Search, and Storage Account operational
- [x] **Monitoring**: Log Analytics workspace configured
- [x] **Autoscaling**: Cluster autoscaler and node pool autoscaling enabled

### ✅ Application Readiness

- [x] **Container Images**: Built and pushed to Azure Container Registry
- [x] **Helm Charts**: Created for API, frontend, and worker services
- [x] **Configuration**: ConfigMaps and secrets configured
- [x] **Health Checks**: /healthz endpoints implemented
- [x] **Ingress**: NGINX ingress controller deployed with TLS

### ✅ Testing and Validation

- [x] **Infrastructure Tests**: Terratest suite created and validated
- [x] **E2E Tests**: Connectivity tests passing
- [x] **Health Checks**: All infrastructure components healthy
- [x] **Load Testing**: K6 and Locust test scenarios created
- [x] **Security Scanning**: Trivy integration for container and IaC scanning

### ✅ Operational Readiness

- [x] **Documentation**: Deployment guide, troubleshooting runbook created
- [x] **Monitoring**: Prometheus/Grafana dashboards configured
- [x] **Alerting**: AlertManager rules for critical metrics
- [x] **Backup/DR**: Procedures documented, geo-replication considered
- [x] **CI/CD**: GitHub Actions workflows for infrastructure and applications

## Migration Validation Results

### Infrastructure Health: ✅ PASSED

- Azure CLI Authentication: ✅
- Resource Group: ✅
- AKS Cluster: ✅ (Succeeded state, Kubernetes 1.30.6)
- Virtual Network: ✅ (3 subnets)
- Key Vault: ✅ (10 secrets accessible)
- Storage Account: ✅
- Azure OpenAI: ✅
- Azure Cognitive Search: ✅

### Network & Connectivity: ✅ PASSED

- Subnet Configuration: ✅ (3 subnets minimum met)
- Network Security Groups: ✅
- Internet Connectivity: ✅
- Azure Management API: ✅

### Security & Identity: ✅ PASSED

- Key Vault Secrets: ✅ (10 secrets)
- OpenAI API Key: ✅
- Search API Key: ⚠️ (Warning - may need verification)
- Managed Identities: ✅ (2 identities found)

### AKS Cluster: ✅ PASSED

- Node Pools: ✅ (2 pools: system=1 node, general=2 nodes)
- Kubernetes Version: ✅ (1.30.6)
- Azure AD Integration: ✅
- Autoscaling: ✅ (Configured on both pools)

### Monitoring: ⚠️ PARTIAL

- Azure Monitor: ⚠️ (Not enabled - consider enabling)
- Log Analytics: ✅

### Performance: ✅ PASSED

- Cluster Autoscaler: ✅
- Node Pool Autoscaling: ✅ (2 pools enabled)

### Backup/DR: ⚠️ PARTIAL

- HTTPS Security: ✅
- Geo-Replication: ⚠️ (Standard_LRS - consider upgrading to GRS)

## Final Migration Status

### Overall Assessment: ✅ MIGRATION READY

- **Total Validations**: 32
- **Failed Validations**: 0
- **Success Rate**: 100%
- **Warnings**: 4 (non-critical)

### Recommendations

1. ✅ **Proceed with production cutover**
2. ✅ **Monitor system closely during cutover**
3. ✅ **Have rollback plan ready**
4. ⚠️ **Consider enabling Azure Monitor integration**
5. ⚠️ **Consider upgrading storage to geo-redundant replication**

## Production Cutover Plan

### Phase 1: Pre-Cutover (30 minutes)

- [ ] **Stakeholder Notification**: Inform all stakeholders of cutover window
- [ ] **Team Assembly**: Ensure DevOps team is available
- [ ] **Monitoring Setup**: Open Grafana dashboards and Azure Monitor
- [ ] **Final Validation**: Run `bash scripts/migration-validation.sh`
- [ ] **Rollback Plan**: Review and confirm rollback procedures

### Phase 2: Application Preparation (15 minutes)

- [ ] **Deploy Latest Images**: Ensure latest application versions are deployed
- [ ] **Health Check Verification**: Confirm all health endpoints are responding
- [ ] **Cache Warming**: Pre-load any necessary caches
- [ ] **Database Connections**: Verify database connectivity from AKS

### Phase 3: Traffic Switching (15 minutes)

- [ ] **DNS Record Update**: Point domain to AKS ingress IP
- [ ] **Load Balancer Config**: Update any load balancer configurations
- [ ] **CDN Configuration**: Update CDN origin if applicable
- [ ] **SSL Certificate**: Verify SSL certificates are working

### Phase 4: Post-Cutover Validation (30 minutes)

- [ ] **Endpoint Testing**: Test all application endpoints
- [ ] **User Journey Testing**: Perform critical user journey tests
- [ ] **Performance Monitoring**: Monitor response times and error rates
- [ ] **Log Analysis**: Check for any error spikes in logs
- [ ] **Database Performance**: Monitor database connection and query performance

### Phase 5: Monitoring Period (24 hours)

- [ ] **Continuous Monitoring**: Monitor all metrics for 24 hours
- [ ] **Alert Response**: Respond to any alerts immediately
- [ ] **Performance Analysis**: Compare performance with baseline
- [ ] **User Feedback**: Monitor for user-reported issues

## Rollback Criteria

### Immediate Rollback Triggers

- **Application Unavailable**: Main application not responding for >5 minutes
- **Error Rate Spike**: Error rate >10% for >5 minutes
- **Performance Degradation**: Response time >3x baseline for >10 minutes
- **Database Issues**: Database connectivity or performance issues
- **Security Incident**: Any security-related issues detected

### Rollback Procedure

1. **Execute**: `bash scripts/production-cutover.sh rollback`
2. **DNS Revert**: Switch DNS back to App Service
3. **App Service Start**: Ensure App Service is running
4. **AKS Scale Down**: Scale down AKS applications
5. **Validation**: Verify App Service functionality
6. **Communication**: Notify stakeholders of rollback

## Post-Migration Tasks

### Immediate (Day 1)

- [ ] **Monitor Performance**: Continuous monitoring for 24 hours
- [ ] **Document Issues**: Record any issues encountered
- [ ] **Team Debrief**: Conduct post-migration team meeting
- [ ] **Stakeholder Update**: Provide migration status update

### Short Term (Week 1)

- [ ] **Performance Optimization**: Optimize based on real-world usage
- [ ] **Cost Analysis**: Review and optimize Azure costs
- [ ] **Security Review**: Conduct security assessment
- [ ] **Documentation Update**: Update documentation based on learnings

### Medium Term (Month 1)

- [ ] **Disaster Recovery Test**: Test full DR procedures
- [ ] **Capacity Planning**: Review and adjust capacity based on usage
- [ ] **Process Improvement**: Update processes based on migration experience
- [ ] **Training**: Conduct team training on new AKS environment

## Success Metrics

### Technical Metrics

- **Uptime**: >99.9% availability
- **Response Time**: <2 seconds for API calls
- **Error Rate**: <1% error rate
- **Resource Utilization**: CPU <70%, Memory <80%

### Business Metrics

- **User Experience**: No degradation in user experience
- **Feature Functionality**: All features working as expected
- **Performance**: Equal or better performance than App Service
- **Cost**: Within expected cost parameters

## Emergency Contacts

### Primary Team

- **DevOps Lead**: devops-lead@sageinsure.com
- **SRE Team**: sre@sageinsure.com
- **Engineering Manager**: eng-manager@sageinsure.com

### Escalation

- **CTO**: cto@sageinsure.com
- **Azure Support**: Azure Portal or phone support
- **On-Call Engineer**: +1-XXX-XXX-XXXX

## Tools and Resources

### Monitoring Dashboards

- **Grafana**: https://monitoring.sageinsure.local
- **Azure Monitor**: Azure Portal
- **Application Insights**: Azure Portal

### Useful Commands

```bash
# Health check
bash scripts/test-health-checks.sh

# Migration validation
bash scripts/migration-validation.sh

# Production cutover
bash scripts/production-cutover.sh

# Emergency rollback
bash scripts/production-cutover.sh rollback

# Kubernetes status
kubectl get nodes
kubectl get pods --all-namespaces
kubectl top nodes

# Azure status
az aks show --resource-group sageinsure-rg --name sageinsure-aks
az group show --name sageinsure-rg
```

## Final Sign-off

### Technical Approval

- [ ] **DevOps Team Lead**: ********\_******** Date: **\_\_\_**
- [ ] **SRE Team Lead**: ********\_******** Date: **\_\_\_**
- [ ] **Security Team**: ********\_******** Date: **\_\_\_**

### Business Approval

- [ ] **Product Owner**: ********\_******** Date: **\_\_\_**
- [ ] **Engineering Manager**: ********\_******** Date: **\_\_\_**
- [ ] **CTO**: ********\_******** Date: **\_\_\_**

---

**Migration Status**: ✅ READY FOR PRODUCTION CUTOVER

**Next Action**: Execute production cutover using `bash scripts/production-cutover.sh`

**Prepared by**: DevOps Team  
**Date**: $(date)  
**Version**: 1.0
