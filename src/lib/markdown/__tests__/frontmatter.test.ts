import { describe, expect, it } from 'vitest';
import {
  findEntry,
  parseDocument,
  removeEntry,
  serializeDocument,
  setEntry,
} from '../frontmatter';
import { readScalar, readStringList, writeScalar, writeStringList } from '../values';

/** The round trip guarantee: parsing then serializing returns the same bytes. */
const expectRoundTrip = (raw: string) => {
  expect(serializeDocument(parseDocument(raw))).toBe(raw);
};

describe('parseDocument', () => {
  it('treats a document with no block as all body', () => {
    const raw = '# Just a heading\n\nSome text.\n';
    const document = parseDocument(raw);

    expect(document.hasFrontmatter).toBe(false);
    expect(document.body).toBe(raw);
    expectRoundTrip(raw);
  });

  it('separates a block from the body', () => {
    const raw = '---\ntitle: Hello\n---\n# Body\n';
    const document = parseDocument(raw);

    expect(document.hasFrontmatter).toBe(true);
    expect(document.entries.map((entry) => entry.key)).toEqual(['title']);
    expect(document.body).toBe('# Body\n');
  });

  it('does not treat an unterminated block as frontmatter', () => {
    // Guessing where an unclosed block ends could swallow real content.
    const raw = '---\ntitle: Hello\n\n# Body with no closing delimiter\n';
    const document = parseDocument(raw);

    expect(document.hasFrontmatter).toBe(false);
    expect(document.body).toBe(raw);
    expectRoundTrip(raw);
  });

  it('keeps indented continuation lines with their key', () => {
    const raw = '---\nnested:\n  alpha: 1\n  beta: 2\ntitle: Hello\n---\nBody\n';
    const document = parseDocument(raw);

    expect(document.entries.map((entry) => entry.key)).toEqual(['nested', 'title']);
    expect(findEntry(document, 'nested')?.lines).toHaveLength(3);
    expectRoundTrip(raw);
  });

  it('keeps block sequence items with their key', () => {
    const raw = '---\ntags:\n  - one\n  - two\n---\nBody\n';
    const document = parseDocument(raw);

    expect(document.entries.map((entry) => entry.key)).toEqual(['tags']);
    expect(readStringList(findEntry(document, 'tags'))).toEqual(['one', 'two']);
    expectRoundTrip(raw);
  });

  it('keeps a block scalar with its key', () => {
    const raw = '---\ndescription: |\n  line one\n  line two\ntitle: Hello\n---\nBody\n';
    const document = parseDocument(raw);

    expect(document.entries.map((entry) => entry.key)).toEqual(['description', 'title']);
    expectRoundTrip(raw);
  });

  it('preserves comments and blank lines inside the block', () => {
    const raw = '---\n# a leading comment\n\ntitle: Hello\n\n# trailing note\n---\nBody\n';
    expectRoundTrip(raw);
  });

  it('preserves CRLF documents exactly', () => {
    const raw = '---\r\ntitle: Hello\r\ntags: [a, b]\r\n---\r\n# Body\r\n';
    expectRoundTrip(raw);
  });

  it('preserves a byte order mark', () => {
    const raw = '﻿---\ntitle: Hello\n---\nBody\n';
    const document = parseDocument(raw);

    expect(document.hasFrontmatter).toBe(true);
    expectRoundTrip(raw);
  });

  it('handles an empty document', () => {
    expectRoundTrip('');
  });
});

describe('setEntry', () => {
  it('leaves unrelated keys byte-identical', () => {
    // This is the stage 2 acceptance criterion.
    const raw = [
      '---',
      "publish:   'yes'   # deploy flag",
      'aliases:',
      '  - /old/path',
      '  - /older/path',
      'weird_KEY.name: {inline: map}',
      'title: Old Title',
      'description: |',
      '  a block scalar',
      '  that spans lines',
      '---',
      '# Body stays put',
      '',
    ].join('\n');

    const updated = serializeDocument(setEntry(parseDocument(raw), 'title', 'New Title'));

    expect(updated).toContain("publish:   'yes'   # deploy flag");
    expect(updated).toContain('  - /old/path');
    expect(updated).toContain('weird_KEY.name: {inline: map}');
    expect(updated).toContain('description: |\n  a block scalar\n  that spans lines');
    expect(updated).toContain('title: New Title');
    expect(updated).not.toContain('title: Old Title');
    expect(updated).toContain('# Body stays put');
  });

  it('keeps a replaced key in its original position', () => {
    const raw = '---\nalpha: 1\ntitle: Old\nomega: 2\n---\nBody\n';
    const updated = serializeDocument(setEntry(parseDocument(raw), 'title', 'New'));

    expect(updated).toBe('---\nalpha: 1\ntitle: New\nomega: 2\n---\nBody\n');
  });

  it('appends a key that was not present', () => {
    const raw = '---\nalpha: 1\n---\nBody\n';
    const updated = serializeDocument(setEntry(parseDocument(raw), 'id', 'abc'));

    expect(updated).toBe('---\nalpha: 1\nid: abc\n---\nBody\n');
  });

  it('opens a block on a document that had none', () => {
    const raw = '# Just a heading\n';
    const updated = serializeDocument(setEntry(parseDocument(raw), 'id', 'abc'));

    expect(updated).toBe('---\nid: abc\n---\n# Just a heading\n');
  });

  it('collapses a multi-line value it takes ownership of', () => {
    const raw = '---\ntags:\n  - one\n  - two\n---\nBody\n';
    const updated = serializeDocument(setEntry(parseDocument(raw), 'tags', '[three]'));

    expect(updated).toBe('---\ntags: [three]\n---\nBody\n');
  });

  it('writes CRLF line endings into a CRLF document', () => {
    const raw = '---\r\nalpha: 1\r\n---\r\nBody\r\n';
    const updated = serializeDocument(setEntry(parseDocument(raw), 'id', 'abc'));

    expect(updated).toBe('---\r\nalpha: 1\r\nid: abc\r\n---\r\nBody\r\n');
  });
});

describe('removeEntry', () => {
  it('drops a key and its continuation lines', () => {
    const raw = '---\nalpha: 1\ntags:\n  - one\n  - two\nomega: 2\n---\nBody\n';
    const updated = serializeDocument(removeEntry(parseDocument(raw), 'tags'));

    expect(updated).toBe('---\nalpha: 1\nomega: 2\n---\nBody\n');
  });
});

describe('readScalar', () => {
  const scalarOf = (line: string) => readScalar(findEntry(parseDocument(`---\n${line}\n---\n`), line.split(':')[0]));

  it('reads a bare value', () => {
    expect(scalarOf('title: Hello there')).toBe('Hello there');
  });

  it('reads a double quoted value and unescapes it', () => {
    expect(scalarOf('title: "A \\"quoted\\" title"')).toBe('A "quoted" title');
  });

  it('reads a single quoted value', () => {
    expect(scalarOf("title: 'it''s fine'")).toBe("it's fine");
  });

  it('strips a trailing comment from a bare value', () => {
    expect(scalarOf('title: Hello # a note')).toBe('Hello');
  });

  it('keeps a hash inside a quoted value', () => {
    expect(scalarOf('title: "Hello # not a comment"')).toBe('Hello # not a comment');
  });

  it('returns null for an empty value', () => {
    expect(scalarOf('title:')).toBeNull();
  });

  it('returns null for a block scalar rather than guessing', () => {
    const document = parseDocument('---\ntitle: |\n  multi\n  line\n---\n');
    expect(readScalar(findEntry(document, 'title'))).toBeNull();
  });

  it('returns null for a missing key', () => {
    expect(readScalar(undefined)).toBeNull();
  });
});

describe('readStringList', () => {
  const listOf = (raw: string, key: string) => readStringList(findEntry(parseDocument(raw), key));

  it('reads a flow sequence', () => {
    expect(listOf('---\ntags: [one, two, three]\n---\n', 'tags')).toEqual(['one', 'two', 'three']);
  });

  it('reads a quoted flow sequence with commas inside values', () => {
    expect(listOf('---\ntags: ["one, two", three]\n---\n', 'tags')).toEqual(['one, two', 'three']);
  });

  it('reads an empty flow sequence', () => {
    expect(listOf('---\ntags: []\n---\n', 'tags')).toEqual([]);
  });

  it('reads a block sequence', () => {
    expect(listOf('---\ntags:\n  - one\n  - two\n---\n', 'tags')).toEqual(['one', 'two']);
  });

  it('reads a single bare value as a one item list', () => {
    expect(listOf('---\ntags: one\n---\n', 'tags')).toEqual(['one']);
  });

  it('returns an empty list for a missing key', () => {
    expect(readStringList(undefined)).toEqual([]);
  });
});

describe('writeScalar', () => {
  it('leaves an ordinary string bare', () => {
    expect(writeScalar('Hello there')).toBe('Hello there');
  });

  it('quotes values YAML would read as another type', () => {
    expect(writeScalar('true')).toBe('"true"');
    expect(writeScalar('42')).toBe('"42"');
    expect(writeScalar('null')).toBe('"null"');
    expect(writeScalar('3.14')).toBe('"3.14"');
  });

  it('quotes an empty string', () => {
    expect(writeScalar('')).toBe('""');
  });

  it('quotes values with structural characters', () => {
    expect(writeScalar('- leading dash')).toBe('"- leading dash"');
    expect(writeScalar('key: value')).toBe('"key: value"');
    expect(writeScalar('trailing ')).toBe('"trailing "');
  });

  it('escapes quotes and backslashes', () => {
    expect(writeScalar('say "hi"')).toBe('"say \\"hi\\""');
    expect(writeScalar('back\\slash')).toBe('"back\\\\slash"');
  });

  it('round trips through readScalar', () => {
    // An explicitly quoted empty string survives as one. Only a key written
    // with no value at all reads back as null.
    const values = ['Hello', 'true', '42', 'say "hi"', 'key: value', '', '- dash', "it's"];
    for (const value of values) {
      const document = parseDocument(`---\ntitle: ${writeScalar(value)}\n---\n`);
      expect(readScalar(findEntry(document, 'title'))).toBe(value);
    }
  });
});

describe('writeStringList', () => {
  it('writes an empty list', () => {
    expect(writeStringList([])).toBe('[]');
  });

  it('round trips values containing commas', () => {
    const encoded = writeStringList(['one, two', 'three']);
    const document = parseDocument(`---\ntags: ${encoded}\n---\n`);

    expect(readStringList(findEntry(document, 'tags'))).toEqual(['one, two', 'three']);
  });
});
