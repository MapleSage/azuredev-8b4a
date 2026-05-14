use crate::model::{DeploymentModel, EnvVar, Workload};

pub fn render_model(model: &DeploymentModel) -> String {
    let mut out = String::new();
    out.push_str(&render_namespace(&model.namespace));
    out.push_str("---\n");
    out.push_str(&render_config_map(model));
    out.push_str("---\n");
    out.push_str(&render_service_account(&model.namespace));
    for workload in &model.workloads {
        out.push_str("---\n");
        out.push_str(&render_deployment(&model.namespace, workload));
        out.push_str("---\n");
        out.push_str(&render_service(&model.namespace, workload));
    }
    out
}

fn render_namespace(namespace: &str) -> String {
    format!(
        "apiVersion: v1\nkind: Namespace\nmetadata:\n  name: {}\n",
        yaml_value(namespace)
    )
}

fn render_config_map(model: &DeploymentModel) -> String {
    format!(
        "apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: sageinfra-deployment-context\n  namespace: {}\ndata:\n  isolationMode: {}\n  namePrefix: {}\n  allowExistingResourceReuse: {}\n  deniedLegacyNames: {}\n  resourceGroup: {}\n  location: {}\n  aksCluster: {}\n  acrName: {}\n  keyVaultName: {}\n  openAiEndpointEnv: {}\n  searchEndpointEnv: {}\n  storageAccountEnv: {}\n",
        yaml_value(&model.namespace),
        yaml_value(&model.isolation.mode),
        yaml_value(&model.isolation.name_prefix),
        yaml_value(if model.isolation.allow_existing_resource_reuse {
            "true"
        } else {
            "false"
        }),
        yaml_value(&model.isolation.denied_legacy_names.join(",")),
        yaml_value(&model.azure.resource_group),
        yaml_value(&model.azure.location),
        yaml_value(&model.azure.aks_cluster),
        yaml_value(&model.azure.acr_name),
        yaml_value(&model.azure.key_vault_name),
        yaml_value(&model.azure.openai_endpoint_env),
        yaml_value(&model.azure.search_endpoint_env),
        yaml_value(&model.azure.storage_account_env)
    )
}

fn render_service_account(namespace: &str) -> String {
    format!(
        "apiVersion: v1\nkind: ServiceAccount\nmetadata:\n  name: sageinfra-workload-identity\n  namespace: {}\n",
        yaml_value(namespace)
    )
}

pub fn render_deployment(namespace: &str, workload: &Workload) -> String {
    let mut out = format!(
        "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: {}\n  namespace: {}\n  labels:\n    app.kubernetes.io/name: {}\nspec:\n  replicas: {}\n  strategy:\n    type: RollingUpdate\n    rollingUpdate:\n      maxSurge: 0\n      maxUnavailable: 1\n  selector:\n    matchLabels:\n      app.kubernetes.io/name: {}\n  template:\n    metadata:\n      labels:\n        app.kubernetes.io/name: {}\n      annotations:\n        azure.workload.identity/use: \"true\"\n    spec:\n      serviceAccountName: sageinfra-workload-identity\n      containers:\n      - name: {}\n        image: {}\n        imagePullPolicy: IfNotPresent\n        ports:\n        - containerPort: {}\n          name: http\n        env:\n",
        yaml_value(&workload.name),
        yaml_value(namespace),
        yaml_value(&workload.name),
        workload.replicas,
        yaml_value(&workload.name),
        yaml_value(&workload.name),
        yaml_value(&workload.name),
        yaml_value(&workload.image),
        workload.container_port
    );

    for env in &workload.env {
        push_env(&mut out, env);
    }

    out.push_str(&format!(
        "        resources:\n          requests:\n            cpu: {}\n            memory: {}\n          limits:\n            cpu: {}\n            memory: {}\n",
        yaml_value(&workload.resources.request_cpu),
        yaml_value(&workload.resources.request_memory),
        yaml_value(&workload.resources.limit_cpu),
        yaml_value(&workload.resources.limit_memory)
    ));
    out
}

pub fn render_service(namespace: &str, workload: &Workload) -> String {
    format!(
        "apiVersion: v1\nkind: Service\nmetadata:\n  name: {}\n  namespace: {}\nspec:\n  type: {}\n  selector:\n    app.kubernetes.io/name: {}\n  ports:\n  - name: http\n    port: {}\n    targetPort: {}\n",
        yaml_value(&workload.service.name),
        yaml_value(namespace),
        yaml_value(&workload.service.service_type),
        yaml_value(&workload.name),
        workload.service.port,
        workload.container_port
    )
}

fn push_env(out: &mut String, env: &EnvVar) {
    match env {
        EnvVar::Plain { name, value } => {
            out.push_str(&format!(
                "        - name: {}\n          value: {}\n",
                yaml_value(name),
                yaml_value(value)
            ));
        }
        EnvVar::SecretRef { name, secret, key } => {
            out.push_str(&format!(
                "        - name: {}\n          valueFrom:\n            secretKeyRef:\n              name: {}\n              key: {}\n",
                yaml_value(name),
                yaml_value(secret),
                yaml_value(key)
            ));
        }
        EnvVar::ConfigMapRef {
            name,
            config_map,
            key,
        } => {
            out.push_str(&format!(
                "        - name: {}\n          valueFrom:\n            configMapKeyRef:\n              name: {}\n              key: {}\n",
                yaml_value(name),
                yaml_value(config_map),
                yaml_value(key)
            ));
        }
    }
}

fn yaml_value(value: &str) -> String {
    format!("\"{}\"", value.replace('"', "\\\""))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::DeploymentModel;

    #[test]
    fn renders_secret_refs_not_secret_values() {
        let model = DeploymentModel::default_sageinsure();
        let rendered = render_model(&model);

        assert!(rendered.contains("kind: ServiceAccount"));
        assert!(rendered.contains("name: sageinfra-workload-identity"));
        assert!(rendered.contains("kind: Deployment"));
        assert!(rendered.contains("secretKeyRef:"));
        assert!(rendered.contains("name: \"sageinfra-openai-secret\""));
        assert!(rendered.contains("${SAGEINFRA_NEW_ACR_LOGIN_SERVER}"));
        assert!(rendered.contains("isolationMode: \"greenfield-new-stack\""));
        assert!(rendered.contains("allowExistingResourceReuse: \"false\""));
        assert!(!rendered.contains("api_key"));
        assert!(!rendered.contains("primary_access_key"));
    }

    #[test]
    fn renders_materialized_dev_environment_values() {
        let model = DeploymentModel::default_sageinsure().materialized_greenfield(
            "dev01",
            "eastus",
            "sageinfranewdev01",
            "sageinfranewdev01.azurecr.io",
            "dev01",
        );
        let rendered = render_model(&model);

        assert!(rendered.contains("resourceGroup: \"rg-sageinfra-new-dev01\""));
        assert!(rendered.contains("location: \"eastus\""));
        assert!(rendered.contains("acrName: \"sageinfranewdev01\""));
        assert!(rendered.contains("image: \"sageinfranewdev01.azurecr.io/claims-manager:dev01\""));
        assert!(!rendered.contains("${SAGEINFRA_NEW_ACR_LOGIN_SERVER}"));
        assert!(!rendered.contains("${SAGEINFRA_IMAGE_TAG}"));
    }
}
