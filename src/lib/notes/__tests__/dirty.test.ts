import { describe, expect, it } from 'vitest';
import { isNewNoteDirty, isNoteDirty, sameTags } from '../dirty';
import type { Note, NoteTag } from '@/types';

const tag = (id: string, name = id): NoteTag => ({ id, name, color: '#888888' });

const noteWith = (overrides: Partial<Note> = {}): Note => ({
  id: 'Notes/Example.md',
  path: 'Notes/Example.md',
  revision: '1-100',
  title: 'Example',
  content: 'Body text',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
  tags: [],
  isPinned: false,
  isStarred: false,
  ...overrides,
});

describe('sameTags', () => {
  it('treats an identical selection as unchanged', () => {
    expect(sameTags([tag('a'), tag('b')], [tag('a'), tag('b')])).toBe(true);
  });

  it('ignores order', () => {
    expect(sameTags([tag('a'), tag('b')], [tag('b'), tag('a')])).toBe(true);
  });

  it('notices an added tag', () => {
    expect(sameTags([tag('a')], [tag('a'), tag('b')])).toBe(false);
  });

  it('notices a removed tag', () => {
    expect(sameTags([tag('a'), tag('b')], [tag('a')])).toBe(false);
  });

  it('notices a swap that keeps the count', () => {
    expect(sameTags([tag('a'), tag('b')], [tag('a'), tag('c')])).toBe(false);
  });

  it('compares by id rather than by name', () => {
    // A tag rename is not an edit to this note's selection.
    expect(sameTags([tag('a', 'Work')], [tag('a', 'Renamed')])).toBe(true);
  });

  it('treats two empty selections as unchanged', () => {
    expect(sameTags([], [])).toBe(true);
  });
});

describe('isNewNoteDirty', () => {
  it('is clean when nothing has been typed', () => {
    expect(isNewNoteDirty({ title: '', content: '' })).toBe(false);
  });

  it('is clean for whitespace alone', () => {
    // Warning about a stray space trains people to dismiss the prompt.
    expect(isNewNoteDirty({ title: '   ', content: '\n\t ' })).toBe(false);
  });

  it('is dirty once a title is typed', () => {
    expect(isNewNoteDirty({ title: 'Draft', content: '' })).toBe(true);
  });

  it('is dirty once content is typed', () => {
    expect(isNewNoteDirty({ title: '', content: 'a thought' })).toBe(true);
  });
});

describe('isNoteDirty', () => {
  const note = noteWith({ tags: [tag('a')] });
  const clean = { title: note.title, content: note.content, tags: note.tags };

  it('is clean when the buffer matches the note', () => {
    expect(isNoteDirty(clean, note)).toBe(false);
  });

  it('notices an edited title', () => {
    expect(isNoteDirty({ ...clean, title: 'Renamed' }, note)).toBe(true);
  });

  it('notices edited content', () => {
    expect(isNoteDirty({ ...clean, content: 'Body text changed' }, note)).toBe(true);
  });

  it('notices a changed tag selection', () => {
    expect(isNoteDirty({ ...clean, tags: [tag('a'), tag('b')] }, note)).toBe(true);
  });

  it('ignores reordered tags', () => {
    const twoTags = noteWith({ tags: [tag('a'), tag('b')] });
    expect(
      isNoteDirty({ title: twoTags.title, content: twoTags.content, tags: [tag('b'), tag('a')] }, twoTags)
    ).toBe(false);
  });

  it('treats trailing whitespace in content as an edit', () => {
    // Unlike a brand new note, an existing one has a saved version to compare
    // against, so a real character the user added counts.
    expect(isNoteDirty({ ...clean, content: `${note.content} ` }, note)).toBe(true);
  });

  it('ignores pin and star, which write immediately', () => {
    const pinned = noteWith({ tags: [tag('a')], isPinned: true, isStarred: true });
    expect(isNoteDirty(clean, pinned)).toBe(false);
  });

  it('is clean when there is no note to compare against', () => {
    expect(isNoteDirty(clean, undefined)).toBe(false);
  });
});
