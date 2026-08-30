import { describe, it, expect } from 'vitest';
import { buildSyncReminderItems } from '../client';
import type { TodoList } from '@/types';

describe('buildSyncReminderItems', () => {
  it('correctly maps top-level items into sync payload with list dates and task times', () => {
    const lists: TodoList[] = [
      {
        id: 'list-1',
        title: 'Project Launch',
        date: '2026-09-01',
        time: '09:00',
        items: [
          {
            id: 'task-1',
            content: 'Review staging build',
            checked: false,
            time: '14:30',
            reminderEnabled: true,
          },
          {
            id: 'task-2',
            content: 'Ship release',
            checked: true,
            time: '17:00',
            reminderEnabled: false,
          },
        ],
      },
      {
        id: 'list-2',
        title: 'Groceries',
        date: '2026-09-02',
        time: '12:00',
        items: [
          {
            id: 'task-3',
            content: 'Buy coffee beans',
            checked: false,
            time: '',
          },
        ],
      },
    ];

    const result = buildSyncReminderItems(lists);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      listId: 'list-1',
      listTitle: 'Project Launch',
      listDate: '2026-09-01',
      taskId: 'task-1',
      taskTitle: 'Review staging build',
      taskTime: '14:30',
      checked: false,
      reminderEnabled: true,
    });

    expect(result[1]).toEqual({
      listId: 'list-1',
      listTitle: 'Project Launch',
      listDate: '2026-09-01',
      taskId: 'task-2',
      taskTitle: 'Ship release',
      taskTime: '17:00',
      checked: true,
      reminderEnabled: false,
    });

    expect(result[2]).toEqual({
      listId: 'list-2',
      listTitle: 'Groceries',
      listDate: '2026-09-02',
      taskId: 'task-3',
      taskTitle: 'Buy coffee beans',
      taskTime: '12:00',
      checked: false,
      reminderEnabled: false,
    });
  });

  it('handles empty lists gracefully', () => {
    expect(buildSyncReminderItems([])).toEqual([]);
  });
});
