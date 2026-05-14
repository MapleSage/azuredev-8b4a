use serde::Deserialize;

/// All config loaded from environment variables at startup.
/// ACA / AKS injects these from Key Vault references or direct env.
#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    // Database
    pub database_url: String,

    // Redis
    pub redis_url: String,

    // Azure Key Vault
    pub key_vault_url: String,

    // Azure Blob Storage
    pub storage_account_name: String,
    pub storage_container_name: String,

    // JWT — RS256 private key PEM (loaded from Key Vault at runtime)
    #[serde(default)]
    pub jwt_private_key: String,
    #[serde(default)]
    pub jwt_public_key: String,

    // Sarvam AI
    pub sarvam_ai_key: String,
    #[serde(default = "default_sarvam_url")]
    pub sarvam_ai_url: String,

    // MSG91 SMS
    #[serde(default)]
    pub msg91_auth_key: String,
    #[serde(default)]
    pub msg91_template_id: String,
    #[serde(default)]
    pub msg91_sender_id: String,

    // SendGrid e-mail API (Task 32)
    #[serde(default)]
    pub sendgrid_api_key: String,

    // Claims Defender — embeddings sidecar URL (optional; empty = fallback mode)
    #[serde(default)]
    pub embeddings_sidecar_url: String,

    // External API proxies (India frontend tabs)
    #[serde(default = "default_uw_url")]
    pub uw_workbench_url: String,
    #[serde(default = "default_fnol_url")]
    pub fnol_api_url: String,

    // Server
    #[serde(default = "default_port")]
    pub port: u16,

    #[serde(default = "default_env")]
    pub node_env: String,
}

fn default_port() -> u16 { 3000 }
fn default_env() -> String { "production".into() }
fn default_sarvam_url() -> String { "https://api.sarvam.ai".into() }
fn default_uw_url() -> String { "https://uw-workbench-api.wonderfulbush-a9231dcf.westus2.azurecontainerapps.io".into() }
fn default_fnol_url() -> String { "https://ca-azdockmgmt5ppjq-api.gentleplant-22ae9f17.eastus2.azurecontainerapps.io".into() }

impl AppConfig {
    pub fn from_env() -> Result<Self, envy::Error> {
        envy::from_env()
    }

    pub fn is_production(&self) -> bool {
        self.node_env == "production"
    }
}
