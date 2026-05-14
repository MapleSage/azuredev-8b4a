/// Claims Defender crate.
///
/// Provides:
/// - [`parser`]   — denial letter parsing (categorisation + probability)
/// - [`evidence`] — per-category evidence checklist generation
/// - [`complaint`] — template-based ombudsman complaint drafting
pub mod complaint;
pub mod evidence;
pub mod parser;

pub use complaint::{generate_complaint, ComplaintDraft, ComplaintInput, PrecedentRef};
pub use evidence::{compute_completeness, generate_checklist, missing_items, EvidenceChecklist};
pub use parser::{DenialAnalysis, DenialCategory, DenialParser, DenialRecommendation};
