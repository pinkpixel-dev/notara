//! Tauri commands for the OpenAI provider.
//!
//! These are thin wrappers, like the workspace commands. The key store and the
//! transport hold the logic and the tests. The important property is what these
//! signatures do not contain: no command returns the API key, and no command
//! accepts one except `openai_save_key`, which writes it straight to the store.

use std::path::PathBuf;

use tauri::{AppHandle, Manager, Runtime};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;

use tauri::ipc::Channel;

use super::client::{self, ImageResult, InputItem, StreamDelta, TextResult, ToolDefinition};
use super::errors::OpenAiError;
use super::secrets::{KeyStatus, KeyStore};

/// The outcome of a Test Connection press.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestResult {
    pub ok: bool,
}

fn config_directory<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| format!("Unable to find the app config directory: {error}"))
}

fn key_store<R: Runtime>(app: &AppHandle<R>) -> Result<KeyStore, String> {
    Ok(KeyStore::new(config_directory(app)?))
}

/// Reports whether a key is saved, and its masked hint.
#[tauri::command]
pub fn openai_key_status<R: Runtime>(app: AppHandle<R>) -> Result<KeyStatus, String> {
    key_store(&app)?.status()
}

/// Encrypts and saves a key, replacing any previous one.
#[tauri::command]
pub fn openai_save_key<R: Runtime>(app: AppHandle<R>, key: String) -> Result<KeyStatus, String> {
    key_store(&app)?.save(&key)
}

/// Removes the saved key.
#[tauri::command]
pub fn openai_delete_key<R: Runtime>(app: AppHandle<R>) -> Result<KeyStatus, String> {
    key_store(&app)?.delete()
}

/// Verifies the saved key against OpenAI.
#[tauri::command]
pub async fn openai_test_key<R: Runtime>(app: AppHandle<R>) -> Result<TestResult, OpenAiError> {
    let store = key_store(&app)?;
    client::test_key(&store).await?;

    Ok(TestResult { ok: true })
}

/// Runs one turn through the Responses API.
///
/// `input` carries the whole exchange, including any tool calls and their
/// results, because nothing is stored on the provider side. `tools` is the set
/// the model may ask for; the panel runs them and calls this again with the
/// answers.
#[tauri::command]
pub async fn openai_generate_text<R: Runtime>(
    app: AppHandle<R>,
    model: String,
    input: Vec<InputItem>,
    instructions: Option<String>,
    tools: Option<Vec<ToolDefinition>>,
    max_output_tokens: Option<u32>,
) -> Result<TextResult, OpenAiError> {
    let store = key_store(&app)?;

    client::generate_text(
        &store,
        &model,
        instructions,
        input,
        tools.unwrap_or_default(),
        max_output_tokens,
    )
    .await
}

/// Runs one turn and streams the reply as it is written.
///
/// The deltas go back over the channel the webview passed in; the return value
/// is the finished turn, tool calls included. `stream_id` is the frontend's own
/// identifier for this request, and the only thing `openai_cancel_stream` needs
/// to stop it.
#[tauri::command]
pub async fn openai_stream_text<R: Runtime>(
    app: AppHandle<R>,
    model: String,
    input: Vec<InputItem>,
    instructions: Option<String>,
    tools: Option<Vec<ToolDefinition>>,
    max_output_tokens: Option<u32>,
    stream_id: String,
    on_delta: Channel<StreamDelta>,
) -> Result<TextResult, OpenAiError> {
    let store = key_store(&app)?;

    client::generate_text_streaming(
        &store,
        &model,
        instructions,
        input,
        tools.unwrap_or_default(),
        max_output_tokens,
        stream_id,
        on_delta,
    )
    .await
}

/// Stops a streamed reply.
///
/// This drops the connection rather than only stopping the app from waiting, so
/// the generation itself ends. An identifier that is not streaming is ignored.
#[tauri::command]
pub fn openai_cancel_stream(stream_id: String) {
    client::cancel_stream(&stream_id);
}

/// Generates an image through the Images API.
#[tauri::command]
pub async fn openai_generate_image<R: Runtime>(
    app: AppHandle<R>,
    model: String,
    prompt: String,
    size: Option<String>,
    quality: Option<String>,
) -> Result<ImageResult, OpenAiError> {
    let store = key_store(&app)?;

    client::generate_image(&store, &model, &prompt, size, quality).await
}

/// Writes a generated image to a path the user picked in a save dialog.
///
/// This deliberately sits outside the workspace guard. That guard exists to stop
/// note operations from escaping the approved root, but a Save As destination is
/// a path the user chose in a native dialog for this one file, so the root does
/// not apply. Nothing else about it is loose: it only ever writes decoded image
/// bytes that came back from a generation in this session.
#[tauri::command]
pub fn openai_save_image(path: String, base64: String) -> Result<String, String> {
    let bytes = BASE64
        .decode(base64.as_bytes())
        .map_err(|_| String::from("The image data could not be decoded."))?;

    let destination = PathBuf::from(&path);

    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Unable to create {}: {error}", parent.display()))?;
    }

    std::fs::write(&destination, bytes)
        .map_err(|error| format!("Unable to save {}: {error}", destination.display()))?;

    Ok(destination.to_string_lossy().to_string())
}
