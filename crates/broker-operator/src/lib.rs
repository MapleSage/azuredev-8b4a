use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use k8s_openapi::api::apps::v1::{Deployment, DeploymentSpec, DeploymentStrategy};
use k8s_openapi::api::core::v1::{
    ConfigMap, ConfigMapVolumeSource, Container, ContainerPort, EnvVar, HTTPGetAction, LimitRange,
    LimitRangeItem, LimitRangeSpec, Namespace, PodSpec, PodTemplateSpec, Probe, ResourceQuota,
    ResourceQuotaSpec, ResourceRequirements, SecurityContext, Service, ServiceAccount, ServicePort,
    ServiceSpec, Volume, VolumeMount,
};
use k8s_openapi::api::networking::v1::{
    NetworkPolicy, NetworkPolicyEgressRule, NetworkPolicyPeer, NetworkPolicyPort, NetworkPolicySpec,
};
use k8s_openapi::apimachinery::pkg::api::resource::Quantity;
use k8s_openapi::apimachinery::pkg::apis::meta::v1::{LabelSelector, ObjectMeta};
use kube::api::{Api, DeleteParams, Patch, PatchParams};
use kube::runtime::controller::Action;
use kube::{Client, CustomResource, Resource, ResourceExt};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use tracing::{info, warn};

pub const BROKER_FINALIZER: &str = "platform.sagesure.ai/broker-cleanup";

#[derive(CustomResource, Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[kube(
    group = "platform.sagesure.ai",
    version = "v1alpha1",
    kind = "BrokerRuntime",
    plural = "brokerruntimes",
    namespaced,
    status = "BrokerRuntimeStatus",
    shortname = "brt"
)]
#[serde(rename_all = "camelCase")]
pub struct BrokerRuntimeSpec {
    pub posp_id: String,
    pub tenant_id: String,
    pub broker_name: String,
    pub lifecycle_state: LifecycleState,
    pub runtime: RuntimeSpec,
    pub identity: IdentitySpec,
    pub workspace: WorkspaceSpec,
    pub knowledge_base: KnowledgeBaseSpec,
    #[serde(default)]
    pub tools: Vec<String>,
    #[serde(default)]
    pub skills: Vec<String>,
    pub policy: PolicySpec,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "PascalCase")]
pub enum LifecycleState {
    Active,
    Suspended,
    Offboarding,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeSpec {
    pub image: String,
    #[serde(default = "default_runtime_class")]
    pub runtime_class_name: String,
    #[serde(default)]
    pub min_replicas: i32,
    #[serde(default = "default_max_replicas")]
    pub max_replicas: i32,
    #[serde(default = "default_idle_minutes")]
    pub idle_after_minutes: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct IdentitySpec {
    pub managed_identity_name: String,
    #[serde(default = "default_service_account")]
    pub service_account_name: String,
    #[serde(default)]
    pub client_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceSpec {
    pub storage_ref: String,
    #[serde(default = "default_workspace_mount")]
    pub mount_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeBaseSpec {
    pub version: String,
    #[serde(default)]
    pub refs: Vec<KnowledgeBaseRef>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct KnowledgeBaseRef {
    #[serde(rename = "type")]
    pub ref_type: String,
    pub name: String,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PolicySpec {
    pub data_classification: String,
    pub network_profile: String,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BrokerRuntimeStatus {
    pub phase: Option<String>,
    pub namespace: Option<String>,
    pub runtime_pod: Option<String>,
    pub last_activity_time: Option<DateTime<Utc>>,
    #[serde(default)]
    pub conditions: Vec<BrokerRuntimeCondition>,
}

#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct BrokerRuntimeCondition {
    #[serde(rename = "type")]
    pub condition_type: String,
    pub status: String,
    pub reason: String,
    pub message: String,
    pub last_transition_time: DateTime<Utc>,
}

#[derive(Clone)]
pub struct Context {
    pub client: Client,
    pub dry_run: bool,
}

#[derive(Debug, Error)]
pub enum OperatorError {
    #[error("Kubernetes API error: {0}")]
    Kube(#[from] kube::Error),
    #[error("invalid BrokerRuntime: {0}")]
    Invalid(String),
    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub async fn reconcile(
    broker: Arc<BrokerRuntime>,
    ctx: Arc<Context>,
) -> Result<Action, OperatorError> {
    validate_broker(&broker)?;
    let ns = broker_namespace(&broker.spec.posp_id);
    info!(broker = %broker.name_any(), namespace = %ns, "reconciling BrokerRuntime");

    if broker.meta().deletion_timestamp.is_some() {
        cleanup_broker(ctx.client.clone(), &broker, &ns).await?;
        remove_finalizer(ctx.client.clone(), &broker).await?;
        return Ok(Action::await_change());
    }

    ensure_finalizer(ctx.client.clone(), &broker).await?;
    ensure_namespace(ctx.client.clone(), &ns, &broker).await?;
    ensure_service_account(ctx.client.clone(), &ns, &broker).await?;
    ensure_resource_quota(ctx.client.clone(), &ns).await?;
    ensure_limit_range(ctx.client.clone(), &ns).await?;
    ensure_network_policies(ctx.client.clone(), &ns).await?;
    ensure_config_maps(ctx.client.clone(), &ns, &broker).await?;
    ensure_deployment(ctx.client.clone(), &ns, &broker).await?;
    ensure_service(ctx.client.clone(), &ns).await?;
    ensure_federated_credential(&broker, &ns, ctx.dry_run).await?;
    patch_status(ctx.client.clone(), &broker).await?;
    Ok(Action::requeue(Duration::from_secs(300)))
}

pub fn error_policy(
    _broker: Arc<BrokerRuntime>,
    error: &OperatorError,
    _ctx: Arc<Context>,
) -> Action {
    warn!(%error, "reconcile failed; retrying");
    Action::requeue(Duration::from_secs(60))
}

pub fn broker_namespace(posp_id: &str) -> String {
    format!("broker-{}", sanitize_label_value(posp_id))
}

pub fn sanitize_label_value(value: &str) -> String {
    let s = value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' {
                ch.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();
    let trimmed = s.trim_matches('-');
    if trimmed.is_empty() {
        "unknown".into()
    } else {
        trimmed.into()
    }
}

fn validate_broker(broker: &BrokerRuntime) -> Result<(), OperatorError> {
    if broker.spec.posp_id.trim().is_empty() {
        return Err(OperatorError::Invalid("spec.pospId is required".into()));
    }
    if broker.spec.tenant_id.trim().is_empty() {
        return Err(OperatorError::Invalid("spec.tenantId is required".into()));
    }
    if broker.spec.runtime.runtime_class_name != "kata-vm-isolation" {
        return Err(OperatorError::Invalid(
            "broker runtimes must use runtimeClassName kata-vm-isolation".into(),
        ));
    }
    Ok(())
}

async fn ensure_finalizer(client: Client, broker: &BrokerRuntime) -> Result<(), OperatorError> {
    let namespace = broker
        .namespace()
        .ok_or_else(|| OperatorError::Invalid("BrokerRuntime must be namespaced".into()))?;
    if broker
        .finalizers()
        .iter()
        .any(|finalizer| finalizer == BROKER_FINALIZER)
    {
        return Ok(());
    }
    let api: Api<BrokerRuntime> = Api::namespaced(client, &namespace);
    let mut finalizers = broker.finalizers().to_vec();
    finalizers.push(BROKER_FINALIZER.to_string());
    let patch = json!({ "metadata": { "finalizers": finalizers } });
    api.patch(
        &broker.name_any(),
        &PatchParams::default(),
        &Patch::Merge(&patch),
    )
    .await?;
    Ok(())
}

async fn remove_finalizer(client: Client, broker: &BrokerRuntime) -> Result<(), OperatorError> {
    let namespace = broker
        .namespace()
        .ok_or_else(|| OperatorError::Invalid("BrokerRuntime must be namespaced".into()))?;
    let api: Api<BrokerRuntime> = Api::namespaced(client, &namespace);
    let finalizers: Vec<String> = broker
        .finalizers()
        .iter()
        .filter(|finalizer| finalizer.as_str() != BROKER_FINALIZER)
        .cloned()
        .collect();
    let patch = json!({ "metadata": { "finalizers": finalizers } });
    api.patch(
        &broker.name_any(),
        &PatchParams::default(),
        &Patch::Merge(&patch),
    )
    .await?;
    Ok(())
}

async fn cleanup_broker(
    client: Client,
    broker: &BrokerRuntime,
    namespace: &str,
) -> Result<(), OperatorError> {
    if !broker
        .finalizers()
        .iter()
        .any(|finalizer| finalizer == BROKER_FINALIZER)
    {
        return Ok(());
    }
    let api: Api<Namespace> = Api::all(client);
    match api.delete(namespace, &DeleteParams::default()).await {
        Ok(_) => Ok(()),
        Err(kube::Error::Api(err)) if err.code == 404 => Ok(()),
        Err(err) => Err(OperatorError::Kube(err)),
    }
}

async fn ensure_namespace(
    client: Client,
    namespace: &str,
    broker: &BrokerRuntime,
) -> Result<(), OperatorError> {
    let api: Api<Namespace> = Api::all(client);
    let ns = Namespace {
        metadata: ObjectMeta {
            name: Some(namespace.into()),
            labels: Some(broker_labels(broker)),
            ..Default::default()
        },
        ..Default::default()
    };
    apply(&api, namespace, &ns).await
}

async fn ensure_service_account(
    client: Client,
    namespace: &str,
    broker: &BrokerRuntime,
) -> Result<(), OperatorError> {
    let api: Api<ServiceAccount> = Api::namespaced(client, namespace);
    let mut annotations = std::collections::BTreeMap::new();
    if let Some(client_id) = &broker.spec.identity.client_id {
        annotations.insert(
            "azure.workload.identity/client-id".into(),
            client_id.clone(),
        );
    }
    annotations.insert(
        "platform.sagesure.ai/managed-identity-name".into(),
        broker.spec.identity.managed_identity_name.clone(),
    );
    let mut labels = std::collections::BTreeMap::new();
    labels.insert("azure.workload.identity/use".into(), "true".into());
    labels.insert("app.kubernetes.io/name".into(), "broker-runtime".into());
    let sa = ServiceAccount {
        metadata: ObjectMeta {
            name: Some(broker.spec.identity.service_account_name.clone()),
            annotations: Some(annotations),
            labels: Some(labels),
            ..Default::default()
        },
        ..Default::default()
    };
    apply(&api, &broker.spec.identity.service_account_name, &sa).await
}

async fn ensure_resource_quota(client: Client, namespace: &str) -> Result<(), OperatorError> {
    let api: Api<ResourceQuota> = Api::namespaced(client, namespace);
    let hard = [
        ("pods", "8"),
        ("requests.cpu", "4"),
        ("requests.memory", "8Gi"),
        ("limits.cpu", "8"),
        ("limits.memory", "16Gi"),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_string(), Quantity(v.into())))
    .collect();
    let rq = ResourceQuota {
        metadata: ObjectMeta {
            name: Some("broker-runtime-quota".into()),
            ..Default::default()
        },
        spec: Some(ResourceQuotaSpec {
            hard: Some(hard),
            ..Default::default()
        }),
        ..Default::default()
    };
    apply(&api, "broker-runtime-quota", &rq).await
}

async fn ensure_limit_range(client: Client, namespace: &str) -> Result<(), OperatorError> {
    let api: Api<LimitRange> = Api::namespaced(client, namespace);
    let default = [
        ("cpu".into(), Quantity("1".into())),
        ("memory".into(), Quantity("1Gi".into())),
    ]
    .into_iter()
    .collect();
    let default_request = [
        ("cpu".into(), Quantity("250m".into())),
        ("memory".into(), Quantity("256Mi".into())),
    ]
    .into_iter()
    .collect();
    let lr = LimitRange {
        metadata: ObjectMeta {
            name: Some("broker-runtime-limits".into()),
            ..Default::default()
        },
        spec: Some(LimitRangeSpec {
            limits: vec![LimitRangeItem {
                type_: "Container".into(),
                default: Some(default),
                default_request: Some(default_request),
                ..Default::default()
            }],
        }),
        ..Default::default()
    };
    apply(&api, "broker-runtime-limits", &lr).await
}

async fn ensure_network_policies(client: Client, namespace: &str) -> Result<(), OperatorError> {
    let api: Api<NetworkPolicy> = Api::namespaced(client, namespace);
    let deny = NetworkPolicy {
        metadata: ObjectMeta {
            name: Some("default-deny-all".into()),
            ..Default::default()
        },
        spec: Some(NetworkPolicySpec {
            pod_selector: LabelSelector::default(),
            policy_types: Some(vec!["Ingress".into(), "Egress".into()]),
            ingress: Some(vec![]),
            egress: Some(vec![]),
        }),
        ..Default::default()
    };
    apply(&api, "default-deny-all", &deny).await?;
    let allow = NetworkPolicy {
        metadata: ObjectMeta {
            name: Some("allow-platform-egress".into()),
            ..Default::default()
        },
        spec: Some(NetworkPolicySpec {
            pod_selector: LabelSelector::default(),
            policy_types: Some(vec!["Egress".into()]),
            ingress: None,
            egress: Some(vec![NetworkPolicyEgressRule {
                to: Some(vec![NetworkPolicyPeer {
                    namespace_selector: None,
                    pod_selector: None,
                    ip_block: None,
                }]),
                ports: Some(vec![
                    NetworkPolicyPort {
                        port: None,
                        protocol: Some("TCP".into()),
                        end_port: None,
                    },
                    NetworkPolicyPort {
                        port: None,
                        protocol: Some("UDP".into()),
                        end_port: None,
                    },
                ]),
            }]),
        }),
        ..Default::default()
    };
    apply(&api, "allow-platform-egress", &allow).await
}

async fn ensure_config_maps(
    client: Client,
    namespace: &str,
    broker: &BrokerRuntime,
) -> Result<(), OperatorError> {
    let api: Api<ConfigMap> = Api::namespaced(client, namespace);
    let data = [
        (
            "kb.yaml".into(),
            serde_yaml::to_string(&broker.spec.knowledge_base).unwrap_or_default(),
        ),
        (
            "tools.yaml".into(),
            serde_yaml::to_string(&broker.spec.tools).unwrap_or_default(),
        ),
        (
            "skills.yaml".into(),
            serde_yaml::to_string(&broker.spec.skills).unwrap_or_default(),
        ),
    ]
    .into_iter()
    .collect();
    let cm = ConfigMap {
        metadata: ObjectMeta {
            name: Some("broker-runtime-config".into()),
            ..Default::default()
        },
        data: Some(data),
        ..Default::default()
    };
    apply(&api, "broker-runtime-config", &cm).await
}

async fn ensure_deployment(
    client: Client,
    namespace: &str,
    broker: &BrokerRuntime,
) -> Result<(), OperatorError> {
    let api: Api<Deployment> = Api::namespaced(client, namespace);
    let labels = selector_labels();
    let replicas = match broker.spec.lifecycle_state {
        LifecycleState::Active => broker.spec.runtime.min_replicas.max(1),
        _ => 0,
    };
    let dep = Deployment {
        metadata: ObjectMeta {
            name: Some("broker-runtime".into()),
            labels: Some(labels.clone()),
            ..Default::default()
        },
        spec: Some(DeploymentSpec {
            replicas: Some(replicas),
            selector: LabelSelector {
                match_labels: Some(labels.clone()),
                ..Default::default()
            },
            strategy: Some(DeploymentStrategy::default()),
            template: PodTemplateSpec {
                metadata: Some(ObjectMeta {
                    labels: Some(labels),
                    ..Default::default()
                }),
                spec: Some(PodSpec {
                    service_account_name: Some(broker.spec.identity.service_account_name.clone()),
                    runtime_class_name: Some(broker.spec.runtime.runtime_class_name.clone()),
                    containers: vec![Container {
                        name: "broker-runtime".into(),
                        image: Some(broker.spec.runtime.image.clone()),
                        image_pull_policy: Some("IfNotPresent".into()),
                        ports: Some(vec![ContainerPort {
                            container_port: 8080,
                            name: Some("http".into()),
                            ..Default::default()
                        }]),
                        env: Some(vec![
                            EnvVar {
                                name: "BROKER_ID".into(),
                                value: Some(broker.spec.posp_id.clone()),
                                ..Default::default()
                            },
                            EnvVar {
                                name: "BROKER_WORKSPACE".into(),
                                value: Some(broker.spec.workspace.mount_path.clone()),
                                ..Default::default()
                            },
                            EnvVar {
                                name: "BROKER_CONFIG_DIR".into(),
                                value: Some("/config".into()),
                                ..Default::default()
                            },
                        ]),
                        resources: Some(container_resources()),
                        volume_mounts: Some(vec![
                            VolumeMount {
                                name: "broker-runtime-config".into(),
                                mount_path: "/config".into(),
                                read_only: Some(true),
                                ..Default::default()
                            },
                            VolumeMount {
                                name: "broker-workspace".into(),
                                mount_path: broker.spec.workspace.mount_path.clone(),
                                ..Default::default()
                            },
                        ]),
                        liveness_probe: Some(http_probe("/healthz")),
                        readiness_probe: Some(http_probe("/readyz")),
                        security_context: Some(SecurityContext {
                            allow_privilege_escalation: Some(false),
                            read_only_root_filesystem: Some(true),
                            run_as_non_root: Some(true),
                            run_as_user: Some(1000),
                            run_as_group: Some(1000),
                            ..Default::default()
                        }),
                        ..Default::default()
                    }],
                    volumes: Some(vec![
                        Volume {
                            name: "broker-runtime-config".into(),
                            config_map: Some(ConfigMapVolumeSource {
                                name: "broker-runtime-config".into(),
                                ..Default::default()
                            }),
                            ..Default::default()
                        },
                        Volume {
                            name: "broker-workspace".into(),
                            empty_dir: Some(Default::default()),
                            ..Default::default()
                        },
                    ]),
                    ..Default::default()
                }),
            },
            ..Default::default()
        }),
        ..Default::default()
    };
    apply(&api, "broker-runtime", &dep).await
}

async fn ensure_service(client: Client, namespace: &str) -> Result<(), OperatorError> {
    let api: Api<Service> = Api::namespaced(client, namespace);
    let svc = Service {
        metadata: ObjectMeta {
            name: Some("broker-runtime-gateway".into()),
            ..Default::default()
        },
        spec: Some(ServiceSpec {
            selector: Some(selector_labels()),
            ports: Some(vec![ServicePort {
                port: 80,
                target_port: Some(
                    k8s_openapi::apimachinery::pkg::util::intstr::IntOrString::Int(8080),
                ),
                name: Some("http".into()),
                ..Default::default()
            }]),
            ..Default::default()
        }),
        ..Default::default()
    };
    apply(&api, "broker-runtime-gateway", &svc).await
}

async fn ensure_federated_credential(
    broker: &BrokerRuntime,
    namespace: &str,
    dry_run: bool,
) -> Result<(), OperatorError> {
    let subject = format!(
        "system:serviceaccount:{}:{}",
        namespace, broker.spec.identity.service_account_name
    );
    if dry_run {
        info!(subject = %subject, identity = %broker.spec.identity.managed_identity_name, "dry-run federated credential reconcile");
    } else {
        warn!(subject = %subject, identity = %broker.spec.identity.managed_identity_name, "Azure federated credential write is gated behind explicit operator configuration");
    }
    Ok(())
}

async fn patch_status(client: Client, broker: &BrokerRuntime) -> Result<(), OperatorError> {
    let namespace = broker
        .namespace()
        .ok_or_else(|| OperatorError::Invalid("BrokerRuntime must be namespaced".into()))?;
    let api: Api<BrokerRuntime> = Api::namespaced(client, &namespace);
    let status = json!({ "status": { "phase": "Reconciling", "namespace": broker_namespace(&broker.spec.posp_id), "runtimePod": null, "lastActivityTime": Utc::now(), "conditions": [{ "type": "Reconciled", "status": "True", "reason": "LocalResourcesApplied", "message": "Namespace, guardrails, runtime deployment, service, and config have been reconciled.", "lastTransitionTime": Utc::now() }] } });
    api.patch_status(
        &broker.name_any(),
        &PatchParams::apply("broker-operator"),
        &Patch::Merge(&status),
    )
    .await?;
    Ok(())
}

async fn apply<K>(api: &Api<K>, name: &str, obj: &K) -> Result<(), OperatorError>
where
    K: Clone
        + Serialize
        + serde::de::DeserializeOwned
        + kube::Resource<DynamicType = ()>
        + std::fmt::Debug,
{
    api.patch(
        name,
        &PatchParams::apply("broker-operator").force(),
        &Patch::Apply(obj),
    )
    .await?;
    Ok(())
}

fn container_resources() -> ResourceRequirements {
    let requests = [
        ("cpu".to_string(), Quantity("250m".into())),
        ("memory".to_string(), Quantity("512Mi".into())),
    ]
    .into_iter()
    .collect();
    let limits = [
        ("cpu".to_string(), Quantity("1".into())),
        ("memory".to_string(), Quantity("1Gi".into())),
    ]
    .into_iter()
    .collect();
    ResourceRequirements {
        limits: Some(limits),
        requests: Some(requests),
        ..Default::default()
    }
}

fn http_probe(path: &str) -> Probe {
    Probe {
        http_get: Some(HTTPGetAction {
            path: Some(path.into()),
            port: k8s_openapi::apimachinery::pkg::util::intstr::IntOrString::Int(8080),
            scheme: Some("HTTP".into()),
            ..Default::default()
        }),
        initial_delay_seconds: Some(5),
        period_seconds: Some(10),
        timeout_seconds: Some(2),
        failure_threshold: Some(3),
        ..Default::default()
    }
}

fn broker_labels(broker: &BrokerRuntime) -> std::collections::BTreeMap<String, String> {
    [
        ("sage.suresure.ai/posp-id", broker.spec.posp_id.as_str()),
        ("sage.suresure.ai/tenant-id", broker.spec.tenant_id.as_str()),
        (
            "sage.suresure.ai/lifecycle-state",
            match broker.spec.lifecycle_state {
                LifecycleState::Active => "Active",
                LifecycleState::Suspended => "Suspended",
                LifecycleState::Offboarding => "Offboarding",
            },
        ),
        (
            "sage.suresure.ai/data-classification",
            broker.spec.policy.data_classification.as_str(),
        ),
    ]
    .into_iter()
    .map(|(k, v)| (k.to_string(), sanitize_label_value(v)))
    .collect()
}
fn selector_labels() -> std::collections::BTreeMap<String, String> {
    [(
        "app.kubernetes.io/name".to_string(),
        "broker-runtime".to_string(),
    )]
    .into_iter()
    .collect()
}
fn default_runtime_class() -> String {
    "kata-vm-isolation".into()
}
fn default_service_account() -> String {
    "broker-runtime".into()
}
fn default_workspace_mount() -> String {
    "/workspace".into()
}
fn default_max_replicas() -> i32 {
    3
}
fn default_idle_minutes() -> i32 {
    30
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_spec() -> BrokerRuntimeSpec {
        BrokerRuntimeSpec {
            posp_id: "POSP_123".to_string(),
            tenant_id: "tenant-a".to_string(),
            broker_name: "Broker A".to_string(),
            lifecycle_state: LifecycleState::Active,
            runtime: RuntimeSpec {
                image: "broker-runtime:test".to_string(),
                runtime_class_name: "kata-vm-isolation".to_string(),
                min_replicas: 1,
                max_replicas: 3,
                idle_after_minutes: 30,
            },
            identity: IdentitySpec {
                managed_identity_name: "uami-broker-posp-123".to_string(),
                service_account_name: "broker-runtime".to_string(),
                client_id: Some("00000000-0000-0000-0000-000000000000".to_string()),
            },
            workspace: WorkspaceSpec {
                storage_ref: "broker-workspaces".to_string(),
                mount_path: "/workspace".to_string(),
            },
            knowledge_base: KnowledgeBaseSpec {
                version: "kb-test".to_string(),
                refs: vec![KnowledgeBaseRef {
                    ref_type: "azureSearch".to_string(),
                    name: "broker-kb".to_string(),
                }],
            },
            tools: vec!["claims".to_string()],
            skills: vec!["fnol".to_string()],
            policy: PolicySpec {
                data_classification: "confidential".to_string(),
                network_profile: "restricted".to_string(),
            },
        }
    }

    #[test]
    fn sanitize_label_value_is_dns_label_safe() {
        assert_eq!(sanitize_label_value("POSP_123"), "posp-123");
        assert_eq!(sanitize_label_value("---"), "unknown");
        assert_eq!(broker_namespace("POSP_123"), "broker-posp-123");
    }

    #[test]
    fn validate_broker_requires_kata_runtime_class() {
        let mut broker = BrokerRuntime::new("broker-posp-123", valid_spec());
        assert!(validate_broker(&broker).is_ok());

        broker.spec.runtime.runtime_class_name = "runc".to_string();
        let err = validate_broker(&broker).expect_err("non-Kata runtime must fail");
        assert!(matches!(err, OperatorError::Invalid(_)));
        assert!(err.to_string().contains("kata-vm-isolation"));
    }

    #[test]
    fn broker_labels_include_sanitized_tenant_and_policy_values() {
        let broker = BrokerRuntime::new("broker-posp-123", valid_spec());
        let labels = broker_labels(&broker);
        assert_eq!(
            labels.get("sage.suresure.ai/posp-id"),
            Some(&"posp-123".to_string())
        );
        assert_eq!(
            labels.get("sage.suresure.ai/tenant-id"),
            Some(&"tenant-a".to_string())
        );
        assert_eq!(
            labels.get("sage.suresure.ai/lifecycle-state"),
            Some(&"active".to_string())
        );
        assert_eq!(
            labels.get("sage.suresure.ai/data-classification"),
            Some(&"confidential".to_string())
        );
    }
}
