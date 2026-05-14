use std::fs;
use std::io;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Inventory {
    pub terraform_files: Vec<TerraformFile>,
    pub kubernetes_files: Vec<KubernetesFile>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerraformFile {
    pub path: PathBuf,
    pub resources: Vec<TerraformBlock>,
    pub modules: Vec<String>,
    pub providers: Vec<String>,
    pub outputs: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerraformBlock {
    pub provider_type: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KubernetesFile {
    pub path: PathBuf,
    pub documents: Vec<KubernetesDocument>,
    pub secret_markers: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KubernetesDocument {
    pub api_version: Option<String>,
    pub kind: Option<String>,
    pub name: Option<String>,
    pub namespace: Option<String>,
    pub images: Vec<String>,
}

pub fn discover(root: &Path) -> io::Result<Inventory> {
    let terraform_roots = [root.join("terraform")];
    let kubernetes_roots = [
        root.join("k8s"),
        root.join("k8s-manifests"),
        root.join("deployment-strategies"),
        root.join("azure-agentcore"),
        root.join("azure-underwriter-agent"),
        root.join("azure-underwriters-workbench"),
        root.join("azure-sageinsure-complete/underwriting-workbench"),
    ];

    let mut terraform_files = Vec::new();
    for dir in terraform_roots {
        for path in collect_files(&dir, &["tf"])? {
            terraform_files.push(parse_terraform_file(&path)?);
        }
    }

    let mut kubernetes_files = Vec::new();
    for dir in kubernetes_roots {
        for path in collect_files(&dir, &["yaml", "yml"])? {
            kubernetes_files.push(parse_kubernetes_file(&path)?);
        }
    }

    let aks_deployment = root.join("aks-deployment.yaml");
    if aks_deployment.exists() {
        kubernetes_files.push(parse_kubernetes_file(&aks_deployment)?);
    }

    terraform_files.sort_by(|a, b| a.path.cmp(&b.path));
    kubernetes_files.sort_by(|a, b| a.path.cmp(&b.path));

    Ok(Inventory {
        terraform_files,
        kubernetes_files,
    })
}

fn collect_files(root: &Path, extensions: &[&str]) -> io::Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    if !root.exists() {
        return Ok(files);
    }

    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path
                .extension()
                .and_then(|ext| ext.to_str())
                .is_some_and(|ext| extensions.contains(&ext))
            {
                files.push(path);
            }
        }
    }
    files.sort();
    Ok(files)
}

pub fn parse_terraform_file(path: &Path) -> io::Result<TerraformFile> {
    let contents = fs::read_to_string(path)?;
    Ok(parse_terraform(path.to_path_buf(), &contents))
}

pub fn parse_terraform(path: PathBuf, contents: &str) -> TerraformFile {
    let mut resources = Vec::new();
    let mut modules = Vec::new();
    let mut providers = Vec::new();
    let mut outputs = Vec::new();

    for line in contents.lines().map(str::trim) {
        if let Some(parts) = quoted_block(line, "resource") {
            if parts.len() >= 2 {
                resources.push(TerraformBlock {
                    provider_type: parts[0].to_string(),
                    name: parts[1].to_string(),
                });
            }
        } else if let Some(parts) = quoted_block(line, "module") {
            if let Some(name) = parts.first() {
                modules.push((*name).to_string());
            }
        } else if let Some(parts) = quoted_block(line, "provider") {
            if let Some(name) = parts.first() {
                providers.push((*name).to_string());
            }
        } else if let Some(parts) = quoted_block(line, "output")
            && let Some(name) = parts.first()
        {
            outputs.push((*name).to_string());
        }
    }

    TerraformFile {
        path,
        resources,
        modules,
        providers,
        outputs,
    }
}

fn quoted_block<'a>(line: &'a str, keyword: &str) -> Option<Vec<&'a str>> {
    let rest = line.strip_prefix(keyword)?.trim_start();
    if !rest.starts_with('"') {
        return None;
    }

    let mut values = Vec::new();
    let mut remaining = rest;
    while let Some(start) = remaining.find('"') {
        let after_start = &remaining[start + 1..];
        let Some(end) = after_start.find('"') else {
            break;
        };
        values.push(&after_start[..end]);
        remaining = &after_start[end + 1..];
    }
    Some(values)
}

pub fn parse_kubernetes_file(path: &Path) -> io::Result<KubernetesFile> {
    let contents = fs::read_to_string(path)?;
    Ok(parse_kubernetes(path.to_path_buf(), &contents))
}

pub fn parse_kubernetes(path: PathBuf, contents: &str) -> KubernetesFile {
    let documents = contents
        .split("\n---")
        .filter_map(parse_kubernetes_document)
        .collect();
    let secret_markers = contents
        .lines()
        .enumerate()
        .filter_map(|(index, line)| {
            let lower = line.to_ascii_lowercase();
            let looks_secret = lower.contains("secret")
                || lower.contains("password")
                || lower.contains("api_key")
                || lower.contains("apikey")
                || lower.contains("connection_string")
                || lower.contains("key:");
            looks_secret.then(|| format!("line {}", index + 1))
        })
        .collect();

    KubernetesFile {
        path,
        documents,
        secret_markers,
    }
}

fn parse_kubernetes_document(raw: &str) -> Option<KubernetesDocument> {
    let mut document = KubernetesDocument {
        api_version: None,
        kind: None,
        name: None,
        namespace: None,
        images: Vec::new(),
    };
    let mut in_metadata = false;
    let mut metadata_indent = 0usize;

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }

        let indent = line.len().saturating_sub(line.trim_start().len());
        if trimmed == "metadata:" {
            in_metadata = true;
            metadata_indent = indent;
            continue;
        }
        if in_metadata && indent <= metadata_indent && !trimmed.starts_with("metadata:") {
            in_metadata = false;
        }

        if let Some(value) = trimmed.strip_prefix("apiVersion:") {
            document.api_version = Some(clean_yaml_scalar(value));
        } else if let Some(value) = trimmed.strip_prefix("kind:") {
            document.kind = Some(clean_yaml_scalar(value));
        } else if in_metadata {
            if let Some(value) = trimmed.strip_prefix("name:") {
                if document.name.is_none() {
                    document.name = Some(clean_yaml_scalar(value));
                }
            } else if let Some(value) = trimmed.strip_prefix("namespace:")
                && document.namespace.is_none()
            {
                document.namespace = Some(clean_yaml_scalar(value));
            }
        } else if let Some(value) = trimmed.strip_prefix("image:") {
            document.images.push(clean_yaml_scalar(value));
        } else if let Some(value) = trimmed.strip_prefix("- image:") {
            document.images.push(clean_yaml_scalar(value));
        }
    }

    (document.api_version.is_some() || document.kind.is_some()).then_some(document)
}

fn clean_yaml_scalar(value: &str) -> String {
    value
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .to_string()
}

impl Inventory {
    pub fn to_text_report(&self) -> String {
        let mut out = String::new();
        out.push_str("Terraform files\n");
        for file in &self.terraform_files {
            out.push_str(&format!(
                "- {}: {} resources, {} modules, {} providers, {} outputs\n",
                file.path.display(),
                file.resources.len(),
                file.modules.len(),
                file.providers.len(),
                file.outputs.len()
            ));
            for resource in &file.resources {
                out.push_str(&format!(
                    "  - resource {}.{}\n",
                    resource.provider_type, resource.name
                ));
            }
            for module in &file.modules {
                out.push_str(&format!("  - module {module}\n"));
            }
        }

        out.push_str("\nKubernetes manifests\n");
        for file in &self.kubernetes_files {
            out.push_str(&format!(
                "- {}: {} documents",
                file.path.display(),
                file.documents.len()
            ));
            if !file.secret_markers.is_empty() {
                out.push_str(&format!(
                    ", secret-like references at {} location(s)",
                    file.secret_markers.len()
                ));
            }
            out.push('\n');
            for doc in &file.documents {
                let kind = doc.kind.as_deref().unwrap_or("unknown");
                let name = doc.name.as_deref().unwrap_or("unnamed");
                let namespace = doc.namespace.as_deref().unwrap_or("default");
                out.push_str(&format!("  - {kind}/{name} namespace={namespace}\n"));
                for image in &doc.images {
                    out.push_str(&format!("    image {image}\n"));
                }
            }
        }

        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_terraform_resources_modules_and_outputs() {
        let parsed = parse_terraform(
            PathBuf::from("main.tf"),
            r#"
            provider "azurerm" {}
            resource "azurerm_resource_group" "rg" {}
            module "aks" {}
            output "resource_group_name" {}
            "#,
        );

        assert_eq!(parsed.providers, vec!["azurerm"]);
        assert_eq!(parsed.modules, vec!["aks"]);
        assert_eq!(parsed.outputs, vec!["resource_group_name"]);
        assert_eq!(
            parsed.resources,
            vec![TerraformBlock {
                provider_type: "azurerm_resource_group".to_string(),
                name: "rg".to_string()
            }]
        );
    }

    #[test]
    fn parses_kubernetes_document_metadata_and_images() {
        let parsed = parse_kubernetes(
            PathBuf::from("deployment.yaml"),
            r#"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: claims-manager
  namespace: sageinsure-agents
spec:
  template:
    spec:
      containers:
      - name: claims-manager
        image: example.azurecr.io/claims-manager:latest
"#,
        );

        assert_eq!(parsed.documents.len(), 1);
        let doc = &parsed.documents[0];
        assert_eq!(doc.kind.as_deref(), Some("Deployment"));
        assert_eq!(doc.name.as_deref(), Some("claims-manager"));
        assert_eq!(doc.namespace.as_deref(), Some("sageinsure-agents"));
        assert_eq!(doc.images, vec!["example.azurecr.io/claims-manager:latest"]);
    }
}
