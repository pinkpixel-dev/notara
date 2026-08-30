use std::fs;
use std::path::{Path, PathBuf};

use super::types::{ReminderStoreData, TaskReminderRecord};
use crate::workspace::guard::SIDECAR_DIRECTORY;

pub const REMINDERS_JSON_FILENAME: &str = "reminders.json";

pub fn reminders_file_path(workspace_root: &Path) -> PathBuf {
    workspace_root
        .join(SIDECAR_DIRECTORY)
        .join(REMINDERS_JSON_FILENAME)
}

pub fn load_store(workspace_root: &Path) -> ReminderStoreData {
    let path = reminders_file_path(workspace_root);
    if !path.exists() {
        return ReminderStoreData {
            version: 1,
            reminders: Vec::new(),
        };
    }

    match fs::read_to_string(&path) {
        Ok(contents) => match serde_json::from_str::<ReminderStoreData>(&contents) {
            Ok(data) => data,
            Err(err) => {
                log::warn!("Failed to parse reminders.json at {}: {err}", path.display());
                ReminderStoreData {
                    version: 1,
                    reminders: Vec::new(),
                }
            }
        },
        Err(err) => {
            log::warn!("Failed to read reminders.json at {}: {err}", path.display());
            ReminderStoreData {
                version: 1,
                reminders: Vec::new(),
            }
        }
    }
}

pub fn save_store(workspace_root: &Path, data: &ReminderStoreData) -> Result<(), String> {
    let path = reminders_file_path(workspace_root);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Failed to serialize reminders store: {e}"))?;

    // Atomic write via tempfile in same directory
    let temp_path = path.with_extension("tmp");
    fs::write(&temp_path, json)
        .map_err(|e| format!("Failed to write temporary reminders file: {e}"))?;
    fs::rename(&temp_path, &path)
        .map_err(|e| format!("Failed to replace reminders file: {e}"))?;

    Ok(())
}

#[allow(dead_code)]
pub fn upsert_record(store: &mut ReminderStoreData, record: TaskReminderRecord) {
    if let Some(existing) = store.reminders.iter_mut().find(|r| r.id == record.id) {
        *existing = record;
    } else {
        store.reminders.push(record);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reminders::types::ReminderDeliveryState;
    use tempfile::tempdir;

    #[test]
    fn loads_empty_store_when_file_missing() {
        let dir = tempdir().unwrap();
        let store = load_store(dir.path());
        assert_eq!(store.version, 1);
        assert!(store.reminders.is_empty());
    }

    #[test]
    fn saves_and_reloads_store() {
        let dir = tempdir().unwrap();
        let sidecar = dir.path().join(SIDECAR_DIRECTORY);
        fs::create_dir_all(&sidecar).unwrap();

        let mut store = ReminderStoreData {
            version: 1,
            reminders: Vec::new(),
        };

        let record = TaskReminderRecord {
            id: "list1:task1".to_string(),
            task_id: "task1".to_string(),
            list_id: "list1".to_string(),
            task_title: "Buy milk".to_string(),
            list_title: "Groceries".to_string(),
            date: "2026-09-01".to_string(),
            time: "10:00".to_string(),
            trigger_at_utc: "2026-09-01T14:00:00Z".to_string(),
            state: ReminderDeliveryState::Scheduled,
            delivered_at: None,
            dismissed_at: None,
            is_overdue_notice: false,
        };

        upsert_record(&mut store, record.clone());
        assert_eq!(store.reminders.len(), 1);

        save_store(dir.path(), &store).unwrap();
        let reloaded = load_store(dir.path());
        assert_eq!(reloaded.reminders.len(), 1);
        assert_eq!(reloaded.reminders[0].id, "list1:task1");
        assert_eq!(reloaded.reminders[0].task_title, "Buy milk");
    }
}
