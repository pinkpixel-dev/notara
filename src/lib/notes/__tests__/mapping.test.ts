import { describe, expect, it } from 'vitest';
import type { Note, NoteTag } from '@/types';
import { noteFromFile, noteToFileContents, resolveTags } from '../mapping';

const knownTags: NoteTag[] = [
  { id: 'tag-personal', name: 'Personal', color: '#9b87f5' },
  { id: 'tag-ideas', name: 'Ideas', color: '#10B981' },
];

/** A revision for 2026-05-29T23:33:00.000Z, in the shape the store produces. */
const revisionAt = (iso: string, size = 42): string =>
  `${new Date(iso).getTime() * 1_000_000}-${size}`;

describe('resolveTags', () => {
  it('matches an existing tag regardless of case', () => {
    const { tags, created } = resolveTags(['personal'], knownTags);

    expect(tags).toEqual([knownTags[0]]);
    expect(created).toEqual([]);
  });

  it('creates a tag the workspace has not seen before', () => {
    const { tags, created } = resolveTags(['Recipes'], knownTags);

    expect(tags[0].name).toBe('Recipes');
    expect(created).toHaveLength(1);
    expect(created[0]).toBe(tags[0]);
  });

  it('creates one tag when a name repeats in the same file', () => {
    const { tags, created } = resolveTags(['Recipes', 'recipes'], knownTags);

    expect(created).toHaveLength(1);
    expect(tags[0]).toBe(tags[1]);
  });

  it('ignores blank names', () => {
    const { tags, created } = resolveTags(['', '   '], knownTags);

    expect(tags).toEqual([]);
    expect(created).toEqual([]);
  });
});

describe('noteFromFile', () => {
  it('takes the title from the file name and the identity from the path', () => {
    const { note } = noteFromFile({
      path: 'Guides/About Notara.md',
      contents: '# Hello\n',
      revision: null,
      knownTags,
    });

    expect(note.title).toBe('About Notara');
    expect(note.path).toBe('Guides/About Notara.md');
    expect(note.id).toBe(note.path);
  });

  it('reads flags, tags, and dates out of the frontmatter', () => {
    const { note } = noteFromFile({
      path: 'Note.md',
      contents: [
        '---',
        'tags: [Ideas, Recipes]',
        'pinned: true',
        'starred: true',
        'created: 2026-05-29T23:33:00.000Z',
        'updated: 2026-08-23T14:02:00.000Z',
        '---',
        '',
        'Body text.',
        '',
      ].join('\n'),
      revision: null,
      knownTags,
    });

    expect(note.isPinned).toBe(true);
    expect(note.isStarred).toBe(true);
    expect(note.tags.map((tag) => tag.name)).toEqual(['Ideas', 'Recipes']);
    expect(note.createdAt).toBe('2026-05-29T23:33:00.000Z');
    expect(note.updatedAt).toBe('2026-08-23T14:02:00.000Z');
    expect(note.content).toBe('\nBody text.\n');
  });

  it('dates a plain Markdown file from its revision rather than from now', () => {
    const { note } = noteFromFile({
      path: 'Plain.md',
      contents: '# No frontmatter\n',
      revision: revisionAt('2026-05-29T23:33:00.000Z'),
      knownTags,
    });

    expect(note.updatedAt).toBe('2026-05-29T23:33:00.000Z');
    expect(note.createdAt).toBe('2026-05-29T23:33:00.000Z');
  });

  it('reports the tags a file introduced', () => {
    const { createdTags } = noteFromFile({
      path: 'Note.md',
      contents: '---\ntags: [Ideas, Crochet]\n---\nBody\n',
      revision: null,
      knownTags,
    });

    expect(createdTags.map((tag) => tag.name)).toEqual(['Crochet']);
  });

  it('falls back to now when there is neither frontmatter nor a revision', () => {
    const before = Date.now();
    const { note } = noteFromFile({
      path: 'Plain.md',
      contents: 'Body\n',
      revision: null,
      knownTags,
    });

    expect(new Date(note.updatedAt).getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('noteToFileContents', () => {
  const note: Note = {
    id: 'Guides/About.md',
    path: 'Guides/About.md',
    revision: null,
    title: 'About',
    content: '\n# About\n',
    createdAt: '2026-05-29T23:33:00.000Z',
    updatedAt: '2026-08-23T14:02:00.000Z',
    tags: [knownTags[1]],
    isPinned: true,
    isStarred: false,
  };

  it('writes the metadata Notara owns', () => {
    const written = noteToFileContents(note, '');

    expect(written).toContain('tags: [Ideas]');
    expect(written).toContain('pinned: true');
    expect(written).toContain('created: 2026-05-29T23:33:00.000Z');
    expect(written).not.toContain('starred');
    expect(written).toContain('# About');
  });

  it('leaves frontmatter written by other tools alone', () => {
    const existing = ['---', 'cssclass: wide', 'aliases:', '  - old name', '---', 'old body', ''].join(
      '\n'
    );
    const written = noteToFileContents(note, existing);

    expect(written).toContain('cssclass: wide');
    expect(written).toContain('aliases:\n  - old name');
    expect(written).not.toContain('old body');
  });

  it('round trips through the file and back to the same note', () => {
    const written = noteToFileContents(note, '');
    const { note: reloaded } = noteFromFile({
      path: note.path,
      contents: written,
      revision: null,
      knownTags,
    });

    expect(reloaded).toEqual({ ...note, revision: null });
  });
});
