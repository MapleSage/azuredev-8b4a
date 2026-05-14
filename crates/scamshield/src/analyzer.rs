use anyhow::anyhow;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::types::{AnalysisResult, MatchedPattern, RiskLevel};

pub struct PatternMatcher {
    db: PgPool,
}

impl PatternMatcher {
    pub fn new(db: PgPool) -> Self {
        Self { db }
    }

    pub async fn analyze(&self, text: &str) -> Result<AnalysisResult, anyhow::Error> {
        if text.trim().is_empty() {
            return Ok(AnalysisResult {
                risk_score: 0,
                risk_level: RiskLevel::Low,
                matched_patterns: vec![],
                warnings: vec![],
                recommendations: vec!["No content to analyze.".into()],
            });
        }

        let rows = sqlx::query(
            r#"
            SELECT
                id,
                category::TEXT,
                language,
                severity,
                ts_rank(to_tsvector('simple', pattern_text), plainto_tsquery('simple', $1)) AS rank
            FROM scam_patterns
            WHERE active = TRUE
              AND to_tsvector('simple', pattern_text) @@ plainto_tsquery('simple', $1)
            ORDER BY rank DESC
            LIMIT 20
            "#,
        )
        .bind(text)
        .fetch_all(&self.db)
        .await?;

        let matched: Vec<MatchedPattern> = rows
            .iter()
            .map(|r| MatchedPattern {
                id:       r.get::<Uuid, _>("id"),
                category: r.get::<String, _>("category"),
                language: r.get::<String, _>("language"),
                severity: r.get::<i16, _>("severity"),
                rank:     r.get::<f32, _>("rank"),
            })
            .collect();

        let risk_score = calculate_risk(&matched);
        let risk_level = RiskLevel::from_score(risk_score);

        let warnings = build_warnings(&matched, risk_level);
        let recommendations = build_recommendations(risk_level);

        Ok(AnalysisResult { risk_score, risk_level, matched_patterns: matched, warnings, recommendations })
    }
}

fn calculate_risk(patterns: &[MatchedPattern]) -> u8 {
    if patterns.is_empty() {
        return 0;
    }
    let weighted: f32 = patterns
        .iter()
        .map(|p| p.severity as f32 * p.rank)
        .sum();
    // Normalize: max severity=10, rank≈1.0, 20 matches → score 100
    let score = (weighted / 2.0).min(100.0);
    score as u8
}

fn build_warnings(patterns: &[MatchedPattern], level: RiskLevel) -> Vec<String> {
    let mut w = Vec::new();
    if matches!(level, RiskLevel::High | RiskLevel::Critical) {
        w.push("⚠️ This message shows strong signs of a scam.".into());
    }
    let categories: std::collections::HashSet<&str> =
        patterns.iter().map(|p| p.category.as_str()).collect();
    if categories.contains("digital_arrest") {
        w.push("This may be a 'digital arrest' scam. No government agency arrests via video call.".into());
    }
    if categories.contains("phishing") {
        w.push("Possible phishing attempt detected. Do not share OTPs, passwords, or Aadhaar details.".into());
    }
    if categories.contains("fake_policy") || categories.contains("premium_fraud") {
        w.push("Suspected insurance fraud. Verify policy details directly with the insurer.".into());
    }
    w
}

fn build_recommendations(level: RiskLevel) -> Vec<String> {
    match level {
        RiskLevel::Low => vec!["Message appears safe. Stay vigilant.".into()],
        RiskLevel::Medium => vec![
            "Exercise caution before responding.".into(),
            "Verify the caller's identity through official channels.".into(),
        ],
        RiskLevel::High => vec![
            "Do not respond or engage with this message.".into(),
            "Report to Cybercrime Portal: cybercrime.gov.in".into(),
            "Call 1930 (National Cybercrime Helpline).".into(),
        ],
        RiskLevel::Critical => vec![
            "Do NOT respond. Block this number/sender immediately.".into(),
            "Report on TRAI Chakshu: sancharsaathi.gov.in".into(),
            "File complaint at cybercrime.gov.in".into(),
            "Call 1930 immediately if you have shared any personal or financial information.".into(),
        ],
    }
}
