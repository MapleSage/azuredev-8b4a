use sqlx::{PgPool, Row};

use crate::types::{PhoneVerifyResult, RiskLevel};

pub struct PhoneVerifier {
    db: PgPool,
}

impl PhoneVerifier {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn verify(&self, phone: &str) -> Result<PhoneVerifyResult, anyhow::Error> {
        let normalized = normalize_phone(phone);

        // Check telemarketer registry (DND list)
        let dnd_row = sqlx::query(
            "SELECT entity_name, category FROM telemarketer_registry WHERE phone = $1"
        )
        .bind(&normalized)
        .fetch_optional(&self.db)
        .await?;

        // Check verified brands
        let brand_row = sqlx::query(
            "SELECT name FROM verified_brands WHERE $1 = ANY(sender_ids) AND active = TRUE"
        )
        .bind(&normalized)
        .fetch_optional(&self.db)
        .await?;

        let dnd       = dnd_row.is_some();
        let brand     = brand_row.map(|r| r.get::<String, _>("name"));
        let verified  = brand.is_some();

        let risk = if let Some(ref row) = dnd_row {
            let cat: String = row.get("category");
            if cat == "digital_arrest" { RiskLevel::Critical }
            else { RiskLevel::High }
        } else if verified {
            RiskLevel::Low
        } else {
            RiskLevel::Medium
        };

        Ok(PhoneVerifyResult { phone: normalized, verified, dnd, brand, risk })
    }
}

fn normalize_phone(phone: &str) -> String {
    let digits: String = phone.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() == 10 {
        format!("+91{digits}")
    } else if digits.starts_with("91") && digits.len() == 12 {
        format!("+{digits}")
    } else {
        phone.to_string()
    }
}
