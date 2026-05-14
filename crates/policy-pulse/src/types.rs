use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PolicySection {
    pub title:   String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedPolicy {
    pub policy_id:    Option<Uuid>,
    pub insurer_name: Option<String>,
    pub policy_number: Option<String>,
    pub policy_type:  Option<String>,
    pub sum_assured:  Option<f64>,
    pub premium:      Option<f64>,
    pub coverage_start: Option<String>,
    pub coverage_end:   Option<String>,
    pub page_count:   u32,
    pub full_text:    String,
    pub sections:     Vec<PolicySection>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedFlag {
    pub rule:        String,
    pub severity:    String,
    pub clause:      String,
    pub explanation: String,
    pub page_ref:    Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedFlagReport {
    pub policy_id:  Uuid,
    pub risk_level: RiskLevel,
    pub flag_count: usize,
    pub flags:      Vec<RedFlag>,
    pub summary:    String,
}
