/// Evidence checklist generation per denial category.
///
/// Each category maps to a static list of required documents that a
/// policyholder should gather before challenging or escalating the denial.
use serde::{Deserialize, Serialize};

use crate::parser::DenialCategory;

// ─── Types ────────────────────────────────────────────────────────────────────

/// A single item in the evidence checklist.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChecklistItem {
    /// Short document identifier (snake_case, stable across versions).
    pub id: String,
    /// Human-readable label shown in the UI.
    pub label: String,
    /// Whether this document is required vs. optional.
    pub required: bool,
    /// Guidance text explaining where to obtain the document.
    pub guidance: String,
}

impl ChecklistItem {
    fn required(id: &str, label: &str, guidance: &str) -> Self {
        Self {
            id: id.to_string(),
            label: label.to_string(),
            required: true,
            guidance: guidance.to_string(),
        }
    }

    fn optional(id: &str, label: &str, guidance: &str) -> Self {
        Self {
            id: id.to_string(),
            label: label.to_string(),
            required: false,
            guidance: guidance.to_string(),
        }
    }
}

/// Full checklist for a denial case.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceChecklist {
    /// Denial category this checklist was generated for.
    pub denial_category: DenialCategory,
    /// Ordered list of documents to gather.
    pub items: Vec<ChecklistItem>,
}

// ─── Generator ───────────────────────────────────────────────────────────────

/// Generate an evidence checklist appropriate for the given denial category.
///
/// The lists are static (no DB call required) and reviewed against IRDAI
/// circular IC-57/2019 on claims documentation requirements.
pub fn generate_checklist(category: &DenialCategory) -> EvidenceChecklist {
    let items: Vec<ChecklistItem> = match category {
        DenialCategory::Documentation => vec![
            ChecklistItem::required(
                "policy_doc",
                "Policy Document",
                "Download from insurer portal or request a certified copy.",
            ),
            ChecklistItem::required(
                "claim_form",
                "Signed Claim Form",
                "Obtain the insurer's official claim form (Form 1 / Form B).",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Keep the original denial letter with date and reference number.",
            ),
            ChecklistItem::required(
                "hospital_bills",
                "Original Hospital Bills",
                "Request itemised bills with hospital letterhead from the billing desk.",
            ),
            ChecklistItem::required(
                "discharge_summary",
                "Discharge Summary",
                "Obtain from treating hospital's medical records department.",
            ),
            ChecklistItem::required(
                "investigation_reports",
                "Investigation / Lab Reports",
                "Include all pathology, radiology, and diagnostic test reports.",
            ),
            ChecklistItem::optional(
                "supporting_docs",
                "Additional Supporting Documents",
                "Any referral letters, specialist opinions, or treatment protocols.",
            ),
        ],

        DenialCategory::Exclusion => vec![
            ChecklistItem::required(
                "policy_doc",
                "Policy Document with Exclusion Clause",
                "Highlight the specific exclusion clause cited in the denial.",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Note the clause number quoted by the insurer.",
            ),
            ChecklistItem::required(
                "hospital_bills",
                "Hospital Bills",
                "Required to demonstrate the nature and cost of treatment.",
            ),
            ChecklistItem::required(
                "doctor_certificate",
                "Treating Doctor's Certificate",
                "Ask the doctor to certify the medical necessity of the treatment.",
            ),
            ChecklistItem::optional(
                "medical_literature",
                "Medical Literature / IRDAI Circular",
                "Supporting medical evidence that the procedure is standard of care.",
            ),
        ],

        DenialCategory::WaitingPeriod => vec![
            ChecklistItem::required(
                "policy_doc",
                "Policy Document",
                "Verify the exact waiting period clause and inception date.",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Confirm the waiting period dates cited by the insurer.",
            ),
            ChecklistItem::required(
                "policy_inception_proof",
                "Policy Inception / Renewal Proofs",
                "Show continuous renewal history; waiting periods are waived on renewal.",
            ),
            ChecklistItem::required(
                "discharge_summary",
                "Discharge Summary",
                "Required to confirm the date treatment was received.",
            ),
            ChecklistItem::optional(
                "previous_policy",
                "Previous Insurer Documents (if porting)",
                "If policy was ported, waiting period credit may apply under IRDAI guidelines.",
            ),
        ],

        DenialCategory::PreExisting => vec![
            ChecklistItem::required(
                "policy_doc",
                "Policy Document",
                "Identify the PED exclusion and applicable waiting period.",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Note the specific disease cited as pre-existing.",
            ),
            ChecklistItem::required(
                "doctor_certificate",
                "Doctor's Certificate on Disease Onset",
                "Ask treating doctor to certify when the condition was first diagnosed.",
            ),
            ChecklistItem::required(
                "medical_history",
                "Medical History / Old Prescriptions",
                "Collect records that establish the actual date of first diagnosis.",
            ),
            ChecklistItem::required(
                "proposal_form",
                "Original Proposal Form",
                "Verify what was declared at the time of proposal.",
            ),
        ],

        DenialCategory::NonDisclosure => vec![
            ChecklistItem::required(
                "proposal_form",
                "Original Proposal Form",
                "Obtain a certified copy from the insurer to review declarations.",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Identify the specific disclosure the insurer claims was omitted.",
            ),
            ChecklistItem::required(
                "doctor_certificate",
                "Doctor's Certificate",
                "Certificate confirming the policyholder had no knowledge of the condition at proposal time.",
            ),
            ChecklistItem::required(
                "medical_records_at_inception",
                "Medical Records at Policy Inception",
                "Pre-policy health records to demonstrate what was known.",
            ),
            ChecklistItem::optional(
                "medical_examination_report",
                "Pre-Policy Medical Examination Report",
                "If insurer conducted a pre-policy exam, those results are relevant.",
            ),
        ],

        DenialCategory::Other => vec![
            ChecklistItem::required(
                "policy_doc",
                "Policy Document",
                "Review the policy wording for the applicable coverage clause.",
            ),
            ChecklistItem::required(
                "denial_letter",
                "Denial Letter",
                "Keep all written communications from the insurer.",
            ),
            ChecklistItem::required(
                "hospital_records",
                "Hospital Records",
                "All bills, discharge summary, and treatment notes.",
            ),
            ChecklistItem::required(
                "doctor_certificate",
                "Doctor's Certificate",
                "Certifying the necessity and nature of the treatment.",
            ),
            ChecklistItem::optional(
                "correspondence",
                "All Prior Correspondence with Insurer",
                "Emails, letters, and call logs with the insurer's TPA/claims team.",
            ),
        ],
    };

    EvidenceChecklist {
        denial_category: category.clone(),
        items,
    }
}

/// Compute completeness ratio (0.0–100.0) given which required item ids are
/// present in the uploaded set.
pub fn compute_completeness(checklist: &EvidenceChecklist, uploaded_ids: &[String]) -> f64 {
    let required: Vec<&str> = checklist
        .items
        .iter()
        .filter(|i| i.required)
        .map(|i| i.id.as_str())
        .collect();

    if required.is_empty() {
        return 100.0;
    }

    let present = required
        .iter()
        .filter(|&&id| uploaded_ids.iter().any(|u| u == id))
        .count();

    (present as f64 / required.len() as f64) * 100.0
}

/// Return a list of required item ids that are NOT yet uploaded.
pub fn missing_items<'a>(checklist: &'a EvidenceChecklist, uploaded_ids: &[String]) -> Vec<&'a str> {
    checklist
        .items
        .iter()
        .filter(|i| i.required && !uploaded_ids.iter().any(|u| u == &i.id))
        .map(|i| i.id.as_str())
        .collect()
}
