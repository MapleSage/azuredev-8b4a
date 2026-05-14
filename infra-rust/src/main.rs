use std::env;
use std::path::PathBuf;
use std::process;

use sageinfra::azure::{
    AzureProvisioner, DryRunAzureProvisioner, GreenfieldNames, render_greenfield_provision_script,
};
use sageinfra::inventory;
use sageinfra::model::DeploymentModel;
use sageinfra::render;

fn main() {
    if let Err(err) = run() {
        eprintln!("sageinfra: {err}");
        process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().skip(1).collect();
    let command = args
        .iter()
        .find(|arg| !arg.starts_with("--"))
        .map(String::as_str)
        .unwrap_or("plan");
    let root = parse_root(&args)?;

    match command {
        "inventory" => {
            let inventory = inventory::discover(&root)
                .map_err(|err| format!("failed to inspect {}: {err}", root.display()))?;
            println!("{}", inventory.to_text_report());
        }
        "plan" => {
            let inventory = inventory::discover(&root)
                .map_err(|err| format!("failed to inspect {}: {err}", root.display()))?;
            let model = model_from_args(&args)?;
            let plan = DryRunAzureProvisioner.plan(&model);

            println!("SageInfra dry-run plan");
            println!("root: {}", root.display());
            println!(
                "inventory: {} Terraform files, {} Kubernetes manifest files",
                inventory.terraform_files.len(),
                inventory.kubernetes_files.len()
            );
            println!("isolation mode: {}", model.isolation.mode);
            println!(
                "existing resource reuse: {}",
                if model.isolation.allow_existing_resource_reuse {
                    "allowed"
                } else {
                    "denied"
                }
            );
            println!("new resource group: {}", plan.resource_group);
            println!("new AKS cluster: {}", plan.cluster_name);
            println!("new namespace: {}", model.namespace);
            println!("workloads to render: {}", model.workloads.len());
            println!("steps:");
            for step in plan.steps {
                println!("- {step}");
            }
            println!();
            println!("No Azure, kubectl, Docker, or Terraform write operation was run.");
            println!(
                "Future write implementation must create a new stack only and must fail closed if any target resource already exists."
            );
        }
        "render" => {
            let model = model_from_args(&args)?;
            println!("{}", render::render_model(&model));
        }
        "provision-script" => {
            let model = DeploymentModel::default_sageinsure();
            let env_name = arg_value(&args, "--env").unwrap_or_else(|| "dev01".to_string());
            let location = arg_value(&args, "--location").unwrap_or_else(|| "eastus2".to_string());
            let names = GreenfieldNames::new(&env_name, &location)?;
            println!("{}", render_greenfield_provision_script(&model, &names));
        }
        "help" | "-h" | "--help" => print_help(),
        other => {
            return Err(format!(
                "unknown command '{other}'. Use one of: plan, inventory, render, provision-script, help"
            ));
        }
    }

    Ok(())
}

fn parse_root(args: &[String]) -> Result<PathBuf, String> {
    let mut root = env::current_dir().map_err(|err| format!("failed to read cwd: {err}"))?;
    let mut index = 0;
    while index < args.len() {
        if args[index] == "--root" {
            let Some(value) = args.get(index + 1) else {
                return Err("--root requires a path".to_string());
            };
            root = PathBuf::from(value);
            index += 2;
        } else if let Some(value) = args[index].strip_prefix("--root=") {
            root = PathBuf::from(value);
            index += 1;
        } else {
            index += 1;
        }
    }
    Ok(root)
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    let mut index = 0;
    while index < args.len() {
        if args[index] == name {
            return args.get(index + 1).cloned();
        }
        if let Some(value) = args[index].strip_prefix(&format!("{name}=")) {
            return Some(value.to_string());
        }
        index += 1;
    }
    None
}

fn model_from_args(args: &[String]) -> Result<DeploymentModel, String> {
    let model = DeploymentModel::default_sageinsure();
    let Some(env_name) = arg_value(args, "--env") else {
        return Ok(model);
    };

    let location = arg_value(args, "--location").unwrap_or_else(|| "eastus2".to_string());
    let names = GreenfieldNames::new(&env_name, &location)?;
    let acr_login_server = arg_value(args, "--acr-login-server")
        .unwrap_or_else(|| format!("{}.azurecr.io", names.acr_name));
    let image_tag = arg_value(args, "--image-tag").unwrap_or_else(|| env_name.clone());

    Ok(model.materialized_greenfield(
        &env_name,
        &location,
        &names.acr_name,
        &acr_login_server,
        &image_tag,
    ))
}

fn print_help() {
    println!(
        "sageinfra\n\nUSAGE:\n  cargo run -- plan [--root <repo>] [--env dev01] [--location eastus] [--acr-login-server <server>] [--image-tag dev01]\n  cargo run -- inventory [--root <repo>]\n  cargo run -- render [--root <repo>] [--env dev01] [--location eastus] [--acr-login-server <server>] [--image-tag dev01]\n  cargo run -- provision-script [--env dev01] [--location eastus2]\n\nDefault commands are dry-run only. provision-script emits a reviewed shell script; it does not execute Azure mutations by itself."
    );
}
