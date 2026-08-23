import { describe, expect, it } from 'vitest';
import { applyNoteMetadata, buildNoteFile, parseNote, type NoteMetadata } from '../note-frontmatter';

const metadata = (overrides: Partial<NoteMetadata> = {}): NoteMetadata => ({
  tags: [],
  pinned: false,
  starred: false,
  created: null,
  updated: null,
  ...overrides,
});

describe('parseNote', () => {
  it('treats a plain Markdown file as a valid note with no metadata', () => {
    const parsed = parseNote('# Just a note\n\nNo frontmatter here.\n');

    expect(parsed.metadata).toEqual(metadata());
    expect(parsed.body).toBe('# Just a note\n\nNo frontmatter here.\n');
  });

  it('reads the keys Notara owns', () => {
    const parsed = parseNote(
      [
        '---',
        'tags: [Docs, "Pink Pixel"]',
        'pinned: true',
        'starred: yes',
        'created: 2026-05-29T23:33:00.000Z',
        'updated: 2026-08-23T14:02:00.000Z',
        '---',
        '',
        '# About Notara',
        '',
      ].join('\n')
    );

    expect(parsed.metadata.tags).toEqual(['Docs', 'Pink Pixel']);
    expect(parsed.metadata.pinned).toBe(true);
    expect(parsed.metadata.starred).toBe(true);
    expect(parsed.metadata.created).toBe('2026-05-29T23:33:00.000Z');
    expect(parsed.body).toBe('\n# About Notara\n');
  });

  it('accepts the key names the old Markdown mirror wrote', () => {
    const parsed = parseNote(
      ['---', 'isPinned: true', 'createdAt: 2026-01-02T03:04:05.000Z', '---', 'Body', ''].join('\n')
    );

    expect(parsed.metadata.pinned).toBe(true);
    expect(parsed.metadata.created).toBe('2026-01-02T03:04:05.000Z');
  });

  it('reports an unparseable timestamp as absent rather than an invalid date', () => {
    const parsed = parseNote(['---', 'updated: last thursday', '---', 'Body', ''].join('\n'));

    expect(parsed.metadata.updated).toBeNull();
  });

  it('treats a missing or non-boolean flag as false', () => {
    const parsed = parseNote(['---', 'pinned: maybe', '---', 'Body', ''].join('\n'));

    expect(parsed.metadata.pinned).toBe(false);
    expect(parsed.metadata.starred).toBe(false);
  });
});

describe('applyNoteMetadata', () => {
  it('leaves frontmatter Notara does not own byte for byte', () => {
    const original = [
      '---',
      '# a comment the user wrote',
      'aliases:',
      '  - old name',
      '  - older name',
      'cssclass: wide',
      'pinned: true',
      '---',
      '',
      'Body text.',
      '',
    ].join('\n');

    const parsed = parseNote(original);
    const written = applyNoteMetadata(parsed, { ...parsed.metadata, pinned: false }, parsed.body);

    expect(written).toContain('# a comment the user wrote');
    expect(written).toContain('aliases:\n  - old name\n  - older name');
    expect(written).toContain('cssclass: wide');
    expect(written).not.toContain('pinned:');
  });

  it('round trips an untouched document to the same bytes', () => {
    const original = [
      '---',
      'tags: [Docs]',
      'pinned: true',
      'created: 2026-05-29T23:33:00.000Z',
      'updated: 2026-08-23T14:02:00.000Z',
      '---',
      '',
      '# Title',
      '',
    ].join('\n');

    const parsed = parseNote(original);

    expect(applyNoteMetadata(parsed, parsed.metadata, parsed.body)).toBe(original);
  });

  it('keeps a rewritten key in its original position', () => {
    const parsed = parseNote(
      ['---', 'tags: [One]', 'cssclass: wide', 'pinned: true', '---', 'Body', ''].join('\n')
    );
    const written = applyNoteMetadata(parsed, { ...parsed.metadata, tags: ['Two'] }, parsed.body);

    expect(written).toBe(
      ['---', 'tags: [Two]', 'cssclass: wide', 'pinned: true', '---', 'Body', ''].join('\n')
    );
  });

  it('clears an old key spelling so it cannot win the next read', () => {
    const parsed = parseNote(['---', 'isPinned: true', '---', 'Body', ''].join('\n'));
    const written = applyNoteMetadata(parsed, { ...parsed.metadata, pinned: false }, parsed.body);

    expect(written).not.toContain('isPinned');
    expect(parseNote(written).metadata.pinned).toBe(false);
  });

  it('opens a frontmatter block on a file that had none', () => {
    const parsed = parseNote('Body only.\n');
    const written = applyNoteMetadata(parsed, metadata({ tags: ['Ideas'] }), parsed.body);

    expect(written).toBe('---\ntags: [Ideas]\n---\nBody only.\n');
  });

  it('writes no block at all when there is nothing worth recording', () => {
    expect(buildNoteFile(metadata(), '# Empty\n')).toBe('# Empty\n');
  });

  it('omits false flags and empty tag lists', () => {
    const written = buildNoteFile(
      metadata({ created: '2026-08-23T14:02:00.000Z', updated: '2026-08-23T14:02:00.000Z' }),
      'Body\n'
    );

    expect(written).not.toContain('pinned');
    expect(written).not.toContain('starred');
    expect(written).not.toContain('tags');
    expect(written).toContain('created: 2026-08-23T14:02:00.000Z');
  });

  it('quotes a tag containing a comma so it survives the next read', () => {
    const written = buildNoteFile(metadata({ tags: ['one, two', 'three'] }), 'Body\n');

    expect(parseNote(written).metadata.tags).toEqual(['one, two', 'three']);
  });

  it('preserves CRLF line endings', () => {
    const parsed = parseNote('---\r\ntags: [One]\r\n---\r\nBody\r\n');
    const written = applyNoteMetadata(parsed, { ...parsed.metadata, pinned: true }, parsed.body);

    expect(written).toContain('pinned: true\r\n');
  });
});
