#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeploymentModel {
    pub azure: AzureFoundation,
    pub isolation: IsolationPolicy,
    pub namespace: String,
    pub image_registry: String,
    pub workloads: Vec<Workload>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct IsolationPolicy {
    pub mode: String,
    pub name_prefix: String,
    pub allow_existing_resource_reuse: bool,
    pub denied_legacy_names: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AzureFoundation {
    pub resource_group: String,
    pub location: String,
    pub aks_cluster: String,
    pub acr_name: String,
    pub key_vault_name: String,
    pub openai_endpoint_env: String,
    pub search_endpoint_env: String,
    pub storage_account_env: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Workload {
    pub name: String,
    pub image: String,
    pub container_port: u16,
    pub replicas: u16,
    pub env: Vec<EnvVar>,
    pub service: ServiceSpec,
    pub resources: ResourceSpec,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EnvVar {
    Plain {
        name: String,
        value: String,
    },
    SecretRef {
        name: String,
        secret: String,
        key: String,
    },
    ConfigMapRef {
        name: String,
        config_map: String,
        key: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ServiceSpec {
    pub name: String,
    pub port: u16,
    pub service_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResourceSpec {
    pub request_cpu: String,
    pub request_memory: String,
    pub limit_cpu: String,
    pub limit_memory: String,
}

impl DeploymentModel {
    pub fn default_sageinsure() -> Self {
        let namespace = "sageinfra-new-agents".to_string();
        let registry = "${SAGEINFRA_NEW_ACR_LOGIN_SERVER}".to_string();
        let shared_env = vec![
            EnvVar::SecretRef {
                name: "AZURE_OPENAI_ENDPOINT".to_string(),
                secret: "sageinfra-openai-secret".to_string(),
                key: "endpoint".to_string(),
            },
            EnvVar::SecretRef {
                name: "AZURE_OPENAI_KEY".to_string(),
                secret: "sageinfra-openai-secret".to_string(),
                key: "key".to_string(),
            },
            EnvVar::ConfigMapRef {
                name: "MCP_CONFIG".to_string(),
                config_map: "sageinfra-agent-config".to_string(),
                key: "models.json".to_string(),
            },
        ];

        let mut workloads = vec![
            Workload::agent("claims-manager", &registry, 1, shared_env.clone()),
            Workload::agent("marine-specialist", &registry, 1, shared_env.clone()),
            Workload::agent("underwriter-agent", &registry, 1, shared_env.clone()),
            Workload::agent("policy-assistant", &registry, 1, shared_env.clone()),
        ];

        workloads.push(Workload {
            name: "sageinfra-agentcore".to_string(),
            image: format!("{registry}/sageinfra-agentcore:${{SAGEINFRA_IMAGE_TAG}}"),
            container_port: 8000,
            replicas: 2,
            env: vec![
                EnvVar::Plain {
                    name: "PORT".to_string(),
                    value: "8000".to_string(),
                },
                EnvVar::Plain {
                    name: "AZURE_OPENAI_DEPLOYMENT".to_string(),
                    value: "gpt-4o".to_string(),
                },
                EnvVar::Plain {
                    name: "AZURE_SEARCH_INDEX".to_string(),
                    value: "policy-index".to_string(),
                },
                EnvVar::SecretRef {
                    name: "AZURE_OPENAI_ENDPOINT".to_string(),
                    secret: "sageinfra-openai-secret".to_string(),
                    key: "endpoint".to_string(),
                },
                EnvVar::SecretRef {
                    name: "AZURE_OPENAI_API_KEY".to_string(),
                    secret: "sageinfra-openai-secret".to_string(),
                    key: "key".to_string(),
                },
                EnvVar::SecretRef {
                    name: "AZURE_SEARCH_ENDPOINT".to_string(),
                    secret: "sageinfra-search-secret".to_string(),
                    key: "endpoint".to_string(),
                },
                EnvVar::SecretRef {
                    name: "AZURE_SEARCH_API_KEY".to_string(),
                    secret: "sageinfra-search-secret".to_string(),
                    key: "key".to_string(),
                },
            ],
            service: ServiceSpec {
                name: "sageinfra-agentcore".to_string(),
                port: 80,
                service_type: "ClusterIP".to_string(),
            },
            resources: ResourceSpec::api_default(),
        });

        Self {
            azure: AzureFoundation {
                resource_group: "rg-sageinfra-new-${SAGEINFRA_ENV}".to_string(),
                location: "${SAGEINFRA_LOCATION}".to_string(),
                aks_cluster: "aks-sageinfra-new-${SAGEINFRA_ENV}".to_string(),
                acr_name: "${SAGEINFRA_NEW_ACR_NAME}".to_string(),
                key_vault_name: "kv-sageinfra-new-${SAGEINFRA_ENV}".to_string(),
                openai_endpoint_env: "AZURE_OPENAI_ENDPOINT".to_string(),
                search_endpoint_env: "AZURE_SEARCH_ENDPOINT".to_string(),
                storage_account_env: "AZURE_STORAGE_ACCOUNT".to_string(),
            },
            isolation: IsolationPolicy {
                mode: "greenfield-new-stack".to_string(),
                name_prefix: "sageinfra-new-${SAGEINFRA_ENV}".to_string(),
                allow_existing_resource_reuse: false,
                denied_legacy_names: vec![
                    "sageinsure-aks".to_string(),
                    "sageinsure-agents".to_string(),
                    "sageinsure".to_string(),
                    "azins".to_string(),
                    "maplesage".to_string(),
                ],
            },
            namespace,
            image_registry: registry,
            workloads,
        }
    }

    pub fn materialized_greenfield(
        mut self,
        env_name: &str,
        location: &str,
        acr_name: &str,
        acr_login_server: &str,
        image_tag: &str,
    ) -> Self {
        self.azure.resource_group = format!("rg-sageinfra-new-{env_name}");
        self.azure.location = location.to_string();
        self.azure.aks_cluster = format!("aks-sageinfra-new-{env_name}");
        self.azure.acr_name = acr_name.to_string();
        self.azure.key_vault_name = format!("kv-sageinfra-new-{env_name}");
        self.isolation.name_prefix = format!("sageinfra-new-{env_name}");
        self.image_registry = acr_login_server.to_string();

        for workload in &mut self.workloads {
            workload.image = workload
                .image
                .replace("${SAGEINFRA_NEW_ACR_LOGIN_SERVER}", acr_login_server)
                .replace("${SAGEINFRA_IMAGE_TAG}", image_tag);
        }

        self
    }
}

impl Workload {
    fn agent(name: &str, registry: &str, replicas: u16, env: Vec<EnvVar>) -> Self {
        Self {
            name: name.to_string(),
            image: format!("{registry}/{name}:${{SAGEINFRA_IMAGE_TAG}}"),
            container_port: 8080,
            replicas,
            env,
            service: ServiceSpec {
                name: format!("{name}-service"),
                port: 80,
                service_type: "ClusterIP".to_string(),
            },
            resources: ResourceSpec::agent_default(),
        }
    }
}

impl ResourceSpec {
    pub fn agent_default() -> Self {
        Self {
            request_cpu: "50m".to_string(),
            request_memory: "128Mi".to_string(),
            limit_cpu: "100m".to_string(),
            limit_memory: "256Mi".to_string(),
        }
    }

    pub fn api_default() -> Self {
        Self {
            request_cpu: "200m".to_string(),
            request_memory: "512Mi".to_string(),
            limit_cpu: "1".to_string(),
            limit_memory: "1Gi".to_string(),
        }
    }
}
