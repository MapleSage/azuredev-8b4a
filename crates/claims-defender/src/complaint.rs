/// Template-based ombudsman complaint generation.
///
/// Fills a structured template with denial details, cited precedents, and
/// applicable IRDAI guidelines.  The output is plain text suitable for
/// submission to the Insurance Ombudsman under Rule 14 of the
/// Insurance Ombudsman Rules, 2017.
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::parser::{DenialAnalysis, DenialCategory, DenialRecommendation};

// ─── Input ────────────────────────────────────────────────────────────────────

/// Aggregated input used to generate the complaint draft.
#[derive(Debug)]
pub struct ComplaintInput<'a> {
    /// Policyholder's name.
    pub policyholder_name: &'a str,
    /// Insurer name as it appears in the policy schedule.
    pub insurer_name: &'a str,
    /// Policy number.
    pub policy_number: Option<&'a str>,
    /// Claim amount in INR.
    pub claim_amount: Option<f64>,
    /// Parsed denial analysis.
    pub analysis: &'a DenialAnalysis,
    /// Top similar precedents (case_id, summary, decision text).
    pub precedents: Vec<PrecedentRef>,
}

/// Lightweight precedent reference used in the complaint template.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrecedentRef {
    pub case_id: String,
    pub summary: String,
    pub decision: String,
}

// ─── Output ───────────────────────────────────────────────────────────────────

/// Generated complaint draft.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComplaintDraft {
    pub ombudsman_office: String,
    pub complaint_text: String,
    pub case_summary: String,
    pub grounds_for_complaint: Vec<String>,
    pub relief_sought: String,
    pub cited_precedents: Vec<String>,
    pub cited_clauses: Vec<String>,
    pub cited_guidelines: Vec<String>,
}

// ─── Generator ────────────────────────────────────────────────────────────────

/// Generate a complaint draft from the provided input.
///
/// The template follows the Insurance Ombudsman complaint format and cites
/// IRDAI circular references applicable to each denial category.
pub fn generate_complaint(input: &ComplaintInput<'_>) -> ComplaintDraft {
    let today = Utc::now().format("%d %B %Y").to_string();
    let policy_no = input.policy_number.unwrap_or("N/A");
    let claim_amt = input
        .claim_amount
        .map(|a| format!("₹{:.2}", a))
        .unwrap_or_else(|| "as per claim filed".to_string());

    let grounds = build_grounds(&input.analysis.denial_category, &input.analysis);
    let cited_guidelines = irdai_guidelines(&input.analysis.denial_category);
    let cited_clauses = policy_clauses(&input.analysis.denial_category);
    let cited_precedents: Vec<String> =
        input.precedents.iter().map(|p| p.case_id.clone()).collect();

    let ombudsman_office = ombudsman_office_for_region("Delhi"); // default; updated via API

    let relief = build_relief(&input.analysis, &claim_amt);
    let case_summary = build_case_summary(input, policy_no, &claim_amt, &today);

    let precedent_section = if input.precedents.is_empty() {
        String::new()
    } else {
        let paras: Vec<String> = input
            .precedents
            .iter()
            .map(|p| format!("  • {}: {} — Decision: {}", p.case_id, p.summary, p.decision))
            .collect();
        format!(
            "\n\nSUPPORTING PRECEDENTS\n{}\n",
            paras.join("\n")
        )
    };

    let guidelines_section = if cited_guidelines.is_empty() {
        String::new()
    } else {
        format!(
            "\n\nAPPLICABLE IRDAI GUIDELINES\n{}\n",
            cited_guidelines
                .iter()
                .map(|g| format!("  • {g}"))
                .collect::<Vec<_>>()
                .join("\n")
        )
    };

    let grounds_text = grounds
        .iter()
        .enumerate()
        .map(|(i, g)| format!("  {}. {}", i + 1, g))
        .collect::<Vec<_>>()
        .join("\n");

    let complaint_text = format!(
        r#"Date: {today}

TO,
The Insurance Ombudsman
{ombudsman_office}

SUBJECT: Complaint against {insurer} — Wrongful Denial of Claim (Policy No. {policy_no})

Respected Sir / Madam,

I, {policyholder}, am a policyholder of {insurer} (Policy No. {policy_no}) and am writing
to lodge a formal complaint against the unjustified denial of my insurance claim for {claim_amt}.

BACKGROUND
{case_summary}

GROUNDS FOR COMPLAINT
{grounds_text}
{precedent_section}{guidelines_section}
RELIEF SOUGHT
{relief}

I hereby request the Honourable Ombudsman to direct {insurer} to settle the above claim
in full, along with any applicable interest under Section 13 of the Insurance Ombudsman
Rules, 2017.

I declare that the facts stated above are true and correct to the best of my knowledge.

Yours faithfully,
{policyholder}
Date: {today}
"#,
        today = today,
        ombudsman_office = ombudsman_office,
        insurer = input.insurer_name,
        policy_no = policy_no,
        policyholder = input.policyholder_name,
        claim_amt = claim_amt,
        case_summary = case_summary,
        grounds_text = grounds_text,
        precedent_section = precedent_section,
        guidelines_section = guidelines_section,
        relief = relief,
    );

    ComplaintDraft {
        ombudsman_office,
        complaint_text,
        case_summary,
        grounds_for_complaint: grounds,
        relief_sought: relief,
        cited_precedents,
        cited_clauses,
        cited_guidelines,
    }
}

// ─── Template helpers ─────────────────────────────────────────────────────────

fn build_grounds(category: &DenialCategory, analysis: &DenialAnalysis) -> Vec<String> {
    let mut grounds = Vec::new();

    match category {
        DenialCategory::Documentation => {
            grounds.push(
                "The insurer failed to specify, in writing, the exact documents required at \
                 the time of claim registration, in violation of IRDAI Circular \
                 IRDAI/HLT/REG/CIR/194/08/2020.".to_string(),
            );
            grounds.push(
                "The claimed documents were available and could have been collected by the \
                 TPA / insurer through standard medical records procedure.".to_string(),
            );
            if !analysis.missing_documents.is_empty() {
                grounds.push(format!(
                    "Policyholder is prepared to submit the following additional documents: {}.",
                    analysis.missing_documents.join(", ")
                ));
            }
        }
        DenialCategory::Exclusion => {
            grounds.push(
                "The exclusion clause cited is ambiguous; under contra proferentem rule, \
                 ambiguities must be resolved in favour of the insured.".to_string(),
            );
            grounds.push(
                "The treatment is medically necessary and constitutes standard of care \
                 as certified by the treating physician.".to_string(),
            );
        }
        DenialCategory::WaitingPeriod => {
            grounds.push(
                "The policy has been continuously renewed; the waiting period credit under \
                 IRDAI (Health Insurance) Regulations, 2016 — Clause 8(2) — should apply.".to_string(),
            );
            grounds.push(
                "The insurer has incorrectly calculated the waiting period commencement date.".to_string(),
            );
        }
        DenialCategory::PreExisting => {
            grounds.push(
                "The condition was first diagnosed AFTER the policy inception date and \
                 therefore does not qualify as a pre-existing disease under the policy terms \
                 or under the IRDAI definition (Clause 29A, Insurance Act 1938 amendment 2015).".to_string(),
            );
            grounds.push(
                "The insurer conducted no pre-policy medical examination to substantiate the \
                 PED claim; without such examination, the insurer cannot unilaterally claim \
                 pre-existence.".to_string(),
            );
        }
        DenialCategory::NonDisclosure => {
            grounds.push(
                "At the time of proposal, the policyholder had no knowledge of the alleged \
                 non-disclosed condition, making non-disclosure innocent rather than fraudulent.".to_string(),
            );
            grounds.push(
                "Under Section 45 of the Insurance Act, 1938, the policy cannot be repudiated \
                 after 3 years on grounds of misstatement unless it is proven to be fraudulent.".to_string(),
            );
        }
        DenialCategory::Other => {
            grounds.push(
                "The denial does not cite a specific policy clause or IRDAI regulation \
                 justifying the repudiation.".to_string(),
            );
            grounds.push(
                "The insurer has not provided a reasoned order as mandated by IRDAI Circular \
                 IRDA/HLTH/CIR/GLD/013/02/2013.".to_string(),
            );
        }
    }

    if !analysis.timeline_violations.is_empty() {
        grounds.push(format!(
            "Procedural violations by insurer: {}.",
            analysis.timeline_violations.join("; ")
        ));
    }

    grounds
}

fn build_relief(analysis: &DenialAnalysis, claim_amt: &str) -> String {
    match analysis.recommendation {
        DenialRecommendation::Challenge => format!(
            "Direct {insurer} to pay the full claim amount of {amt} with statutory interest \
             at 2% above bank rate from the date of repudiation.",
            insurer = "the insurer",
            amt = claim_amt
        ),
        DenialRecommendation::Negotiate => format!(
            "Direct {insurer} to settle the claim for a fair and proportionate amount (not \
             less than 60% of {amt}) given the partial validity of the denial grounds.",
            insurer = "the insurer",
            amt = claim_amt
        ),
        DenialRecommendation::Accept => format!(
            "Kindly review the repudiation letter and direct the insurer to provide a \
             detailed written explanation citing specific clauses for the denial of {amt}.",
            amt = claim_amt
        ),
    }
}

fn build_case_summary(
    input: &ComplaintInput<'_>,
    policy_no: &str,
    claim_amt: &str,
    _today: &str,
) -> String {
    format!(
        "I hold a policy issued by {insurer} (Policy No. {policy_no}). A claim for \
         {claim_amt} was submitted and was denied with the reason: \"{reason}\". \
         Based on analysis under IRDAI guidelines, this denial appears to be \
         {justified} and the estimated success probability of a formal challenge \
         is {prob:.0}%.",
        insurer = input.insurer_name,
        policy_no = policy_no,
        claim_amt = claim_amt,
        reason = input.analysis.denial_reason,
        justified = if input.analysis.is_justified { "partially justified" } else { "unjustified" },
        prob = input.analysis.success_probability,
    )
}

fn irdai_guidelines(category: &DenialCategory) -> Vec<String> {
    match category {
        DenialCategory::Documentation => vec![
            "IRDAI Circular IRDAI/HLT/REG/CIR/194/08/2020 — Claims document checklist".to_string(),
            "IRDAI (Health Insurance) Regulations, 2016 — Regulation 27".to_string(),
        ],
        DenialCategory::Exclusion => vec![
            "IRDAI (Health Insurance) Regulations, 2016 — Regulation 10".to_string(),
            "Insurance Ombudsman Rules, 2017 — Rule 13".to_string(),
        ],
        DenialCategory::WaitingPeriod => vec![
            "IRDAI (Health Insurance) Regulations, 2016 — Regulation 8(2) (Portability)".to_string(),
            "IRDAI Circular IRDA/HLT/CIR/013/02/2013 — Continuity benefit".to_string(),
        ],
        DenialCategory::PreExisting => vec![
            "Insurance (Amendment) Act, 2015 — Section 45 (PED definition)".to_string(),
            "IRDAI (Health Insurance) Regulations, 2016 — Clause 29A".to_string(),
        ],
        DenialCategory::NonDisclosure => vec![
            "Insurance Act, 1938 — Section 45 (3-year repudiation limit)".to_string(),
            "IRDAI Circular IRDA/LIFE/CIR/GLD/013/02/2013".to_string(),
        ],
        DenialCategory::Other => vec![
            "IRDAI Circular IRDA/HLTH/CIR/GLD/013/02/2013 — Reasoned denial orders".to_string(),
        ],
    }
}

fn policy_clauses(category: &DenialCategory) -> Vec<String> {
    match category {
        DenialCategory::Documentation  => vec!["Claims Procedure Clause".to_string()],
        DenialCategory::Exclusion      => vec!["Exclusion Clause".to_string(), "Coverage Clause".to_string()],
        DenialCategory::WaitingPeriod  => vec!["Waiting Period Clause".to_string()],
        DenialCategory::PreExisting    => vec!["Pre-Existing Disease Clause".to_string()],
        DenialCategory::NonDisclosure  => vec!["Proposal Declaration Clause".to_string()],
        DenialCategory::Other          => vec!["General Terms and Conditions".to_string()],
    }
}

fn ombudsman_office_for_region(region: &str) -> String {
    // Default to Delhi; full mapping would be driven by user's state.
    match region {
        "Delhi" | "Haryana" | "Himachal Pradesh" | "J&K" | "Punjab" =>
            "Office of the Insurance Ombudsman, New Delhi".to_string(),
        "Maharashtra" | "Goa" =>
            "Office of the Insurance Ombudsman, Mumbai".to_string(),
        "Karnataka" =>
            "Office of the Insurance Ombudsman, Bengaluru".to_string(),
        "Tamil Nadu" | "Puducherry" =>
            "Office of the Insurance Ombudsman, Chennai".to_string(),
        "Telangana" | "Andhra Pradesh" =>
            "Office of the Insurance Ombudsman, Hyderabad".to_string(),
        "West Bengal" | "Sikkim" | "Andaman and Nicobar Islands" =>
            "Office of the Insurance Ombudsman, Kolkata".to_string(),
        _ => "Office of the Insurance Ombudsman (Central), Bhopal".to_string(),
    }
}
