use azure_security_keyvault::prelude::SecretClient;
use azure_core::auth::TokenCredential;
use std::sync::Arc;

pub struct KeyVaultClient {
    secrets: SecretClient,
}

impl KeyVaultClient {
    pub fn new(vault_url: &str, credential: Arc<dyn TokenCredential>) -> anyhow::Result<Self> {
        Ok(Self {
            secrets: SecretClient::new(vault_url, credential)?,
        })
    }

    pub async fn get_secret(&self, name: &str) -> anyhow::Result<String> {
        let secret = self.secrets.get(name).await?;
        Ok(secret.value)
    }
}
