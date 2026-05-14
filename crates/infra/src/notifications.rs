//! Multi-channel notification service (Task 32).
//!
//! Provides helpers for sending SMS (MSG91), e-mail (SendGrid), and for
//! enqueuing notification jobs in Redis so the worker can dispatch them
//! asynchronously.

use anyhow::{Context, Result};
use serde_json::Value;
use tracing::{info, warn};

use crate::{cache::CacheClient, config::AppConfig};

/// The Redis list key used for the notification worker queue.
pub const NOTIFICATIONS_QUEUE: &str = "notifications:queue";

/// Sends SMS via MSG91, e-mail via SendGrid, and enqueues jobs for the worker.
#[derive(Clone)]
pub struct NotificationService {
    config: AppConfig,
    http:   reqwest::Client,
}

impl NotificationService {
    /// Create a new `NotificationService` from a shared `AppConfig`.
    pub fn new(config: &AppConfig) -> Self {
        Self {
            config: config.clone(),
            http:   reqwest::Client::new(),
        }
    }

    /// Send an SMS message via MSG91.
    ///
    /// If `msg91_auth_key` is empty the call is skipped and a warning is
    /// logged — this lets the service start without real credentials in
    /// development environments.
    pub async fn send_sms(&self, phone: &str, message: &str) -> Result<()> {
        if self.config.msg91_auth_key.is_empty() {
            warn!(phone, "MSG91 auth key not configured — skipping SMS send");
            return Ok(());
        }

        let body = serde_json::json!({
            "sender":  self.config.msg91_sender_id,
            "route":   "4",
            "country": "91",
            "sms": [{
                "message": message,
                "to": [phone]
            }]
        });

        let resp = self
            .http
            .post("https://api.msg91.com/api/v2/sendsms")
            .header("authkey", &self.config.msg91_auth_key)
            .json(&body)
            .send()
            .await
            .context("MSG91 HTTP request failed")?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text   = resp.text().await.unwrap_or_default();
            anyhow::bail!("MSG91 returned {status}: {text}");
        }

        info!(phone, "SMS sent via MSG91");
        Ok(())
    }

    /// Send a transactional e-mail via SendGrid.
    ///
    /// If `sendgrid_api_key` is empty the call is skipped with a warning.
    pub async fn send_email(&self, to: &str, subject: &str, body: &str) -> Result<()> {
        if self.config.sendgrid_api_key.is_empty() {
            warn!(to, "SendGrid API key not configured — skipping e-mail send");
            return Ok(());
        }

        let payload = serde_json::json!({
            "personalizations": [{ "to": [{ "email": to }] }],
            "from": { "email": "noreply@sagesure.in" },
            "subject": subject,
            "content": [{ "type": "text/plain", "value": body }]
        });

        let resp = self
            .http
            .post("https://api.sendgrid.com/v3/mail/send")
            .bearer_auth(&self.config.sendgrid_api_key)
            .json(&payload)
            .send()
            .await
            .context("SendGrid HTTP request failed")?;

        // SendGrid returns 202 Accepted on success.
        if !resp.status().is_success() {
            let status = resp.status();
            let text   = resp.text().await.unwrap_or_default();
            anyhow::bail!("SendGrid returned {status}: {text}");
        }

        info!(to, subject, "E-mail sent via SendGrid");
        Ok(())
    }

    /// Push a notification job onto the Redis queue for the worker to dispatch.
    ///
    /// The `payload` must be a JSON object with at minimum `channel`,
    /// `recipient`, and `body` fields.  The worker will log it to
    /// `notification_log` and call the appropriate dispatch method.
    pub async fn enqueue(&self, cache: &CacheClient, payload: Value) -> Result<()> {
        use redis::AsyncCommands;

        let raw = serde_json::to_string(&payload)
            .context("failed to serialise notification payload")?;

        let mut conn = cache.clone();
        conn.lpush::<_, _, ()>(NOTIFICATIONS_QUEUE, &raw)
            .await
            .context("failed to enqueue notification in Redis")?;

        info!("notification enqueued in {}", NOTIFICATIONS_QUEUE);
        Ok(())
    }
}
