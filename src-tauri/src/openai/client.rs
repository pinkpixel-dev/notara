//! HTTP transport for OpenAI.
//!
//! Every request is built here, in Rust, because that is the only way the key
//! can stay out of the webview. The frontend sends a model ID and a prompt and
//! gets back text or image bytes; it never holds the credential and never sees
//! the `Authorization` header.
//!
//! Text uses the Responses API with `store: false`, so a note excerpt is not
//! retained on the provider side. Images use the Images API rather than the
//! Responses image tool, because Notara lets the user pick the exact GPT Image
//! model and the Images API takes that model directly.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use serde::{Deserialize, Serialize};
use serde_json::json;

use super::errors::{from_response, OpenAiError};
use super::models::{validate_image_model, validate_text_model};
use super::secrets::KeyStore;

const RESPONSES_URL: &str = "https://api.openai.com/v1/responses";
const IMAGES_URL: &str = "https://api.openai.com/v1/images/generations";
const MODELS_URL: &str = "https://api.openai.com/v1/models";
const REQUEST_TIMEOUT_SECONDS: u64 = 120;

/// One turn of conversation on the way to the provider.
#[derive(Deserialize, Serialize, Clone, Debug)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Token counts, when the provider reports them.
#[derive(Serialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Usage {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub total_tokens: u64,
}

/// A completed text generation.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TextResult {
    pub text: String,
    pub model: String,
    pub response_id: Option<String>,
    pub usage: Usage,
}

/// A completed image generation, as base64 bytes plus its media type.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ImageResult {
    pub base64: String,
    pub mime_type: String,
    pub model: String,
    pub request_id: Option<String>,
}

fn http_client() -> Result<reqwest::Client, OpenAiError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .build()
        .map_err(|error| OpenAiError::local(format!("Unable to start an HTTP client: {error}")))
}

/// Reads the request ID header before the body is consumed.
fn request_id(response: &reqwest::Response) -> Option<String> {
    response
        .headers()
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string)
}

/// Turns a transport failure into a network error the user can act on.
///
/// The provider is not involved yet at this point, so there is no status code
/// and no request ID to report.
fn network_error(error: reqwest::Error) -> OpenAiError {
    if error.is_timeout() {
        return OpenAiError::network(format!(
            "OpenAI did not respond within {REQUEST_TIMEOUT_SECONDS} seconds."
        ));
    }

    if error.is_connect() {
        return OpenAiError::network(
            "Unable to reach api.openai.com. Check the network connection.",
        );
    }

    OpenAiError::network(format!("The request to OpenAI failed: {error}"))
}

/// Collects every `output_text` fragment the response carried.
///
/// The Responses API returns an array of typed items, and the raw JSON has no
/// `output_text` convenience field: that belongs to the official SDKs. A
/// reasoning model puts a reasoning item ahead of the message, so indexing into
/// the first item would read the wrong thing.
fn collect_text(payload: &serde_json::Value) -> String {
    let Some(output) = payload["output"].as_array() else {
        return String::new();
    };

    let mut collected = String::new();

    for item in output {
        if item["type"].as_str() != Some("message") {
            continue;
        }

        let Some(content) = item["content"].as_array() else {
            continue;
        };

        for part in content {
            if part["type"].as_str() == Some("output_text") {
                if let Some(text) = part["text"].as_str() {
                    collected.push_str(text);
                }
            }
        }
    }

    collected
}

/// Finds a refusal, which arrives as a normal 200 rather than an error status.
fn collect_refusal(payload: &serde_json::Value) -> Option<String> {
    let output = payload["output"].as_array()?;

    for item in output {
        let content = item["content"].as_array()?;

        for part in content {
            if part["type"].as_str() == Some("refusal") {
                return part["refusal"].as_str().map(str::to_string);
            }
        }
    }

    None
}

fn collect_usage(payload: &serde_json::Value) -> Usage {
    let usage = &payload["usage"];
    let count = |field: &str| usage[field].as_u64().unwrap_or_default();

    Usage {
        input_tokens: count("input_tokens"),
        output_tokens: count("output_tokens"),
        total_tokens: count("total_tokens"),
    }
}

/// Checks that the saved key works, without spending tokens.
///
/// Listing models is the cheapest authenticated call available: it proves the
/// key is accepted without starting a generation the user did not ask for.
pub async fn test_key(store: &KeyStore) -> Result<(), OpenAiError> {
    let key = store.reveal()?;

    let response = http_client()?
        .get(MODELS_URL)
        .bearer_auth(&key)
        .send()
        .await
        .map_err(network_error)?;

    if response.status().is_success() {
        return Ok(());
    }

    let status = response.status().as_u16();
    let id = request_id(&response);
    let body = response.text().await.unwrap_or_default();

    Err(from_response(status, id, &body))
}

/// Runs a text generation through the Responses API.
pub async fn generate_text(
    store: &KeyStore,
    model: &str,
    instructions: Option<String>,
    messages: Vec<ChatMessage>,
    max_output_tokens: Option<u32>,
) -> Result<TextResult, OpenAiError> {
    let model = validate_text_model(model)?;

    if messages.is_empty() {
        return Err(OpenAiError::local("There is nothing to send to OpenAI."));
    }

    let key = store.reveal()?;

    let mut payload = json!({
        "model": model,
        "input": messages,
        "store": false,
    });

    if let Some(instructions) = instructions.filter(|text| !text.trim().is_empty()) {
        payload["instructions"] = json!(instructions);
    }

    if let Some(limit) = max_output_tokens {
        payload["max_output_tokens"] = json!(limit);
    }

    let response = http_client()?
        .post(RESPONSES_URL)
        .bearer_auth(&key)
        .json(&payload)
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let id = request_id(&response);
    let body = response.text().await.map_err(network_error)?;

    if !status.is_success() {
        return Err(from_response(status.as_u16(), id, &body));
    }

    let parsed: serde_json::Value = serde_json::from_str(&body)
        .map_err(|error| OpenAiError::local(format!("Unable to read the OpenAI response: {error}")))?;

    if let Some(refusal) = collect_refusal(&parsed) {
        return Err(OpenAiError::content_policy(refusal, id));
    }

    let text = collect_text(&parsed);

    if text.trim().is_empty() {
        // An incomplete response means the model stopped early, most often on
        // the output-token limit. Saying so beats an empty message bubble.
        let reason = parsed["incomplete_details"]["reason"]
            .as_str()
            .unwrap_or("no reason given");

        return Err(OpenAiError::local(format!(
            "OpenAI returned no text ({reason})."
        )));
    }

    Ok(TextResult {
        text,
        model,
        response_id: parsed["id"].as_str().map(str::to_string),
        usage: collect_usage(&parsed),
    })
}

/// Runs an image generation through the Images API.
pub async fn generate_image(
    store: &KeyStore,
    model: &str,
    prompt: &str,
    size: Option<String>,
    quality: Option<String>,
) -> Result<ImageResult, OpenAiError> {
    let model = validate_image_model(model)?;
    let prompt = prompt.trim();

    if prompt.is_empty() {
        return Err(OpenAiError::local("Describe the image before generating it."));
    }

    let key = store.reveal()?;

    let mut payload = json!({
        "model": model,
        "prompt": prompt,
        "n": 1,
    });

    if let Some(size) = size.filter(|value| !value.trim().is_empty()) {
        payload["size"] = json!(size);
    }

    if let Some(quality) = quality.filter(|value| !value.trim().is_empty()) {
        payload["quality"] = json!(quality);
    }

    let response = http_client()?
        .post(IMAGES_URL)
        .bearer_auth(&key)
        .json(&payload)
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let id = request_id(&response);
    let body = response.text().await.map_err(network_error)?;

    if !status.is_success() {
        return Err(from_response(status.as_u16(), id, &body));
    }

    let parsed: serde_json::Value = serde_json::from_str(&body)
        .map_err(|error| OpenAiError::local(format!("Unable to read the OpenAI response: {error}")))?;

    let first = &parsed["data"][0];

    let base64 = first["b64_json"]
        .as_str()
        .ok_or_else(|| OpenAiError::local("OpenAI returned no image data."))?;

    // Decoding here rather than in the webview means a truncated payload fails
    // as a provider error instead of a broken image element.
    BASE64
        .decode(base64)
        .map_err(|_| OpenAiError::local("OpenAI returned image data that could not be decoded."))?;

    let mime_type = match parsed["output_format"].as_str() {
        Some("jpeg") | Some("jpg") => "image/jpeg",
        Some("webp") => "image/webp",
        _ => "image/png",
    };

    Ok(ImageResult {
        base64: base64.to_string(),
        mime_type: mime_type.to_string(),
        model,
        request_id: id,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_text_from_a_message_item() {
        let payload = json!({
            "id": "resp_1",
            "output": [
                { "type": "reasoning", "summary": [] },
                {
                    "type": "message",
                    "content": [{ "type": "output_text", "text": "Hello there." }]
                }
            ]
        });

        assert_eq!(collect_text(&payload), "Hello there.");
    }

    #[test]
    fn joins_several_text_fragments() {
        let payload = json!({
            "output": [{
                "type": "message",
                "content": [
                    { "type": "output_text", "text": "one " },
                    { "type": "output_text", "text": "two" }
                ]
            }]
        });

        assert_eq!(collect_text(&payload), "one two");
    }

    #[test]
    fn returns_nothing_when_there_is_no_message_item() {
        let payload = json!({ "output": [{ "type": "reasoning", "summary": [] }] });
        assert_eq!(collect_text(&payload), "");
    }

    #[test]
    fn finds_a_refusal() {
        let payload = json!({
            "output": [{
                "type": "message",
                "content": [{ "type": "refusal", "refusal": "I cannot help with that." }]
            }]
        });

        assert_eq!(collect_refusal(&payload).as_deref(), Some("I cannot help with that."));
    }

    #[test]
    fn reads_usage_when_it_is_present() {
        let payload = json!({
            "usage": { "input_tokens": 12, "output_tokens": 34, "total_tokens": 46 }
        });

        let usage = collect_usage(&payload);
        assert_eq!(usage.input_tokens, 12);
        assert_eq!(usage.output_tokens, 34);
        assert_eq!(usage.total_tokens, 46);
    }

    #[test]
    fn treats_missing_usage_as_zero() {
        assert_eq!(collect_usage(&json!({})).total_tokens, 0);
    }
}
