use uuid::Uuid;

use crate::types::{ExtractedPolicy, RedFlag, RedFlagReport, RiskLevel};

pub struct RedFlagEngine;

impl RedFlagEngine {
    pub fn new() -> Self { Self }

    pub fn run_all(&self, policy: &ExtractedPolicy) -> RedFlagReport {
        let policy_id = policy.policy_id.unwrap_or_else(Uuid::new_v4);
        let mut flags = Vec::new();

        macro_rules! check {
            ($fn:ident) => {
                if let Some(f) = self.$fn(policy) { flags.push(f); }
            };
        }

        check!(check_excessive_exclusions);
        check!(check_long_waiting_period);
        check!(check_low_sublimits);
        check!(check_high_premium);
        check!(check_short_health_term);
        check!(check_high_copayment);
        check!(check_low_room_rent);
        check!(check_missing_commission_disclosure);
        check!(check_preexisting_blanket_exclusion);
        check!(check_no_free_look_period);

        let flag_count = flags.len();
        let risk_level = match flag_count {
            0..=2 => RiskLevel::Low,
            3..=5 => RiskLevel::Medium,
            _     => RiskLevel::High,
        };

        let summary = match risk_level {
            RiskLevel::Low    => "Policy appears standard. Review highlighted items.".into(),
            RiskLevel::Medium => "Several concerning clauses detected. Review carefully before purchase.".into(),
            RiskLevel::High   => "HIGH RISK: Multiple red flags indicate possible mis-selling. Consider filing a grievance.".into(),
        };

        RedFlagReport { policy_id, risk_level, flag_count, flags, summary }
    }

    fn check_excessive_exclusions(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let text = &policy.full_text.to_lowercase();
        let count = text.matches("not covered").count()
            + text.matches("excluded").count()
            + text.matches("exclusion").count();
        if count > 15 {
            Some(RedFlag {
                rule:        "ExcessiveExclusions".into(),
                severity:    "high".into(),
                clause:      "Exclusions section".into(),
                explanation: format!("Policy contains {count} exclusion references — unusually high (>15)."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_long_waiting_period(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let re = regex::Regex::new(r"(?i)waiting\s+period[^.]*(\d+)\s*year").ok()?;
        let cap = re.captures(&policy.full_text)?;
        let years: u32 = cap.get(1)?.as_str().parse().ok()?;
        if years > 4 {
            Some(RedFlag {
                rule:        "LongWaitingPeriod".into(),
                severity:    "high".into(),
                clause:      format!("Waiting period: {years} years"),
                explanation: format!("Waiting period of {years} years exceeds IRDAI guideline of 4 years."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_low_sublimits(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let sum = policy.sum_assured?;
        let re = regex::Regex::new(r"(?i)sub.?limit[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)").ok()?;
        let cap = re.captures(&policy.full_text)?;
        let sublimit: f64 = cap.get(1)?.as_str().replace(',', "").parse().ok()?;
        if sublimit < sum * 0.30 {
            Some(RedFlag {
                rule:        "LowSublimits".into(),
                severity:    "medium".into(),
                clause:      format!("Sub-limit: ₹{sublimit:.0}"),
                explanation: format!("Sub-limit (₹{sublimit:.0}) is less than 30% of sum assured (₹{sum:.0})."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_high_premium(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let sum     = policy.sum_assured?;
        let premium = policy.premium?;
        // Simple heuristic: >5% of sum assured is unusual for most policies
        if premium > sum * 0.05 {
            Some(RedFlag {
                rule:        "HighPremiumRatio".into(),
                severity:    "medium".into(),
                clause:      format!("Premium: ₹{premium:.0} / Sum Assured: ₹{sum:.0}"),
                explanation: format!("Premium ({:.1}% of SA) may be above market average.", premium/sum*100.0),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_short_health_term(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let text = policy.full_text.to_lowercase();
        if !text.contains("health") { return None; }
        let re = regex::Regex::new(r"(?i)policy\s+term[^.]*?(\d+)\s*year").ok()?;
        let cap = re.captures(&policy.full_text)?;
        let years: u32 = cap.get(1)?.as_str().parse().ok()?;
        if years < 5 {
            Some(RedFlag {
                rule:        "ShortHealthTerm".into(),
                severity:    "medium".into(),
                clause:      format!("Policy term: {years} year(s)"),
                explanation: format!("Health policy term of {years} year(s) is less than recommended 5 years."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_high_copayment(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let re = regex::Regex::new(r"(?i)co.?pay(?:ment)?[^\d]*(\d+)\s*%").ok()?;
        let cap = re.captures(&policy.full_text)?;
        let pct: u32 = cap.get(1)?.as_str().parse().ok()?;
        if pct > 30 {
            Some(RedFlag {
                rule:        "HighCopayment".into(),
                severity:    "high".into(),
                clause:      format!("Co-payment: {pct}%"),
                explanation: format!("Co-payment of {pct}% exceeds IRDAI guideline of 30%."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_low_room_rent(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let sum = policy.sum_assured?;
        let re = regex::Regex::new(r"(?i)room\s+rent[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)").ok()?;
        let cap = re.captures(&policy.full_text)?;
        let limit: f64 = cap.get(1)?.as_str().replace(',', "").parse().ok()?;
        if limit < sum * 0.01 {
            Some(RedFlag {
                rule:        "LowRoomRent".into(),
                severity:    "medium".into(),
                clause:      format!("Room rent limit: ₹{limit:.0}/day"),
                explanation: format!("Room rent (₹{limit:.0}/day) is below 1% of sum assured."),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_missing_commission_disclosure(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let text = policy.full_text.to_lowercase();
        if !text.contains("commission") && !text.contains("agent fee") && !text.contains("broker") {
            Some(RedFlag {
                rule:        "MissingCommissionDisclosure".into(),
                severity:    "low".into(),
                clause:      "Commission/fee disclosure".into(),
                explanation: "No commission or agent fee disclosure found. IRDAI requires transparency on intermediary compensation.".into(),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_preexisting_blanket_exclusion(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let text = policy.full_text.to_lowercase();
        if text.contains("pre-existing") && text.contains("permanently excluded") {
            Some(RedFlag {
                rule:        "PermanentPreExistingExclusion".into(),
                severity:    "critical".into(),
                clause:      "Pre-existing conditions exclusion".into(),
                explanation: "Policy permanently excludes pre-existing conditions — not permitted under IRDAI guidelines after standard waiting period.".into(),
                page_ref:    None,
            })
        } else { None }
    }

    fn check_no_free_look_period(&self, policy: &ExtractedPolicy) -> Option<RedFlag> {
        let text = policy.full_text.to_lowercase();
        if !text.contains("free look") && !text.contains("free-look") && !text.contains("cooling off") {
            Some(RedFlag {
                rule:        "NoFreeLookPeriod".into(),
                severity:    "high".into(),
                clause:      "Free look period".into(),
                explanation: "No free look period mentioned. IRDAI mandates 15-day free look period for all policies.".into(),
                page_ref:    None,
            })
        } else { None }
    }
}
