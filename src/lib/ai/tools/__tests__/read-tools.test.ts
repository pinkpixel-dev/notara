import { describe, expect, it } from 'vitest';
import type { Note, TodoList } from '@/types';
import { MAX_NOTE_CHARACTERS, MAX_TOOL_RESULTS } from '../definitions';
import {
  clampLimit,
  listCalendarEntries,
  listNotes,
  listTodos,
  readNote,
  readFocusedNote,
  searchNotes,
} from '../read-tools';

const note = (overrides: Partial<Note>): Note => ({
  id: overrides.path ?? 'a.md',
  path: overrides.path ?? 'a.md',
  revision: null,
  title: 'A note',
  content: '',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  tags: [],
  isPinned: false,
  isStarred: false,
  ...overrides,
});

describe('clampLimit', () => {
  it('defaults to the cap and never exceeds it', () => {
    expect(clampLimit(undefined)).toBe(MAX_TOOL_RESULTS);
    expect(clampLimit(1000)).toBe(MAX_TOOL_RESULTS);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(5)).toBe(5);
    expect(clampLimit('lots')).toBe(MAX_TOOL_RESULTS);
  });
});

describe('searchNotes', () => {
  const notes = [
    note({ path: 'rent.md', title: 'Rent', content: 'due on the first\nnothing else' }),
    note({ path: 'food.md', title: 'Food', content: 'pay the rent before shopping' }),
    note({ path: 'other.md', title: 'Other', content: 'nothing relevant' }),
  ];

  it('matches the title and the body, ignoring case', () => {
    const matches = searchNotes(notes, 'RENT', 10);

    expect(matches.map((match) => match.path)).toEqual(['rent.md', 'food.md']);
    expect(matches[0].titleMatched).toBe(true);
    expect(matches[1].lines).toEqual(['pay the rent before shopping']);
  });

  it('returns nothing for an empty query', () => {
    expect(searchNotes(notes, '   ', 10)).toEqual([]);
  });

  it('respects the limit', () => {
    expect(searchNotes(notes, 'rent', 1)).toHaveLength(1);
  });

  it('keeps at most five matching lines from one note', () => {
    const busy = note({ path: 'busy.md', content: Array(20).fill('rent').join('\n') });

    expect(searchNotes([busy], 'rent', 10)[0].lines).toHaveLength(5);
  });

  it('shortens a very long matching line', () => {
    const long = note({ path: 'long.md', content: `rent ${'x'.repeat(500)}` });

    const line = searchNotes([long], 'rent', 10)[0].lines[0];

    expect(line.length).toBeLessThan(300);
    expect(line.endsWith('...')).toBe(true);
  });
});

describe('listNotes', () => {
  const notes = [
    note({ path: 'Ideas/one.md', updatedAt: '2026-08-01T00:00:00.000Z' }),
    note({ path: 'Ideas/deep/two.md', updatedAt: '2026-08-03T00:00:00.000Z' }),
    note({ path: 'loose.md', updatedAt: '2026-08-02T00:00:00.000Z' }),
  ];

  it('lists everything newest first', () => {
    expect(listNotes(notes, null, 10).map((entry) => entry.path)).toEqual([
      'Ideas/deep/two.md',
      'loose.md',
      'Ideas/one.md',
    ]);
  });

  it('lists one folder and the folders under it', () => {
    expect(listNotes(notes, 'Ideas', 10).map((entry) => entry.path)).toEqual([
      'Ideas/deep/two.md',
      'Ideas/one.md',
    ]);
  });

  it('reports the folder a note is in', () => {
    const listed = listNotes(notes, null, 10);

    expect(listed.find((entry) => entry.path === 'loose.md')?.folder).toBe('');
    expect(listed.find((entry) => entry.path === 'Ideas/one.md')?.folder).toBe('Ideas');
  });
});

describe('readNote', () => {
  it('returns the note with its path', () => {
    const result = readNote(note({ path: 'a.md', title: 'A', content: 'body' }));

    expect(result).toEqual({ path: 'a.md', title: 'A', content: 'body', truncated: false });
  });

  it('truncates a note that is too long and says so', () => {
    const result = readNote(note({ content: 'x'.repeat(MAX_NOTE_CHARACTERS + 100) }));

    expect(result.content).toHaveLength(MAX_NOTE_CHARACTERS);
    expect(result.truncated).toBe(true);
  });

  it('reads unsaved text from the visible editor draft', () => {
    expect(
      readFocusedNote({
        kind: 'note',
        path: 'a.md',
        title: 'A',
        content: 'live text',
        isDirty: true,
        isNew: false,
        directory: '',
      })
    ).toMatchObject({ content: 'live text', unsavedChanges: true, isNew: false });
  });
});

describe('listTodos', () => {
  const lists: TodoList[] = [
    {
      id: '1',
      title: 'Today',
      date: '2026-08-25',
      time: '09:00',
      items: [
        { id: 'a', content: 'done thing', checked: true, time: '09:00' },
        { id: 'b', content: 'open thing', checked: false, time: '10:00' },
      ],
    },
  ];

  it('includes checked items by default', () => {
    expect(listTodos(lists, true)[0].items).toHaveLength(2);
  });

  it('leaves checked items out when asked', () => {
    const items = listTodos(lists, false)[0].items;

    expect(items).toEqual([{ content: 'open thing', checked: false }]);
  });
});

describe('listCalendarEntries', () => {
  const notes = [
    note({ path: 'past.md', createdAt: '2026-08-01T09:00:00.000Z' }),
    note({ path: 'soon.md', createdAt: '2026-08-26T14:30:00.000Z' }),
    note({ path: 'later.md', createdAt: '2026-10-20T09:00:00.000Z' }),
  ];

  const today = new Date('2026-08-25T12:00:00.000Z');

  it('defaults to the next thirty days', () => {
    const entries = listCalendarEntries(notes, undefined, undefined, today);

    expect(entries.map((entry) => entry.path)).toEqual(['soon.md']);
  });

  it('takes an explicit range', () => {
    const entries = listCalendarEntries(notes, '2026-07-01', '2026-08-02', today);

    expect(entries.map((entry) => entry.path)).toEqual(['past.md']);
  });

  it('reports a date and a time for each entry', () => {
    const entry = listCalendarEntries(notes, '2026-08-26', '2026-08-26', today)[0];

    expect(entry.date).toBe('2026-08-26');
    expect(entry.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('ignores an unreadable date range and falls back to today', () => {
    const entries = listCalendarEntries(notes, 'not-a-date', undefined, today);

    expect(entries.map((entry) => entry.path)).toEqual(['soon.md']);
  });
});
