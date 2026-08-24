//! The OpenAI provider.
//!
//! Rust owns this boundary end to end: the key is stored here, decrypted here,
//! and used here. The webview asks for text or an image and receives the
//! result. It never holds the credential, which is the whole reason the
//! transport is not in TypeScript. See `DOCS/OPENAI.md` for the design.

pub mod client;
pub mod commands;
pub mod errors;
pub mod models;
pub mod secrets;
