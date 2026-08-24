//! Provider errors, kept specific on the way to the UI.
//!
//! A failed request has to say what actually went wrong. An expired key, an
//! unverified organization, an exhausted quota, and a rate limit all need
//! different actions from the user, and collapsing them into "request failed"
//! hides the one piece of information that would help.
//!
//! Nothing here carries the API key. The provider does not echo it, and the
//! message is built from the provider's own text plus the status code.

use serde::Serialize;

/// What kind of failure happened, so the UI can react without parsing prose.
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum OpenAiErrorKind {
    /// No key saved, or the saved key was rejected.
    Authentication,
    /// The key is valid but the project cannot use this resource.
    Access,
    /// The organization needs verification, which GPT Image models require.
    Verification,
    /// The model is unknown to the project or has been retired.
    Model,
    /// Too many requests.
    RateLimit,
    /// Out of credit, or billing is not set up.
    Billing,
    /// The prompt or the result was refused on content grounds.
    ContentPolicy,
    /// The request itself was malformed or rejected.
    Request,
    /// OpenAI returned a server error.
    Provider,
    /// The request never reached OpenAI.
    Network,
    /// Something local went wrong: storage, encoding, or parsing.
    Local,
}

/// A provider failure, shaped for the webview.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OpenAiError {
    pub kind: OpenAiErrorKind,
    pub message: String,
    /// The OpenAI request ID, when the response carried one. Support asks for it.
    pub request_id: Option<String>,
    pub status: Option<u16>,
}

impl OpenAiError {
    pub fn local(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiErrorKind::Local,
            message: message.into(),
            request_id: None,
            status: None,
        }
    }

    pub fn network(message: impl Into<String>) -> Self {
        Self {
            kind: OpenAiErrorKind::Network,
            message: message.into(),
            request_id: None,
            status: None,
        }
    }

    pub fn content_policy(message: impl Into<String>, request_id: Option<String>) -> Self {
        Self {
            kind: OpenAiErrorKind::ContentPolicy,
            message: message.into(),
            request_id,
            status: None,
        }
    }
}

impl From<String> for OpenAiError {
    fn from(message: String) -> Self {
        Self::local(message)
    }
}

/// Pulls `error.message`, `error.code`, and `error.type` out of a provider body.
fn parse_body(body: &str) -> (Option<String>, Option<String>, Option<String>) {
    let Ok(value) = serde_json::from_str::<serde_json::Value>(body) else {
        return (None, None, None);
    };

    let error = &value["error"];

    let text = |field: &str| {
        error[field]
            .as_str()
            .map(str::to_string)
            .filter(|found| !found.is_empty())
    };

    (text("message"), text("code"), text("type"))
}

/// Chooses the error kind from the status code and the provider's own labels.
///
/// The status code alone is not enough. A 403 covers both "this project cannot
/// use that" and "your organization needs verification", and a 429 covers both
/// a rate limit and an exhausted balance. The provider's `code` separates them.
fn classify(status: u16, code: Option<&str>, error_type: Option<&str>) -> OpenAiErrorKind {
    let label = code.or(error_type).unwrap_or_default().to_lowercase();

    if label.contains("verification") || label.contains("must_be_verified") {
        return OpenAiErrorKind::Verification;
    }

    if label.contains("insufficient_quota") || label.contains("billing") {
        return OpenAiErrorKind::Billing;
    }

    if label.contains("content_policy")
        || label.contains("moderation")
        || label.contains("safety")
    {
        return OpenAiErrorKind::ContentPolicy;
    }

    if label.contains("model_not_found") {
        return OpenAiErrorKind::Model;
    }

    match status {
        401 => OpenAiErrorKind::Authentication,
        403 => OpenAiErrorKind::Access,
        404 => OpenAiErrorKind::Model,
        429 => OpenAiErrorKind::RateLimit,
        400..=499 => OpenAiErrorKind::Request,
        500..=599 => OpenAiErrorKind::Provider,
        _ => OpenAiErrorKind::Provider,
    }
}

/// The sentence shown when the provider did not supply one of its own.
fn fallback_message(kind: OpenAiErrorKind, status: u16) -> String {
    match kind {
        OpenAiErrorKind::Authentication => String::from(
            "OpenAI rejected the saved API key. Replace it in Settings, under AI & Data.",
        ),
        OpenAiErrorKind::Access => String::from(
            "This API project is not allowed to use that model or endpoint.",
        ),
        OpenAiErrorKind::Verification => String::from(
            "This organization needs verification before it can use GPT Image models. Verify it in the OpenAI console, then try again.",
        ),
        OpenAiErrorKind::Model => String::from(
            "OpenAI does not recognize that model for this project. Choose a different model in Settings.",
        ),
        OpenAiErrorKind::RateLimit => {
            String::from("OpenAI is rate limiting this project. Wait a moment and try again.")
        }
        OpenAiErrorKind::Billing => String::from(
            "This OpenAI project is out of credit. Check billing in the OpenAI console.",
        ),
        OpenAiErrorKind::ContentPolicy => {
            String::from("OpenAI refused this request on content grounds.")
        }
        OpenAiErrorKind::Provider => {
            format!("OpenAI returned a server error ({status}). Try again shortly.")
        }
        _ => format!("OpenAI returned an unexpected response ({status})."),
    }
}

/// Builds an error from a failed HTTP response.
pub fn from_response(status: u16, request_id: Option<String>, body: &str) -> OpenAiError {
    let (message, code, error_type) = parse_body(body);
    let kind = classify(status, code.as_deref(), error_type.as_deref());

    OpenAiError {
        kind,
        message: message.unwrap_or_else(|| fallback_message(kind, status)),
        request_id,
        status: Some(status),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn body(message: &str, code: &str) -> String {
        format!(r#"{{"error":{{"message":"{message}","code":"{code}","type":"invalid_request_error"}}}}"#)
    }

    #[test]
    fn treats_401_as_an_authentication_failure() {
        let error = from_response(401, None, &body("Incorrect API key provided", "invalid_api_key"));
        assert_eq!(error.kind, OpenAiErrorKind::Authentication);
    }

    #[test]
    fn separates_verification_from_a_plain_403() {
        let verification = from_response(403, None, &body("Org must be verified", "organization_must_be_verified"));
        assert_eq!(verification.kind, OpenAiErrorKind::Verification);

        let access = from_response(403, None, &body("Project cannot access this", "access_denied"));
        assert_eq!(access.kind, OpenAiErrorKind::Access);
    }

    #[test]
    fn separates_an_exhausted_balance_from_a_rate_limit() {
        let billing = from_response(429, None, &body("You exceeded your quota", "insufficient_quota"));
        assert_eq!(billing.kind, OpenAiErrorKind::Billing);

        let rate_limit = from_response(429, None, &body("Rate limit reached", "rate_limit_exceeded"));
        assert_eq!(rate_limit.kind, OpenAiErrorKind::RateLimit);
    }

    #[test]
    fn recognizes_an_unknown_model() {
        let error = from_response(404, None, &body("The model does not exist", "model_not_found"));
        assert_eq!(error.kind, OpenAiErrorKind::Model);
    }

    #[test]
    fn recognizes_a_content_refusal() {
        let error = from_response(400, None, &body("Blocked", "moderation_blocked"));
        assert_eq!(error.kind, OpenAiErrorKind::ContentPolicy);
    }

    #[test]
    fn keeps_the_provider_message_when_there_is_one() {
        let error = from_response(400, None, &body("Something specific happened", "bad_request"));
        assert_eq!(error.message, "Something specific happened");
    }

    #[test]
    fn falls_back_to_a_written_message_for_an_unreadable_body() {
        let error = from_response(500, None, "<html>gateway</html>");
        assert_eq!(error.kind, OpenAiErrorKind::Provider);
        assert!(error.message.contains("server error"));
    }

    #[test]
    fn carries_the_request_id_through() {
        let error = from_response(429, Some(String::from("req_123")), &body("Slow down", "rate_limit_exceeded"));
        assert_eq!(error.request_id.as_deref(), Some("req_123"));
        assert_eq!(error.status, Some(429));
    }
}
