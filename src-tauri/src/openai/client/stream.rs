//! Streaming a reply as it is written.
//!
//! The Responses API sends server-sent events when `stream` is set. Each event
//! is a `data:` line holding one JSON object, and the ones that matter here are
//! the text deltas and the final response. The final event carries the whole
//! response object, tool calls included, so the same parsing the non-streaming
//! path uses works on it and nothing has to be assembled from fragments.
//!
//! Cancelling is real here in a way it never was before. A generation that is
//! no longer wanted has its connection dropped, which stops the tokens rather
//! than only stopping the app from waiting for them.

use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};

use serde::Serialize;
use serde_json::json;
use tauri::ipc::Channel;

use super::super::errors::{from_response, OpenAiError};
use super::super::models::validate_text_model;
use super::super::secrets::KeyStore;
use super::parse::{collect_refusal, collect_text, collect_tool_calls, collect_usage};
use super::{
    http_client, network_error, request_id, InputItem, TextResult, ToolDefinition, RESPONSES_URL,
};

/// One piece of the reply, on its way to the panel.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StreamDelta {
    pub text: String,
}

/// Streams the frontend asked to stop.
///
/// A set of identifiers rather than a channel per request: the cancel arrives
/// as its own command from the webview, with nothing but the identifier to go
/// on, and the streaming loop checks the set between chunks.
fn cancelled_streams() -> &'static Mutex<HashSet<String>> {
    static CANCELLED: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

    CANCELLED.get_or_init(|| Mutex::new(HashSet::new()))
}

/// Marks a stream as no longer wanted. Unknown identifiers are harmless.
pub fn cancel(stream_id: &str) {
    if let Ok(mut cancelled) = cancelled_streams().lock() {
        cancelled.insert(stream_id.to_string());
    }
}

fn is_cancelled(stream_id: &str) -> bool {
    cancelled_streams()
        .lock()
        .map(|cancelled| cancelled.contains(stream_id))
        .unwrap_or(false)
}

fn forget(stream_id: &str) {
    if let Ok(mut cancelled) = cancelled_streams().lock() {
        cancelled.remove(stream_id);
    }
}

/// Pulls the JSON objects out of one server-sent event block.
///
/// An event is a group of lines ending at a blank line. Only `data:` carries
/// anything Notara needs, and `[DONE]` is a marker rather than an object.
pub(super) fn parse_event(block: &str) -> Option<serde_json::Value> {
    let payload = block
        .lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(str::trim)
        .find(|data| !data.is_empty() && *data != "[DONE]")?;

    serde_json::from_str(payload).ok()
}

/// Builds the result from the response object the final event carried.
pub(super) fn result_from_final(
    payload: &serde_json::Value,
    model: String,
    id: Option<String>,
) -> Result<TextResult, OpenAiError> {
    if let Some(refusal) = collect_refusal(payload) {
        return Err(OpenAiError::content_policy(refusal, id));
    }

    let text = collect_text(payload);
    let tool_calls = collect_tool_calls(payload);

    if text.trim().is_empty() && tool_calls.is_empty() {
        let reason = payload["incomplete_details"]["reason"]
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
        response_id: payload["id"].as_str().map(str::to_string),
        usage: collect_usage(payload),
        cancelled: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_json_out_of_an_event_block() {
        let event = parse_event("event: response.output_text.delta\ndata: {\"type\":\"x\"}").unwrap();

        assert_eq!(event["type"], "x");
    }

    #[test]
    fn ignores_the_done_marker_and_comments() {
        assert!(parse_event("data: [DONE]").is_none());
        assert!(parse_event(": keep alive").is_none());
        assert!(parse_event("event: ping").is_none());
    }

    #[test]
    fn ignores_a_block_whose_data_is_not_json() {
        assert!(parse_event("data: not json").is_none());
    }

    #[test]
    fn builds_a_result_from_the_final_response() {
        let payload = json!({
            "id": "resp_1",
            "output": [{
                "type": "message",
                "content": [{ "type": "output_text", "text": "All done." }]
            }],
            "usage": { "input_tokens": 3, "output_tokens": 4, "total_tokens": 7 }
        });

        let result = result_from_final(&payload, "gpt-5.6-sol".into(), None).unwrap();

        assert_eq!(result.text, "All done.");
        assert_eq!(result.usage.total_tokens, 7);
        assert!(!result.cancelled);
    }

    #[test]
    fn finds_tool_calls_in_the_final_response() {
        let payload = json!({
            "output": [{
                "type": "function_call",
                "call_id": "call_1",
                "name": "search_notes",
                "arguments": "{}"
            }]
        });

        let result = result_from_final(&payload, "gpt-5.6-sol".into(), None).unwrap();

        assert_eq!(result.tool_calls.len(), 1);
        assert!(result.text.is_empty());
    }

    #[test]
    fn reports_a_refusal_from_the_final_response() {
        let payload = json!({
            "output": [{
                "type": "message",
                "content": [{ "type": "refusal", "refusal": "No." }]
            }]
        });

        assert!(result_from_final(&payload, "gpt-5.6-sol".into(), None).is_err());
    }

    #[test]
    fn cancelling_is_remembered_until_the_stream_clears_it() {
        cancel("stream-under-test");
        assert!(is_cancelled("stream-under-test"));

        forget("stream-under-test");
        assert!(!is_cancelled("stream-under-test"));
    }

    #[test]
    fn an_unknown_stream_is_not_cancelled() {
        assert!(!is_cancelled("never-started"));
    }
}

/// Runs one streaming turn, sending each delta to the webview as it arrives.
pub async fn generate_text_streaming(
    store: &KeyStore,
    model: &str,
    instructions: Option<String>,
    input: Vec<InputItem>,
    tools: Vec<ToolDefinition>,
    max_output_tokens: Option<u32>,
    stream_id: String,
    channel: Channel<StreamDelta>,
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
        "stream": true,
    });

    if let Some(instructions) = instructions.filter(|text| !text.trim().is_empty()) {
        payload["instructions"] = json!(instructions);
    }

    if !tools.is_empty() {
        payload["tools"] = json!(tools);
    }

    if let Some(limit) = max_output_tokens {
        payload["max_output_tokens"] = json!(limit);
    }

    // Cleared before the request rather than after it, so a cancel left behind
    // by an earlier stream cannot stop this one before it starts.
    forget(&stream_id);

    let mut response = http_client()?
        .post(RESPONSES_URL)
        .bearer_auth(&key)
        .json(&payload)
        .send()
        .await
        .map_err(network_error)?;

    let status = response.status();
    let id = request_id(&response);

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(from_response(status.as_u16(), id, &body));
    }

    let mut buffer = String::new();
    let mut streamed = String::new();
    let mut final_payload: Option<serde_json::Value> = None;

    loop {
        if is_cancelled(&stream_id) {
            forget(&stream_id);

            // Dropping the response closes the connection, which is what stops
            // the generation rather than only stopping this loop.
            drop(response);

            return Ok(TextResult {
                text: streamed,
                tool_calls: Vec::new(),
                model,
                response_id: None,
                usage: Default::default(),
                cancelled: true,
            });
        }

        let chunk = match response.chunk().await {
            Ok(Some(chunk)) => chunk,
            Ok(None) => break,
            Err(error) => {
                forget(&stream_id);
                return Err(network_error(error));
            }
        };

        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // An event ends at a blank line. Whatever follows the last one is a
        // partial event, so it stays in the buffer for the next chunk.
        while let Some(index) = buffer.find("\n\n") {
            let block = buffer[..index].to_string();
            buffer.drain(..index + 2);

            let Some(event) = parse_event(&block) else {
                continue;
            };

            match event["type"].as_str() {
                Some("response.output_text.delta") => {
                    if let Some(delta) = event["delta"].as_str() {
                        streamed.push_str(delta);

                        // A closed channel means the panel is gone. There is
                        // nothing useful to do about it, and failing the whole
                        // turn over it would be worse.
                        let _ = channel.send(StreamDelta {
                            text: delta.to_string(),
                        });
                    }
                }
                Some("response.completed") | Some("response.incomplete") => {
                    final_payload = Some(event["response"].clone());
                }
                Some("response.failed") => {
                    forget(&stream_id);

                    let message = event["response"]["error"]["message"]
                        .as_str()
                        .unwrap_or("OpenAI could not finish the reply.");

                    return Err(OpenAiError::provider(message, id));
                }
                Some("error") => {
                    forget(&stream_id);

                    let message = event["message"]
                        .as_str()
                        .unwrap_or("OpenAI reported an error while replying.");

                    return Err(OpenAiError::provider(message, id));
                }
                _ => {}
            }
        }
    }

    forget(&stream_id);

    match final_payload {
        Some(payload) => result_from_final(&payload, model, id),
        None if !streamed.trim().is_empty() => Ok(TextResult {
            text: streamed,
            tool_calls: Vec::new(),
            model,
            response_id: None,
            usage: Default::default(),
            cancelled: false,
        }),
        None => Err(OpenAiError::local(
            "The reply from OpenAI ended before it was finished.",
        )),
    }
}
