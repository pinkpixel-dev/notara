use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use chrono::Utc;
use tauri::{AppHandle, Emitter, Runtime};
use tauri_plugin_notification::NotificationExt;

use super::reconcile::{reconcile_startup_records, reconcile_sync_items};
use super::store::{load_store, save_store};
use super::types::{ReminderDeliveryState, ReminderStoreData, SyncReminderItem, TaskReminderRecord};

pub struct ReminderEngine {
    state: Arc<Mutex<EngineInner>>,
}

struct EngineInner {
    workspace_root: Option<PathBuf>,
    store: ReminderStoreData,
}

impl Default for ReminderEngine {
    fn default() -> Self {
        Self {
            state: Arc::new(Mutex::new(EngineInner {
                workspace_root: None,
                store: ReminderStoreData::default(),
            })),
        }
    }
}

impl ReminderEngine {
    pub fn new() -> Self {
        Self::default()
    }

    /// Spawns the background notification ticker loop.
    pub fn start_worker<R: Runtime>(&self, app_handle: AppHandle<R>) {
        let state_arc = Arc::clone(&self.state);

        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_secs(5));

                let now = Utc::now();
                let mut due_to_notify = Vec::new();
                let mut workspace_to_save = None;
                let mut store_to_save = None;

                {
                    if let Ok(mut inner) = state_arc.lock() {
                        let mut changed = false;
                        for record in &mut inner.store.reminders {
                            if record.state == ReminderDeliveryState::Scheduled {
                                if let Some(trigger) = record.trigger_instant() {
                                    if trigger <= now {
                                        record.state = ReminderDeliveryState::Delivered;
                                        record.delivered_at = Some(now.to_rfc3339());
                                        record.is_overdue_notice = false;
                                        due_to_notify.push(record.clone());
                                        changed = true;
                                    }
                                }
                            }
                        }

                        if changed {
                            if let Some(ref root) = inner.workspace_root {
                                workspace_to_save = Some(root.clone());
                                store_to_save = Some(inner.store.clone());
                            }
                        }
                    }
                }

                if let (Some(root), Some(store)) = (workspace_to_save, store_to_save) {
                    let _ = save_store(&root, &store);
                }

                for record in due_to_notify {
                    Self::post_notification(&app_handle, &record);
                }
            }
        });
    }

    /// Initializes or switches the active workspace root.
    /// Runs startup reconciliation and fires overdue notices.
    pub fn set_workspace<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        workspace_root: &Path,
    ) -> Result<Vec<TaskReminderRecord>, String> {
        let mut inner = self.state.lock().map_err(|e| e.to_string())?;
        inner.workspace_root = Some(workspace_root.to_path_buf());

        let store = load_store(workspace_root);
        let now = Utc::now();
        let (reconciled_records, to_notify) =
            reconcile_startup_records(store.reminders, &now);

        inner.store.reminders = reconciled_records;
        let _ = save_store(workspace_root, &inner.store);

        // Fire any pending overdue notifications once
        for record in to_notify {
            Self::post_notification(app_handle, &record);
        }

        Ok(inner.store.reminders.clone())
    }

    /// Clears the active workspace.
    pub fn clear_workspace(&self) {
        if let Ok(mut inner) = self.state.lock() {
            inner.workspace_root = None;
            inner.store = ReminderStoreData::default();
        }
    }

    /// Synchronizes reminders from the frontend to-do state.
    pub fn sync_reminders<R: Runtime>(
        &self,
        app_handle: &AppHandle<R>,
        workspace_root: &Path,
        items: &[SyncReminderItem],
    ) -> Result<Vec<TaskReminderRecord>, String> {
        let mut inner = self.state.lock().map_err(|e| e.to_string())?;
        inner.workspace_root = Some(workspace_root.to_path_buf());

        let now = Utc::now();
        let (updated, overdue) =
            reconcile_sync_items(inner.store.reminders.clone(), items, &now);

        inner.store.reminders = updated;
        let _ = save_store(workspace_root, &inner.store);

        for record in overdue {
            Self::post_notification(app_handle, &record);
        }

        Ok(inner.store.reminders.clone())
    }

    /// Dismisses a delivered reminder.
    pub fn dismiss_reminder(
        &self,
        workspace_root: &Path,
        reminder_id: &str,
    ) -> Result<(), String> {
        let mut inner = self.state.lock().map_err(|e| e.to_string())?;
        let now = Utc::now();

        if let Some(record) = inner.store.reminders.iter_mut().find(|r| r.id == reminder_id) {
            record.state = ReminderDeliveryState::Dismissed;
            record.dismissed_at = Some(now.to_rfc3339());
            let _ = save_store(workspace_root, &inner.store);
            Ok(())
        } else {
            Err(format!("Reminder '{}' not found", reminder_id))
        }
    }

    /// Gets all current reminder records.
    pub fn get_records(&self, workspace_root: &Path) -> Result<Vec<TaskReminderRecord>, String> {
        let inner = self.state.lock().map_err(|e| e.to_string())?;
        if inner.workspace_root.as_deref() == Some(workspace_root) {
            Ok(inner.store.reminders.clone())
        } else {
            let store = load_store(workspace_root);
            Ok(store.reminders)
        }
    }

    fn post_notification<R: Runtime>(app_handle: &AppHandle<R>, record: &TaskReminderRecord) {
        let title = if record.is_overdue_notice {
            format!("Overdue: {}", record.task_title)
        } else {
            format!("Reminder: {}", record.task_title)
        };

        let body = if record.is_overdue_notice {
            format!(
                "Task in '{}' was due on {} at {}",
                record.list_title, record.date, record.time
            )
        } else {
            format!("Task in '{}' is due now", record.list_title)
        };

        if let Err(err) = app_handle
            .notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
        {
            log::warn!("Failed to deliver native notification: {err}");
        }

        // Also emit event to webview if open
        let _ = app_handle.emit("notara://reminder-delivered", record);
    }
}
