use azure_storage::StorageCredentials;
use azure_storage_blobs::prelude::{BlobServiceClient, ContainerClient};
use azure_core::auth::TokenCredential;
use std::sync::Arc;

#[derive(Clone)]
pub struct BlobClient {
    container: ContainerClient,
}

impl BlobClient {
    /// Create a client using the pod's system-assigned managed identity (AKS).
    pub fn from_managed_identity(account: &str, container: &str) -> anyhow::Result<Self> {
        let cred = azure_identity::create_default_credential()?;
        Ok(Self::new(account, container, cred))
    }

    pub fn new(account: &str, container: &str, credential: Arc<dyn TokenCredential>) -> Self {
        let creds = StorageCredentials::token_credential(credential);
        let service = BlobServiceClient::new(account, creds);
        Self {
            container: service.container_client(container),
        }
    }

    pub async fn upload(&self, name: &str, data: Vec<u8>, content_type: &str) -> anyhow::Result<()> {
        let ct = content_type.to_owned();
        self.container
            .blob_client(name)
            .put_block_blob(data)
            .content_type(ct)
            .await?;
        Ok(())
    }

    pub async fn download(&self, name: &str) -> anyhow::Result<Vec<u8>> {
        let data = self.container.blob_client(name).get_content().await?;
        Ok(data)
    }

    pub async fn delete(&self, name: &str) -> anyhow::Result<()> {
        self.container.blob_client(name).delete().await?;
        Ok(())
    }
}

/// Extract the blob path (name within the container) from a full Azure blob URL.
///
/// URL format: `https://{account}.blob.core.windows.net/{container}/{path}`
pub fn blob_path_from_url(url: &str, account: &str, container: &str) -> String {
    let prefix = format!("https://{account}.blob.core.windows.net/{container}/");
    url.strip_prefix(&prefix).unwrap_or(url).to_string()
}
