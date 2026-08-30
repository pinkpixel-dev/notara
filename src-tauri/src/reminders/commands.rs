use tauri::{AppHandle, Runtime, State};

use super::engine::ReminderEngine;
use super::types::{SyncReminderItem, TaskReminderRecord};
use crate::workspace::state::ApprovedWorkspace;

#[tauri::command]
pub fn sync_todo_reminders<R: Runtime>(
    app: AppHandle<R>,
    workspace: State<'_, ApprovedWorkspace>,
    engine: State<'_, ReminderEngine>,
    items: Vec<SyncReminderItem>,
) -> Result<Vec<TaskReminderRecord>, String> {
    let root = workspace.require()?;
    engine.sync_reminders(&app, &root, &items)
}

#[tauri::command]
pub fn dismiss_reminder(
    workspace: State<'_, ApprovedWorkspace>,
    engine: State<'_, ReminderEngine>,
    reminder_id: String,
) -> Result<(), String> {
    let root = workspace.require()?;
    engine.dismiss_reminder(&root, &reminder_id)
}

#[tauri::command]
pub fn get_reminder_records(
    workspace: State<'_, ApprovedWorkspace>,
    engine: State<'_, ReminderEngine>,
) -> Result<Vec<TaskReminderRecord>, String> {
    let root = workspace.require()?;
    engine.get_records(&root)
}
