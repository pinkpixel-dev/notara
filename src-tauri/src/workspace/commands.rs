//! Tauri commands for workspace approval and directory work.
//!
//! Every command here is a thin wrapper. It resolves the approved root from
//! backend state and hands the work to `dirs`, which holds the logic and the
//! tests. Relative paths are the only thing the webview gets to supply, so a
//! bad value cannot redirect an operation at a folder the user never approved.

use std::path::Path;

use serde::Serialize;
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_fs::FsExt;

use super::dirs::{self, DeletionPreview};
use super::guard::{canonical_root, SIDECAR_DIRECTORY};
use super::state::ApprovedWorkspace;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovedWorkspaceInfo {
    /// Absolute, symlink-resolved path to the workspace root.
    pub path: String,
    /// Final path segment, used as the display name.
    pub name: String,
    /// Absolute path to the `.notara` sidecar directory.
    pub sidecar_path: String,
}

fn display_name(root: &Path) -> String {
    root.file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| root.to_string_lossy().to_string())
}

/// Approves a folder as the workspace root.
///
/// Three things happen here and the order matters. The path is resolved and
/// checked first, then the filesystem scope is widened to cover it, then the
/// sidecar directories are created. Widening the scope before the path is known
/// good would hand out access based on an unverified string.
///
/// The sidecar gets its own scope entry. On Unix the plugin's glob matching
/// requires a literal leading dot, so a recursive rule on the root alone never
/// matches anything inside `.notara`.
#[tauri::command]
pub fn approve_workspace<R: Runtime>(
    app: AppHandle<R>,
    workspace: State<'_, ApprovedWorkspace>,
    path: String,
) -> Result<ApprovedWorkspaceInfo, String> {
    let root = canonical_root(Path::new(&path))?;
    let sidecar = root.join(SIDECAR_DIRECTORY);

    let scope = app.fs_scope();
    scope
        .allow_directory(&root, true)
        .map_err(|error| format!("Unable to grant access to {}: {error}", root.display()))?;
    scope
        .allow_directory(&sidecar, true)
        .map_err(|error| format!("Unable to grant access to {}: {error}", sidecar.display()))?;

    for directory in [sidecar.clone(), sidecar.join("backups"), sidecar.join("media")] {
        std::fs::create_dir_all(&directory)
            .map_err(|error| format!("Unable to create {}: {error}", directory.display()))?;
    }

    workspace.set(root.clone());

    Ok(ApprovedWorkspaceInfo {
        name: display_name(&root),
        path: root.to_string_lossy().to_string(),
        sidecar_path: sidecar.to_string_lossy().to_string(),
    })
}

/// Drops the approved root so later commands fail closed.
///
/// The filesystem scope is not narrowed here. The plugin has no revoke call,
/// and reconnecting to the same folder is the common case, so leaving the scope
/// alone avoids a permission prompt the user already answered.
#[tauri::command]
pub fn forget_workspace(workspace: State<'_, ApprovedWorkspace>) -> Result<(), String> {
    workspace.clear();
    Ok(())
}

#[tauri::command]
pub fn create_workspace_directory(
    workspace: State<'_, ApprovedWorkspace>,
    relative_path: String,
) -> Result<String, String> {
    dirs::create_directory(&workspace.require()?, &relative_path)
}

#[tauri::command]
pub fn rename_workspace_entry(
    workspace: State<'_, ApprovedWorkspace>,
    relative_path: String,
    new_name: String,
) -> Result<String, String> {
    dirs::rename_entry(&workspace.require()?, &relative_path, &new_name)
}

#[tauri::command]
pub fn move_workspace_entry(
    workspace: State<'_, ApprovedWorkspace>,
    relative_path: String,
    destination_directory: String,
) -> Result<String, String> {
    dirs::move_entry(&workspace.require()?, &relative_path, &destination_directory)
}

#[tauri::command]
pub fn delete_workspace_entry(
    workspace: State<'_, ApprovedWorkspace>,
    relative_path: String,
) -> Result<(), String> {
    dirs::delete_entry(&workspace.require()?, &relative_path)
}

#[tauri::command]
pub fn preview_workspace_deletion(
    workspace: State<'_, ApprovedWorkspace>,
    relative_path: String,
) -> Result<DeletionPreview, String> {
    dirs::preview_deletion(&workspace.require()?, &relative_path)
}
