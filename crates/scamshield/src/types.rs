use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
    Critical,
}

impl RiskLevel {
    pub fn from_score(score: u8) -> Self {
        match score {
            0..=29  => Self::Low,
            30..=59 => Self::Medium,
            60..=79 => Self::High,
            _       => Self::Critical,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchedPattern {
    pub id:       Uuid,
    pub category: String,
    pub language: String,
    pub severity: i16,
    pub rank:     f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub risk_score:       u8,
    pub risk_level:       RiskLevel,
    pub matched_patterns: Vec<MatchedPattern>,
    pub warnings:         Vec<String>,
    pub recommendations:  Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoneVerifyResult {
    pub phone:    String,
    pub verified: bool,
    pub dnd:      bool,
    pub brand:    Option<String>,
    pub risk:     RiskLevel,
}
