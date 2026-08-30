use chrono::{DateTime, Utc};

use super::time::{is_overdue, parse_due_instant};
use super::types::{ReminderDeliveryState, SyncReminderItem, TaskReminderRecord};


/// Reconciles stored reminders at startup or sync against the current instant.
/// Returns records that need an immediate one-time overdue notification, without duplicates.
pub fn reconcile_startup_records(
    mut records: Vec<TaskReminderRecord>,
    now: &DateTime<Utc>,
) -> (Vec<TaskReminderRecord>, Vec<TaskReminderRecord>) {
    let mut to_notify = Vec::new();

    for record in &mut records {
        if record.state == ReminderDeliveryState::Scheduled {
            if let Some(trigger_instant) = record.trigger_instant() {
                if is_overdue(&trigger_instant, now) {
                    // Mark as delivered overdue notice so it never fires again
                    record.state = ReminderDeliveryState::Delivered;
                    record.delivered_at = Some(now.to_rfc3339());
                    record.is_overdue_notice = true;
                    to_notify.push(record.clone());
                }
            }
        }
    }

    (records, to_notify)
}

/// Synchronizes a fresh list of tasks from the frontend with existing reminder records.
/// Handles:
/// - Scheduling new enabled tasks.
/// - Rescheduling tasks if date/time changed.
/// - Cancelling reminders if task is completed, deleted, or reminder is disabled.
/// - Preserving already-delivered state for unchanged triggers to prevent duplicates.
pub fn reconcile_sync_items(
    mut existing_records: Vec<TaskReminderRecord>,
    items: &[SyncReminderItem],
    now: &DateTime<Utc>,
) -> (Vec<TaskReminderRecord>, Vec<TaskReminderRecord>) {
    let mut updated_records = Vec::new();
    let mut immediate_overdue = Vec::new();

    // Map existing records by task_id
    let mut active_task_ids = std::collections::HashSet::new();

    for item in items {
        active_task_ids.insert(item.task_id.clone());
        let record_id = format!("{}:{}", item.list_id, item.task_id);

        let existing_index = existing_records.iter().position(|r| r.id == record_id);
        let existing = existing_index.map(|i| existing_records.swap_remove(i));

        // If completed or reminder disabled, cancel
        if item.checked || !item.reminder_enabled {
            if let Some(mut prev) = existing {
                if prev.state == ReminderDeliveryState::Scheduled {
                    prev.state = ReminderDeliveryState::Cancelled;
                }
                updated_records.push(prev);
            }
            continue;
        }

        // Active task with reminder enabled
        let trigger_res = parse_due_instant(&item.list_date, &item.task_time);
        let trigger_utc = match trigger_res {
            Ok(dt) => dt,
            Err(e) => {
                log::warn!("Skipping invalid reminder trigger for task {}: {e}", item.task_id);
                if let Some(prev) = existing {
                    updated_records.push(prev);
                }
                continue;
            }
        };

        if let Some(mut prev) = existing {
            if prev.matches_trigger(&item.list_date, &item.task_time) {
                // Same trigger time: keep existing status (Delivered, Scheduled, etc.)
                prev.task_title = item.task_title.clone();
                prev.list_title = item.list_title.clone();
                updated_records.push(prev);
            } else {
                // Date or time changed -> Reschedule!
                let is_past = is_overdue(&trigger_utc, now);
                let new_record = TaskReminderRecord {
                    id: record_id,
                    task_id: item.task_id.clone(),
                    list_id: item.list_id.clone(),
                    task_title: item.task_title.clone(),
                    list_title: item.list_title.clone(),
                    date: item.list_date.clone(),
                    time: item.task_time.clone(),
                    trigger_at_utc: trigger_utc.to_rfc3339(),
                    state: if is_past {
                        ReminderDeliveryState::Delivered
                    } else {
                        ReminderDeliveryState::Scheduled
                    },
                    delivered_at: if is_past {
                        Some(now.to_rfc3339())
                    } else {
                        None
                    },
                    dismissed_at: None,
                    is_overdue_notice: is_past,
                };

                if is_past {
                    immediate_overdue.push(new_record.clone());
                }
                updated_records.push(new_record);
            }
        } else {
            // New reminder enabled
            let is_past = is_overdue(&trigger_utc, now);
            let new_record = TaskReminderRecord {
                id: record_id,
                task_id: item.task_id.clone(),
                list_id: item.list_id.clone(),
                task_title: item.task_title.clone(),
                list_title: item.list_title.clone(),
                date: item.list_date.clone(),
                time: item.task_time.clone(),
                trigger_at_utc: trigger_utc.to_rfc3339(),
                state: if is_past {
                    ReminderDeliveryState::Delivered
                } else {
                    ReminderDeliveryState::Scheduled
                },
                delivered_at: if is_past {
                    Some(now.to_rfc3339())
                } else {
                    None
                },
                dismissed_at: None,
                is_overdue_notice: is_past,
            };

            if is_past {
                immediate_overdue.push(new_record.clone());
            }
            updated_records.push(new_record);
        }
    }

    // Any remaining existing records whose tasks were deleted from the list: mark cancelled
    for mut deleted in existing_records {
        if deleted.state == ReminderDeliveryState::Scheduled {
            deleted.state = ReminderDeliveryState::Cancelled;
        }
        updated_records.push(deleted);
    }

    (updated_records, immediate_overdue)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reconciles_startup_fires_single_overdue_notice_without_repetition() {
        let now = Utc::now();
        let past = now - chrono::Duration::hours(2);

        let records = vec![
            TaskReminderRecord {
                id: "l1:t1".into(),
                task_id: "t1".into(),
                list_id: "l1".into(),
                task_title: "Past task".into(),
                list_title: "List 1".into(),
                date: "2026-08-30".into(),
                time: "10:00".into(),
                trigger_at_utc: past.to_rfc3339(),
                state: ReminderDeliveryState::Scheduled,
                delivered_at: None,
                dismissed_at: None,
                is_overdue_notice: false,
            },
            TaskReminderRecord {
                id: "l1:t2".into(),
                task_id: "t2".into(),
                list_id: "l1".into(),
                task_title: "Already delivered".into(),
                list_title: "List 1".into(),
                date: "2026-08-30".into(),
                time: "09:00".into(),
                trigger_at_utc: past.to_rfc3339(),
                state: ReminderDeliveryState::Delivered,
                delivered_at: Some(past.to_rfc3339()),
                dismissed_at: None,
                is_overdue_notice: true,
            },
        ];

        let (updated, to_notify) = reconcile_startup_records(records, &now);

        // Only t1 should be in to_notify
        assert_eq!(to_notify.len(), 1);
        assert_eq!(to_notify[0].task_id, "t1");
        assert_eq!(to_notify[0].state, ReminderDeliveryState::Delivered);
        assert!(to_notify[0].is_overdue_notice);

        // Re-running startup reconcile on the updated list should notify nothing!
        let (_, second_run) = reconcile_startup_records(updated, &now);
        assert!(second_run.is_empty());
    }

    #[test]
    fn sync_cancels_completed_or_deleted_tasks() {
        let now = Utc::now();
        let future = now + chrono::Duration::hours(2);

        let existing = vec![TaskReminderRecord {
            id: "l1:t1".into(),
            task_id: "t1".into(),
            list_id: "l1".into(),
            task_title: "Task 1".into(),
            list_title: "List 1".into(),
            date: "2026-09-01".into(),
            time: "14:00".into(),
            trigger_at_utc: future.to_rfc3339(),
            state: ReminderDeliveryState::Scheduled,
            delivered_at: None,
            dismissed_at: None,
            is_overdue_notice: false,
        }];

        // Sync with t1 checked: true
        let items = vec![SyncReminderItem {
            list_id: "l1".into(),
            list_title: "List 1".into(),
            list_date: "2026-09-01".into(),
            task_id: "t1".into(),
            task_title: "Task 1".into(),
            task_time: "14:00".into(),
            checked: true,
            reminder_enabled: true,
        }];

        let (updated, _) = reconcile_sync_items(existing, &items, &now);
        assert_eq!(updated.len(), 1);
        assert_eq!(updated[0].state, ReminderDeliveryState::Cancelled);
    }
}
