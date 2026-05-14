use anyhow::{anyhow, Context};
use lopdf::Document;
use regex::Regex;

use crate::types::{ExtractedPolicy, PolicySection};

pub struct PdfExtractor;

const MAX_PDF_BYTES: usize = 50 * 1024 * 1024; // 50 MB

impl PdfExtractor {
    pub fn new() -> Self { Self }

    pub fn extract(&self, bytes: &[u8]) -> anyhow::Result<ExtractedPolicy> {
        if bytes.len() > MAX_PDF_BYTES {
            anyhow::bail!("PDF exceeds 50MB limit");
        }

        let doc = Document::load_mem(bytes)
            .context("failed to parse PDF")?;

        let page_count = doc.get_pages().len() as u32;
        let full_text  = extract_text_from_doc(&doc);

        let sections = detect_sections(&full_text);

        let mut policy = ExtractedPolicy {
            page_count,
            full_text: full_text.clone(),
            sections,
            ..Default::default()
        };

        extract_metadata(&full_text, &mut policy);
        Ok(policy)
    }
}

fn extract_text_from_doc(doc: &Document) -> String {
    let mut out = String::new();
    let pages: Vec<u32> = doc.get_pages().keys().copied().collect();
    for page in pages {
        if let Ok(text) = doc.extract_text(&[page]) {
            out.push_str(&text);
            out.push('\n');
        }
    }
    out
}

fn detect_sections(text: &str) -> Vec<PolicySection> {
    let section_headers = [
        "coverage", "exclusions", "terms and conditions", "definitions",
        "premium", "benefits", "waiting period", "claims procedure",
        "renewal", "cancellation", "co-payment", "sub-limits",
    ];

    let mut sections = Vec::new();
    let lower = text.to_lowercase();
    let lines: Vec<&str> = text.lines().collect();

    for (i, line) in lines.iter().enumerate() {
        let ll = line.to_lowercase();
        if section_headers.iter().any(|&h| ll.contains(h)) && line.len() < 80 {
            let content: String = lines
                .iter()
                .skip(i + 1)
                .take(20)
                .cloned()
                .collect::<Vec<_>>()
                .join("\n");
            sections.push(PolicySection {
                title:   line.trim().to_string(),
                content: content.trim().to_string(),
            });
        }
    }
    sections
}

fn extract_metadata(text: &str, policy: &mut ExtractedPolicy) {
    // Policy number
    if let Ok(re) = Regex::new(r"(?i)policy\s+(?:no|number|#)[.:\s]+([A-Z0-9\-/]+)") {
        if let Some(cap) = re.captures(text) {
            policy.policy_number = cap.get(1).map(|m| m.as_str().to_string());
        }
    }

    // Sum assured
    if let Ok(re) = Regex::new(r"(?i)sum\s+(?:insured|assured)[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)") {
        if let Some(cap) = re.captures(text) {
            let s = cap.get(1).unwrap().as_str().replace(',', "");
            policy.sum_assured = s.parse().ok();
        }
    }

    // Premium
    if let Ok(re) = Regex::new(r"(?i)(?:annual\s+)?premium[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)") {
        if let Some(cap) = re.captures(text) {
            let s = cap.get(1).unwrap().as_str().replace(',', "");
            policy.premium = s.parse().ok();
        }
    }

    // Insurer name — look for "issued by" or known insurer keywords
    let insurers = [
        "LIC", "HDFC ERGO", "ICICI Lombard", "Star Health", "New India",
        "United India", "National Insurance", "Oriental Insurance",
        "Bajaj Allianz", "Tata AIG", "Reliance General",
    ];
    for ins in insurers {
        if text.contains(ins) {
            policy.insurer_name = Some(ins.to_string());
            break;
        }
    }
}
