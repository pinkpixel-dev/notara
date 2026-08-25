import { describe, expect, it } from 'vitest';
import type { Proposal } from '../proposals';
import { isCalendarDate, isProposal } from '../proposal-validation';

const valid: Proposal[] = [
  { kind: 'edit_note', path: 'a.md', before: '', after: 'x' },
  { kind: 'create_note', path: 'a.md', title: 'A', folder: '', content: '' },
  { kind: 'delete_note', path: 'a.md' },
  { kind: 'create_todo_list', title: 'A', date: '2026-08-25', time: '12:00', items: [] },
  { kind: 'update_todo_list', listId: 'l', listTitle: 'A', title: 'B' },
  { kind: 'delete_todo_list', listId: 'l', listTitle: 'A' },
  {
    kind: 'restore_todo_list',
    listId: 'l',
    listTitle: 'A',
    snapshot: { title: 'A', date: '2026-08-25', time: '12:00', items: [] },
  },
  {
    kind: 'create_calendar_entry',
    path: 'Event.md',
    title: 'Event',
    date: '2026-08-25',
    time: '12:00',
    content: '',
    folder: '',
  },
  {
    kind: 'update_calendar_entry',
    path: 'Event.md',
    fromDate: '2026-08-25',
    fromTime: '12:00',
    date: '2026-08-26',
    time: '13:00',
  },
  {
    kind: 'place_board_image',
    boardId: 'b',
    boardName: 'B',
    prompt: 'cat',
    model: 'gpt-image-2',
    size: '1024x1024',
  },
  { kind: 'remove_board_item', boardId: 'b', boardName: 'B', itemId: 'i' },
];

describe('proposal validation', () => {
  it('accepts every complete proposal kind', () => {
    expect(valid.every(isProposal)).toBe(true);
  });

  it('rejects unknown or incomplete proposals', () => {
    expect(isProposal({ kind: 'anything', path: 'a.md' })).toBe(false);
    expect(isProposal({ kind: 'edit_note', path: '', before: '', after: 'x' })).toBe(false);
    expect(isProposal({ kind: 'create_note', title: 'A', folder: '', content: '' })).toBe(false);
  });

  it('rejects invalid nested items and dates', () => {
    expect(
      isProposal({
        kind: 'create_todo_list',
        title: 'A',
        date: '2026-02-30',
        time: '12:00',
        items: [],
      })
    ).toBe(false);
    expect(isCalendarDate('2028-02-29')).toBe(true);
    expect(isCalendarDate('2026-02-29')).toBe(false);
  });
});
