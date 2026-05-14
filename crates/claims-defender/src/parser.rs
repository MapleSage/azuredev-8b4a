/// Denial letter parser.
///
/// Uses keyword + regex heuristics to categorise a denial into one of the
/// six [`DenialCategory`] variants, compute a rule-based success probability,
/// and produce a [`DenialRecommendation`].  No ML inference is performed here;
/// the ML sidecar is only used for embedding-based precedent search (Task 24).
use regex::Regex;
use serde::{Deserialize, Serialize};

// ─── Public enums ────────────────────────────────────────────────────────────

/// Mirrors the PostgreSQL `denial_category` enum in migration 004.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum DenialCategory {
    Documentation,
    Exclusion,
    WaitingPeriod,
    PreExisting,
    NonDisclosure,
    Other,
}

impl DenialCategory {
    /// Return the string value expected by PostgreSQL.
    pub fn as_pg_str(&self) -> &'static str {
        match self {
            Self::Documentation => "Documentation",
            Self::Exclusion     => "Exclusion",
            Self::WaitingPeriod => "WaitingPeriod",
            Self::PreExisting   => "PreExisting",
            Self::NonDisclosure => "NonDisclosure",
            Self::Other         => "Other",
        }
    }
}

/// Mirrors the PostgreSQL `denial_recommendation` enum in migration 004.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum DenialRecommendation {
    Challenge,
    Negotiate,
    Accept,
}

impl DenialRecommendation {
    pub fn as_pg_str(&self) -> &'static str {
        match self {
            Self::Challenge  => "Challenge",
            Self::Negotiate  => "Negotiate",
            Self::Accept     => "Accept",
        }
    }
}

// ─── Output types ────────────────────────────────────────────────────────────

/// Full analysis result returned by [`DenialParser::parse`].
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DenialAnalysis {
    /// Human-readable reason extracted from the letter.
    pub denial_reason: String,
    /// Structured category for the denial.
    pub denial_category: DenialCategory,
    /// Whether the denial appears justified under IRDAI guidelines.
    pub is_justified: bool,
    /// Rule-based probability (0–100) that a challenge would succeed.
    pub success_probability: f64,
    /// Recommended next step for the policyholder.
    pub recommendation: DenialRecommendation,
    /// Documents that appear to be missing based on the letter text.
    pub missing_documents: Vec<String>,
    /// Procedural/timeline violations detected in the letter.
    pub timeline_violations: Vec<String>,
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/// Stateless parser for insurance denial letters.
///
/// Construct once (cheap) and call [`DenialParser::parse`] for each letter.
pub struct DenialParser {
    // Pre-compiled patterns for each category — compiled once at construction.
    re_documentation: Vec<Regex>,
    re_exclusion:     Vec<Regex>,
    re_waiting:       Vec<Regex>,
    re_pre_existing:  Vec<Regex>,
    re_non_disclosure: Vec<Regex>,
    // Patterns that indicate a missing document name
    re_missing_doc:   Vec<(Regex, &'static str)>,
    // Patterns that indicate timeline/procedural violations
    re_timeline:      Vec<(Regex, &'static str)>,
}

impl DenialParser {
    /// Create a new parser, compiling all regexes.
    ///
    /// Panics if any pattern is invalid (would be a programmer error).
    pub fn new() -> Self {
        let doc_patterns = [
            r"(?i)document(s|ation)?\s+(not\s+)?(submit|provid|receiv|furnish)",
            r"(?i)incomplete\s+document",
            r"(?i)missing\s+(document|record|report|certificate)",
            r"(?i)failed\s+to\s+(submit|provide|furnish)\s+document",
            r"(?i)discharge\s+summary\s+not",
            r"(?i)hospital\s+(bill|record)s?\s+not",
            r"(?i)lack\s+of\s+documentation",
        ];
        let excl_patterns = [
            r"(?i)falls?\s+under\s+exclusion",
            r"(?i)not\s+covered\s+(under|by)\s+(the\s+)?policy",
            r"(?i)excluded\s+(from|under)\s+(the\s+)?policy",
            r"(?i)policy\s+exclusion",
            r"(?i)treatment\s+is\s+excluded",
            r"(?i)specifically\s+excluded",
            r"(?i)general\s+exclusion",
        ];
        let waiting_patterns = [
            r"(?i)waiting\s+period",
            r"(?i)initial\s+waiting",
            r"(?i)30[\s\-]day\s+waiting",
            r"(?i)90[\s\-]day\s+waiting",
            r"(?i)(1|2|3|4)\s+year\s+waiting",
            r"(?i)claim(s)?\s+within\s+waiting",
        ];
        let pre_patterns = [
            r"(?i)pre[\s\-]existing\s+(disease|condition|ailment)",
            r"(?i)pre[\s\-]existing\s+illness",
            r"(?i)PED\s+(clause|exclusion|condition)",
            r"(?i)existed\s+prior\s+to\s+(the\s+)?policy",
            r"(?i)condition\s+existed\s+before",
        ];
        let nd_patterns = [
            r"(?i)non[\s\-]disclosure",
            r"(?i)material\s+(non[\s\-]?disclosure|fact)",
            r"(?i)misrepresent(ation|ed)",
            r"(?i)concealment\s+of",
            r"(?i)false\s+(declaration|statement|information)",
            r"(?i)incorrect\s+(information|details)\s+in\s+(the\s+)?proposal",
        ];

        let missing_docs = [
            (r"(?i)discharge\s+summary",          "Discharge Summary"),
            (r"(?i)hospital\s+bills?",             "Hospital Bills"),
            (r"(?i)investigation\s+reports?",      "Investigation Reports"),
            (r"(?i)doctor'?s?\s+certificate",      "Doctor's Certificate"),
            (r"(?i)claim\s+form",                  "Claim Form"),
            (r"(?i)policy\s+documents?",           "Policy Document"),
            (r"(?i)id\s+proof",                    "ID Proof"),
            (r"(?i)prescription",                  "Prescription"),
            (r"(?i)laboratory\s+reports?",         "Laboratory Reports"),
            (r"(?i)radiology\s+reports?",          "Radiology Reports"),
        ];

        let timeline_violations = [
            (r"(?i)not\s+intimated?\s+within",    "Claim not intimated within required timeline"),
            (r"(?i)delay\s+in\s+(reporting|intimat)", "Delayed claim reporting"),
            (r"(?i)(30|60|90)\s+day(s)?\s+limit",    "Statutory claim period violation"),
            (r"(?i)lapsed\s+policy",               "Policy was lapsed at time of claim"),
        ];

        Self {
            re_documentation:  compile_patterns(&doc_patterns),
            re_exclusion:      compile_patterns(&excl_patterns),
            re_waiting:        compile_patterns(&waiting_patterns),
            re_pre_existing:   compile_patterns(&pre_patterns),
            re_non_disclosure: compile_patterns(&nd_patterns),
            re_missing_doc:    compile_named_patterns(&missing_docs),
            re_timeline:       compile_named_patterns(&timeline_violations),
        }
    }

    /// Parse extracted text from a denial letter and return full analysis.
    pub fn parse(&self, text: &str) -> DenialAnalysis {
        let category = self.categorise(text);
        let success_probability = success_prob_for(&category);
        let recommendation = recommendation_for(success_probability);
        let denial_reason = extract_reason(text, &category);
        let is_justified = is_justified_denial(&category, text);
        let missing_documents = self.find_missing_docs(text);
        let timeline_violations = self.find_timeline_violations(text);

        DenialAnalysis {
            denial_reason,
            denial_category: category,
            is_justified,
            success_probability,
            recommendation,
            missing_documents,
            timeline_violations,
        }
    }

    // ── private helpers ──────────────────────────────────────────────────────

    fn categorise(&self, text: &str) -> DenialCategory {
        // Score each category by number of pattern matches; highest wins.
        let scores = [
            (count_matches(&self.re_documentation,  text), DenialCategory::Documentation),
            (count_matches(&self.re_waiting,         text), DenialCategory::WaitingPeriod),
            (count_matches(&self.re_pre_existing,    text), DenialCategory::PreExisting),
            (count_matches(&self.re_non_disclosure,  text), DenialCategory::NonDisclosure),
            (count_matches(&self.re_exclusion,       text), DenialCategory::Exclusion),
        ];

        scores
            .into_iter()
            .max_by_key(|(score, _)| *score)
            .filter(|(score, _)| *score > 0)
            .map(|(_, cat)| cat)
            .unwrap_or(DenialCategory::Other)
    }

    fn find_missing_docs(&self, text: &str) -> Vec<String> {
        self.re_missing_doc
            .iter()
            .filter(|(re, _)| re.is_match(text))
            .map(|(_, name)| name.to_string())
            .collect()
    }

    fn find_timeline_violations(&self, text: &str) -> Vec<String> {
        self.re_timeline
            .iter()
            .filter(|(re, _)| re.is_match(text))
            .map(|(_, msg)| msg.to_string())
            .collect()
    }
}

impl Default for DenialParser {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Rule-based probability + recommendation ─────────────────────────────────

/// Rule-based success probability per IRDAI challenge statistics.
/// Values are percentages (0–100).
fn success_prob_for(cat: &DenialCategory) -> f64 {
    match cat {
        DenialCategory::Documentation => 70.0,
        DenialCategory::WaitingPeriod => 30.0,
        DenialCategory::Exclusion     => 25.0,
        DenialCategory::PreExisting   => 35.0,
        DenialCategory::NonDisclosure => 20.0,
        DenialCategory::Other         => 50.0,
    }
}

fn recommendation_for(prob: f64) -> DenialRecommendation {
    if prob > 60.0 {
        DenialRecommendation::Challenge
    } else if prob >= 40.0 {
        DenialRecommendation::Negotiate
    } else {
        DenialRecommendation::Accept
    }
}

/// Heuristic: Documentation denials are often unjustified (documents can be
/// resubmitted); hard-exclusion / non-disclosure denials are usually justified.
fn is_justified_denial(cat: &DenialCategory, _text: &str) -> bool {
    matches!(
        cat,
        DenialCategory::Exclusion | DenialCategory::NonDisclosure
    )
}

/// Extract a short denial reason sentence from the letter text.
fn extract_reason(text: &str, cat: &DenialCategory) -> String {
    // Try to pull the first sentence that mentions the denial.
    let re = Regex::new(r"(?i)(denied?|rejected?|repudiated?)[^.]{5,120}\.").unwrap();
    if let Some(cap) = re.find(text) {
        return cap.as_str().trim().to_string();
    }

    // Fallback to category description
    match cat {
        DenialCategory::Documentation => "Claim denied due to incomplete or missing documentation.".into(),
        DenialCategory::Exclusion     => "Claim denied as treatment falls under policy exclusions.".into(),
        DenialCategory::WaitingPeriod => "Claim denied because treatment occurred within the waiting period.".into(),
        DenialCategory::PreExisting   => "Claim denied due to pre-existing disease or condition.".into(),
        DenialCategory::NonDisclosure => "Claim denied due to material non-disclosure in the proposal.".into(),
        DenialCategory::Other         => "Claim denied (reason not clearly specified in letter).".into(),
    }
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

fn compile_patterns(patterns: &[&str]) -> Vec<Regex> {
    patterns.iter().map(|p| Regex::new(p).expect("invalid regex")).collect()
}

fn compile_named_patterns(pairs: &[(&str, &'static str)]) -> Vec<(Regex, &'static str)> {
    pairs.iter()
        .map(|(p, name)| (Regex::new(p).expect("invalid regex"), *name))
        .collect()
}

fn count_matches(patterns: &[Regex], text: &str) -> usize {
    patterns.iter().filter(|re| re.is_match(text)).count()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn categorises_documentation() {
        let parser = DenialParser::new();
        let text = "Your claim is denied because the required documents were not submitted.";
        let result = parser.parse(text);
        assert_eq!(result.denial_category, DenialCategory::Documentation);
        assert_eq!(result.recommendation, DenialRecommendation::Challenge);
        assert!(!result.is_justified);
    }

    #[test]
    fn categorises_waiting_period() {
        let parser = DenialParser::new();
        let text = "The claim is rejected as treatment was availed during the initial waiting period.";
        let result = parser.parse(text);
        assert_eq!(result.denial_category, DenialCategory::WaitingPeriod);
        assert_eq!(result.recommendation, DenialRecommendation::Accept);
    }

    #[test]
    fn categorises_non_disclosure() {
        let parser = DenialParser::new();
        let text = "Claim denied due to material non-disclosure of pre-existing hypertension in the proposal form.";
        let result = parser.parse(text);
        assert!(
            result.denial_category == DenialCategory::NonDisclosure
            || result.denial_category == DenialCategory::PreExisting
        );
        assert!(result.is_justified);
    }

    #[test]
    fn success_probs_are_in_range() {
        for cat in [
            DenialCategory::Documentation,
            DenialCategory::Exclusion,
            DenialCategory::WaitingPeriod,
            DenialCategory::PreExisting,
            DenialCategory::NonDisclosure,
            DenialCategory::Other,
        ] {
            let p = success_prob_for(&cat);
            assert!((0.0..=100.0).contains(&p));
        }
    }
}
