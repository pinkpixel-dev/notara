use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ReminderDeliveryState {
    Scheduled,
    Delivered,
    Dismissed,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskReminderRecord {
    pub id: String,
    pub task_id: String,
    pub list_id: String,
    pub task_title: String,
    pub list_title: String,
    pub date: String,
    pub time: String,
    pub trigger_at_utc: String,
    pub state: ReminderDeliveryState,
    pub delivered_at: Option<String>,
    pub dismissed_at: Option<String>,
    pub is_overdue_notice: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReminderItem {
    pub list_id: String,
    pub list_title: String,
    pub list_date: String,
    pub task_id: String,
    pub task_title: String,
    pub task_time: String,
    pub checked: bool,
    pub reminder_enabled: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ReminderStoreData {
    pub version: u32,
    pub reminders: Vec<TaskReminderRecord>,
}

#[allow(dead_code)]
impl TaskReminderRecord {
    pub fn is_active_for_trigger(&self, date: &str, time: &str) -> bool {
        self.date == date && self.time == time && self.state == ReminderDeliveryState::Scheduled
    }

    pub fn matches_trigger(&self, date: &str, time: &str) -> bool {
        self.date == date && self.time == time
    }

    pub fn is_delivered_or_dismissed(&self) -> bool {
        matches!(
            self.state,
            ReminderDeliveryState::Delivered | ReminderDeliveryState::Dismissed
        )
    }

    pub fn trigger_instant(&self) -> Option<DateTime<Utc>> {
        DateTime::parse_from_rfc3339(&self.trigger_at_utc)
            .ok()
            .map(|dt| dt.with_timezone(&Utc))
    }
}
