//! Reading a Responses API reply.
//!
//! The Responses API returns an array of typed items, not a message with a
//! body, and the raw JSON has no `output_text` convenience field: that belongs
//! to the official SDKs. Everything that has to know the shape of a reply lives
//! here, with the tests that pin it down.

use super::{ToolCall, Usage};

/// Collects every `output_text` fragment the response carried.
///
/// The Responses API returns an array of typed items, and the raw JSON has no
/// `output_text` convenience field: that belongs to the official SDKs. A
/// reasoning model puts a reasoning item ahead of the message, so indexing into
/// the first item would read the wrong thing.
pub(super) fn collect_text(payload: &serde_json::Value) -> String {
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
///
/// Items without content are skipped rather than ending the search. Reasoning
/// items and tool calls both have none, and stopping at the first of those
/// would miss a refusal that came after it.
pub(super) fn collect_refusal(payload: &serde_json::Value) -> Option<String> {
    let output = payload["output"].as_array()?;

    for item in output {
        let Some(content) = item["content"].as_array() else {
            continue;
        };

        for part in content {
            if part["type"].as_str() == Some("refusal") {
                return part["refusal"].as_str().map(str::to_string);
            }
        }
    }

    None
}

/// Collects the tool calls the model asked for.
///
/// `arguments` stays a string rather than being parsed here. It is generated
/// text that has to survive back to the tool that knows its shape, and parsing
/// it in the middle would only add a place for it to fail with no context.
pub(super) fn collect_tool_calls(payload: &serde_json::Value) -> Vec<ToolCall> {
    let Some(output) = payload["output"].as_array() else {
        return Vec::new();
    };

    output
        .iter()
        .filter(|item| item["type"].as_str() == Some("function_call"))
        .filter_map(|item| {
            Some(ToolCall {
                call_id: item["call_id"].as_str()?.to_string(),
                name: item["name"].as_str()?.to_string(),
                arguments: item["arguments"].as_str().unwrap_or("{}").to_string(),
            })
        })
        .collect()
}

pub(super) fn collect_usage(payload: &serde_json::Value) -> Usage {
    let usage = &payload["usage"];
    let count = |field: &str| usage[field].as_u64().unwrap_or_default();

    Usage {
        input_tokens: count("input_tokens"),
        output_tokens: count("output_tokens"),
        total_tokens: count("total_tokens"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

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
    fn reads_a_tool_call() {
        let payload = json!({
            "output": [{
                "type": "function_call",
                "id": "fc_1",
                "call_id": "call_1",
                "name": "search_notes",
                "arguments": "{\"query\":\"rent\"}"
            }]
        });

        let calls = collect_tool_calls(&payload);

        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0].call_id, "call_1");
        assert_eq!(calls[0].name, "search_notes");
        assert_eq!(calls[0].arguments, "{\"query\":\"rent\"}");
    }

    #[test]
    fn reads_several_tool_calls_and_ignores_other_items() {
        let payload = json!({
            "output": [
                { "type": "reasoning", "summary": [] },
                { "type": "function_call", "call_id": "a", "name": "one", "arguments": "{}" },
                { "type": "message", "content": [{ "type": "output_text", "text": "working" }] },
                { "type": "function_call", "call_id": "b", "name": "two", "arguments": "{}" }
            ]
        });

        let calls = collect_tool_calls(&payload);

        assert_eq!(calls.len(), 2);
        assert_eq!(calls[1].name, "two");
        assert_eq!(collect_text(&payload), "working");
    }

    #[test]
    fn treats_missing_arguments_as_an_empty_object() {
        let payload = json!({
            "output": [{ "type": "function_call", "call_id": "a", "name": "one" }]
        });

        assert_eq!(collect_tool_calls(&payload)[0].arguments, "{}");
    }

    #[test]
    fn skips_a_tool_call_with_no_call_id() {
        let payload = json!({
            "output": [{ "type": "function_call", "name": "one", "arguments": "{}" }]
        });

        assert!(collect_tool_calls(&payload).is_empty());
    }

    #[test]
    fn finds_a_refusal_after_an_item_with_no_content() {
        let payload = json!({
            "output": [
                { "type": "function_call", "call_id": "a", "name": "one", "arguments": "{}" },
                {
                    "type": "message",
                    "content": [{ "type": "refusal", "refusal": "No." }]
                }
            ]
        });

        assert_eq!(collect_refusal(&payload).as_deref(), Some("No."));
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
