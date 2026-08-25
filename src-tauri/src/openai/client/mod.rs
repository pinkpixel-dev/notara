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
//!
//! Tool calling runs as a loop in the webview, not here. The model asks for a
//! tool, this returns that request unanswered, the panel runs the tool against
//! the notes and tasks it already holds, and the next call carries the result
//! back. Rust stays out of it because the data the tools read lives in the
//! webview, and moving it into Rust to answer a tool call would mean copying the
//! whole workspace across the boundary for every question.

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use serde::Serialize;
use serde_json::json;

use super::errors::{from_response, OpenAiError};
use super::models::{validate_image_model, validate_text_model};
use super::secrets::KeyStore;

mod parse;

use parse::{collect_refusal, collect_text, collect_tool_calls, collect_usage};

const RESPONSES_URL: &str = "https://api.openai.com/v1/responses";
const IMAGES_URL: &str = "https://api.openai.com/v1/images/generations";
const MODELS_URL: &str = "https://api.openai.com/v1/models";
const REQUEST_TIMEOUT_SECONDS: u64 = 120;

/// One item on the way to the provider.
///
/// The Responses API takes a list of typed items rather than a list of
/// messages: a turn of conversation is one shape, a tool call is another, and a
/// tool result is a third. The panel builds them, so this is a passed-through
/// JSON object rather than a struct per shape. Every entry is checked for being
/// an object before anything is sent.
pub type InputItem = serde_json::Value;

/// A tool the model may call, as a Responses API tool definition.
///
/// These are constants defined in the frontend, not user input, so they are
/// forwarded as they arrive. Notara does not build tool definitions from
/// anything a user or a note can influence.
pub type ToolDefinition = serde_json::Value;

/// One tool call the model asked for.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ToolCall {
    /// The identifier the result has to carry back.
    pub call_id: String,
    pub name: String,
    /// The arguments, still JSON-encoded as a string, exactly as they arrived.
    pub arguments: String,
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
///
/// Text and tool calls are not exclusive. A model may say something and ask for
/// a tool in the same turn, so both are returned and the caller decides what to
/// do with each.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TextResult {
    pub text: String,
    pub tool_calls: Vec<ToolCall>,
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
    input: Vec<InputItem>,
    tools: Vec<ToolDefinition>,
    max_output_tokens: Option<u32>,
) -> Result<TextResult, OpenAiError> {
    let model = validate_text_model(model)?;

    if input.is_empty() {
        return Err(OpenAiError::local("There is nothing to send to OpenAI."));
    }

    if input.iter().any(|item| !item.is_object()) {
        return Err(OpenAiError::local(
            "The conversation could not be prepared for OpenAI.",
        ));
    }

    let key = store.reveal()?;

    let mut payload = json!({
        "model": model,
        "input": input,
        "store": false,
    });

    if !tools.is_empty() {
        payload["tools"] = json!(tools);
    }

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
    let tool_calls = collect_tool_calls(&parsed);

    // A turn that only asks for a tool carries no text, and that is a normal
    // reply rather than a failure. Only a turn with neither is empty.
    if text.trim().is_empty() && tool_calls.is_empty() {
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
        tool_calls,
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
