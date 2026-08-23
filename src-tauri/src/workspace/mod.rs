//! Workspace file engine.
//!
//! Rust owns the operations that can lose data: directory creation, renames,
//! moves, deletes, and note writes. Reading and scanning stay in TypeScript through
//! `tauri-plugin-fs`. See `DOCS/PHASE-3-PLAN.md` for why the split sits here.

pub mod commands;
pub mod dirs;
pub mod files;
pub mod guard;
pub mod state;

pub use state::ApprovedWorkspace;
