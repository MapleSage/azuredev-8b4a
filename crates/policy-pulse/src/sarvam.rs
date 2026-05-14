use anyhow::anyhow;
use regex::Regex;
use serde::{Deserialize, Serialize};

pub struct SarvamClient {
    http:     reqwest::Client,
    api_key:  String,
    base_url: String,
}

// ─── Translation types ────────────────────────────────────────────────────────

#[derive(Serialize)]
struct TranslateReq<'a> {
    input:                &'a str,
    source_language_code: &'a str,
    target_language_code: &'a str,
    speaker_gender:       &'a str,
    mode:                 &'a str,
    enable_preprocessing: bool,
}

#[derive(Deserialize)]
struct TranslateResp {
    translated_text: String,
}

// ─── LLM chat types ───────────────────────────────────────────────────────────

#[derive(Serialize)]
struct ChatReq {
    model:    String,
    messages: Vec<ChatMsg>,
}

#[derive(Serialize)]
struct ChatMsg {
    role:    String,
    content: String,
}

#[derive(Deserialize)]
struct ChatResp {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMsgResp,
}

#[derive(Deserialize)]
struct ChatMsgResp {
    content: String,
}

// ─── Implementation ───────────────────────────────────────────────────────────

impl SarvamClient {
    pub fn new(api_key: &str, base_url: &str) -> Self {
        Self {
            http:     reqwest::Client::new(),
            api_key:  api_key.to_string(),
            base_url: base_url.to_string(),
        }
    }

    pub async fn translate(&self, text: &str, target_lang: &str) -> anyhow::Result<String> {
        if self.api_key.is_empty() {
            return Ok(text.to_string());
        }

        let resp: TranslateResp = self.http
            .post(format!("{}/translate", self.base_url))
            .header("api-subscription-key", &self.api_key)
            .json(&TranslateReq {
                input:                text,
                source_language_code: "en-IN",
                target_language_code: target_lang,
                speaker_gender:       "Female",
                mode:                 "formal",
                enable_preprocessing: true,
            })
            .send()
            .await
            .map_err(|e| anyhow!("Sarvam translate request failed: {e}"))?
            .error_for_status()
            .map_err(|e| anyhow!("Sarvam translate error: {e}"))?
            .json()
            .await
            .map_err(|e| anyhow!("Sarvam translate parse error: {e}"))?;

        Ok(resp.translated_text)
    }

    /// Summarise a policy text and optionally translate the result.
    ///
    /// Steps:
    ///  1. Build an English summary via Sarvam LLM (falls back to regex extraction if LLM fails or
    ///     no key is configured).
    ///  2. Translate the English summary to `lang` using Sarvam `/translate`.
    pub async fn summarize_policy(&self, policy_text: &str, lang: &str) -> anyhow::Result<String> {
        let english_summary = self.build_english_summary(policy_text).await?;

        if lang == "en-IN" || lang == "en" {
            return Ok(english_summary);
        }
        self.translate(&english_summary, lang).await
    }

    async fn build_english_summary(&self, text: &str) -> anyhow::Result<String> {
        if !self.api_key.is_empty() {
            match self.llm_summarize(text).await {
                Ok(s) => return Ok(s),
                Err(e) => tracing::warn!("Sarvam LLM summary failed ({e}) — using structured extraction"),
            }
        }
        Ok(structured_extract(text))
    }

    async fn llm_summarize(&self, text: &str) -> anyhow::Result<String> {
        // Truncate to 8 000 chars to stay within LLM context limits.
        let truncated: String = text.chars().take(8_000).collect();

        let req = ChatReq {
            model: "sarvam-m".to_string(),
            messages: vec![
                ChatMsg {
                    role: "system".to_string(),
                    content: "You are an expert insurance policy analyst for the Indian market. \
                              Analyse the provided policy text and produce a clear, structured summary \
                              in plain English covering: insurer name, policy type, sum assured, annual \
                              premium, key coverage benefits, main exclusions, waiting periods, \
                              co-payment clause, and any other important conditions. \
                              Keep the summary under 400 words. Use markdown bold for field labels.".to_string(),
                },
                ChatMsg {
                    role: "user".to_string(),
                    content: format!("Summarise this insurance policy:\n\n{truncated}"),
                },
            ],
        };

        let resp: ChatResp = self.http
            .post(format!("{}/v1/chat/completions", self.base_url))
            .header("api-subscription-key", &self.api_key)
            .json(&req)
            .send()
            .await
            .map_err(|e| anyhow!("Sarvam LLM request failed: {e}"))?
            .error_for_status()
            .map_err(|e| anyhow!("Sarvam LLM error: {e}"))?
            .json()
            .await
            .map_err(|e| anyhow!("Sarvam LLM parse error: {e}"))?;

        resp.choices
            .into_iter()
            .next()
            .map(|c| c.message.content)
            .ok_or_else(|| anyhow!("Sarvam LLM returned no choices"))
    }
}

// ─── Structured extraction fallback ──────────────────────────────────────────

fn re_first_group(text: &str, pattern: &str) -> Option<String> {
    Regex::new(pattern).ok()?.captures(text)?.get(1).map(|m| m.as_str().to_string())
}

fn structured_extract(text: &str) -> String {
    let insurer = [
        "LIC", "HDFC ERGO", "ICICI Lombard", "Star Health", "New India",
        "United India", "National Insurance", "Oriental Insurance",
        "Bajaj Allianz", "Tata AIG", "Reliance General",
    ]
    .iter()
    .find(|&&name| text.contains(name))
    .map(|&s| s.to_string())
    .unwrap_or_else(|| "Not identified".to_string());

    let policy_number = re_first_group(
        text,
        r"(?i)policy\s+(?:no|number|#)[.:\s]+([A-Z0-9\-/]+)",
    )
    .unwrap_or_else(|| "Not specified".to_string());

    let sum_assured = re_first_group(
        text,
        r"(?i)sum\s+(?:insured|assured)[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)",
    )
    .map(|s| format!("₹{s}"))
    .unwrap_or_else(|| "Not specified".to_string());

    let premium = re_first_group(
        text,
        r"(?i)(?:annual\s+)?premium[^\d]*(?:Rs\.?\s*|INR\s*)?([\d,]+)",
    )
    .map(|s| format!("₹{s}"))
    .unwrap_or_else(|| "Not specified".to_string());

    let exclusion_count = text.to_lowercase().matches("excluded").count()
        + text.to_lowercase().matches("not covered").count()
        + text.to_lowercase().matches("exclusion").count();

    let waiting = re_first_group(text, r"(?i)waiting\s+period[^.]*?(\d+)\s*(?:year|month)")
        .map(|w| format!("{w} (review clause carefully)"))
        .unwrap_or_else(|| "Not explicitly stated".to_string());

    let copay = re_first_group(text, r"(?i)co.?pay(?:ment)?[^\d]*(\d+)\s*%")
        .map(|p| format!("{p}%"))
        .unwrap_or_else(|| "Not mentioned".to_string());

    format!(
        "**Policy Summary (Auto-Extracted)**\n\n\
         **Insurer:** {insurer}\n\
         **Policy Number:** {policy_number}\n\
         **Sum Assured:** {sum_assured}\n\
         **Annual Premium:** {premium}\n\
         **Waiting Period:** {waiting}\n\
         **Co-payment:** {copay}\n\
         **Exclusion References Detected:** {exclusion_count}\n\n\
         *This summary was generated by structured extraction. \
         For a richer AI-powered summary, configure a Sarvam AI API key. \
         Use the Q&A feature to ask specific questions about coverage.*"
    )
}
