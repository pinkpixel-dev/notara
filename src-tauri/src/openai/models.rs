//! The approved model catalog.
//!
//! This list mirrors `DOCS/openai_models.md`. Nothing parses that Markdown file
//! at runtime, so the two have to be updated together.
//!
//! Validation lives in the backend on purpose. The webview picks a model from a
//! fixed selector, but a selector is only a convenience: the request itself is
//! built here, and a model ID that is not on this list never reaches OpenAI.

/// Text models, in the order Settings shows them.
pub const TEXT_MODELS: [&str; 12] = [
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-5.4-nano",
    "gpt-5.2",
    "gpt-5.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
];

/// Image models, in the order Settings shows them.
pub const IMAGE_MODELS: [&str; 4] = [
    "gpt-image-2",
    "gpt-image-1.5",
    "gpt-image-1-mini",
    "gpt-image-1",
];

// The defaults live in the TypeScript mirror rather than here. Rust only ever
// validates a model the user already chose, so it has no use for a starting
// value, and a second copy would be one more thing to keep in step.

fn validate(model: &str, approved: &[&str], kind: &str) -> Result<String, String> {
    let trimmed = model.trim();

    if approved.contains(&trimmed) {
        return Ok(trimmed.to_string());
    }

    Err(format!(
        "\"{trimmed}\" is not an approved {kind} model. Choose one of: {}.",
        approved.join(", ")
    ))
}

/// Returns the model ID unchanged when it is an approved text model.
pub fn validate_text_model(model: &str) -> Result<String, String> {
    validate(model, &TEXT_MODELS, "text")
}

/// Returns the model ID unchanged when it is an approved image model.
pub fn validate_image_model(model: &str) -> Result<String, String> {
    validate(model, &IMAGE_MODELS, "image")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_every_catalog_entry() {
        for model in TEXT_MODELS {
            assert_eq!(validate_text_model(model).unwrap(), model);
        }
        for model in IMAGE_MODELS {
            assert_eq!(validate_image_model(model).unwrap(), model);
        }
    }

    #[test]
    fn trims_surrounding_whitespace() {
        assert_eq!(validate_text_model("  gpt-5.5  ").unwrap(), "gpt-5.5");
    }

    #[test]
    fn rejects_a_model_outside_the_catalog() {
        assert!(validate_text_model("gpt-4o").is_err());
        assert!(validate_image_model("dall-e-3").is_err());
    }

    #[test]
    fn keeps_text_and_image_catalogs_separate() {
        assert!(validate_text_model("gpt-image-2").is_err());
        assert!(validate_image_model("gpt-5.5").is_err());
    }

    #[test]
    fn rejects_an_empty_model() {
        assert!(validate_text_model("").is_err());
        assert!(validate_image_model("   ").is_err());
    }

    /// Reads the model IDs listed under a heading in `DOCS/openai_models.md`.
    ///
    /// Parsing the document in a test is not the same as parsing it at runtime.
    /// The catalog rules forbid the second one. The first is what stops this
    /// list, the TypeScript mirror, and the document from drifting apart.
    fn documented_models(heading: &str) -> Vec<String> {
        let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../DOCS/openai_models.md");
        let document = std::fs::read_to_string(path).expect("DOCS/openai_models.md");

        let mut found = Vec::new();
        let mut inside = false;

        for line in document.lines() {
            if line.starts_with("## ") {
                inside = line.trim() == heading;
                continue;
            }

            if inside {
                if let Some(entry) = line.strip_prefix("- `").and_then(|rest| rest.strip_suffix("`")) {
                    found.push(entry.to_string());
                }
            }
        }

        assert!(!found.is_empty(), "no models listed under {heading}");
        found
    }

    #[test]
    fn text_catalog_matches_the_documented_list() {
        assert_eq!(documented_models("## Text models"), TEXT_MODELS.to_vec());
    }

    #[test]
    fn image_catalog_matches_the_documented_list() {
        assert_eq!(documented_models("## Image models"), IMAGE_MODELS.to_vec());
    }
}
