use std::sync::Arc;

use broker_operator::{BrokerRuntime, Context, error_policy, reconcile};
use futures::StreamExt;
use kube::runtime::controller::Controller;
use kube::runtime::watcher;
use kube::{Api, Client};
use tracing::{error, info};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .json()
        .init();

    let client = Client::try_default().await?;
    let namespace = std::env::var("BROKER_OPERATOR_NAMESPACE")
        .unwrap_or_else(|_| "sageinfra-new-agents".to_string());
    let dry_run = std::env::var("BROKER_OPERATOR_AZURE_DRY_RUN")
        .map(|value| value != "false")
        .unwrap_or(true);
    let brokerruntimes = Api::<BrokerRuntime>::namespaced(client.clone(), &namespace);
    let ctx = Arc::new(Context { client, dry_run });

    info!(%namespace, dry_run, "starting BrokerRuntime operator");
    Controller::new(brokerruntimes, watcher::Config::default())
        .run(reconcile, error_policy, ctx)
        .for_each(|result| async move {
            match result {
                Ok(object_ref) => info!(?object_ref, "reconciled"),
                Err(err) => error!(%err, "reconcile stream error"),
            }
        })
        .await;

    Ok(())
}
