import { invoke } from '@tauri-apps/api/core';
import { fileSystemHelpers } from '@/lib/filesystem';
import type { TaskReminderRecord, TodoList } from '@/types';

export interface SyncReminderPayloadItem {
  listId: string;
  listTitle: string;
  listDate: string;
  taskId: string;
  taskTitle: string;
  taskTime: string;
  checked: boolean;
  reminderEnabled: boolean;
}

export const isDesktopRemindersSupported = (): boolean => {
  return fileSystemHelpers.isTauriEnvironment();
};

export const buildSyncReminderItems = (lists: TodoList[]): SyncReminderPayloadItem[] => {
  const items: SyncReminderPayloadItem[] = [];

  for (const list of lists) {
    for (const item of list.items || []) {
      items.push({
        listId: list.id,
        listTitle: list.title || 'Untitled List',
        listDate: list.date,
        taskId: item.id,
        taskTitle: item.content || 'Untitled Task',
        taskTime: item.time || '12:00',
        checked: Boolean(item.checked),
        reminderEnabled: Boolean(item.reminderEnabled),
      });
    }
  }

  return items;
};

export const syncTodoReminders = async (
  lists: TodoList[]
): Promise<TaskReminderRecord[]> => {
  if (!isDesktopRemindersSupported()) {
    return [];
  }

  try {
    const items = buildSyncReminderItems(lists);
    return await invoke<TaskReminderRecord[]>('sync_todo_reminders', { items });
  } catch (error) {
    console.error('Failed to sync todo reminders with desktop runtime', error);
    return [];
  }
};

export const dismissReminder = async (reminderId: string): Promise<boolean> => {
  if (!isDesktopRemindersSupported()) {
    return false;
  }

  try {
    await invoke('dismiss_reminder', { reminderId });
    return true;
  } catch (error) {
    console.error('Failed to dismiss reminder', error);
    return false;
  }
};

export const getReminderRecords = async (): Promise<TaskReminderRecord[]> => {
  if (!isDesktopRemindersSupported()) {
    return [];
  }

  try {
    return await invoke<TaskReminderRecord[]>('get_reminder_records');
  } catch (error) {
    console.error('Failed to retrieve reminder records', error);
    return [];
  }
};
