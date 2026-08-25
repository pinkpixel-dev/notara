import { describe, expect, it } from 'vitest';
import type { Note, TodoList } from '@/types';
import type { UpdateCalendarEntryProposal, UpdateTodoListProposal } from '../proposals';
import { assertCalendarPosition, assertTodoTargets } from '../proposal-safety';

const note: Note = {
  id: 'event.md',
  path: 'event.md',
  revision: null,
  title: 'Event',
  content: '',
  createdAt: new Date(2026, 7, 25, 14, 30).toISOString(),
  updatedAt: new Date(2026, 7, 25, 14, 30).toISOString(),
  tags: [],
  isPinned: false,
  isStarred: false,
};

const move: UpdateCalendarEntryProposal = {
  kind: 'update_calendar_entry',
  path: 'event.md',
  fromDate: '2026-08-25',
  fromTime: '14:30',
  date: '2026-08-26',
  time: '10:00',
};

describe('proposal preflight checks', () => {
  it('accepts an unchanged calendar position and rejects a stale one', () => {
    expect(() => assertCalendarPosition(note, move)).not.toThrow();
    expect(() =>
      assertCalendarPosition(note, { ...move, fromTime: '14:31' })
    ).toThrow('moved after');
  });

  it('rejects a to-do selector that became missing or ambiguous', () => {
    const proposal: UpdateTodoListProposal = {
      kind: 'update_todo_list',
      listId: 'l',
      listTitle: 'Today',
      setChecked: [{ content: 'Call', checked: true }],
    };
    const list = (items: TodoList['items']): TodoList => ({
      id: 'l', title: 'Today', date: '2026-08-25', time: '12:00', items,
    });

    expect(() => assertTodoTargets(list([]), proposal)).toThrow('no longer has');
    expect(() =>
      assertTodoTargets(
        list([
          { id: 'a', content: 'Call', checked: false, time: '12:00' },
          { id: 'b', content: 'Call', checked: false, time: '13:00' },
        ]),
        proposal
      )
    ).toThrow('more than one');
  });
});
