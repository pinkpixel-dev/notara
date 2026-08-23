/**
 * Raw YAML frontmatter handling.
 *
 * This module deliberately does not parse YAML into a value tree and write it
 * back out. Doing that would reformat keys Notara does not own: quoting style,
 * key order, comments, block scalars, and indentation would all drift on every
 * save. The plan requires the opposite, that opening a file with unrelated
 * frontmatter keys and saving it back leaves those keys byte-identical.
 *
 * So the block is kept as raw source. Each top-level key owns the span of lines
 * it occupies, including any indented continuation, list items, or block
 * scalar text beneath it. Reading an owned key parses only that span. Writing
 * an owned key replaces only that span. Every other byte is passed through
 * untouched.
 *
 * See `DOCS/PHASE-3-PLAN.md`, stage 2.
 */

/** A top-level frontmatter key and the exact source lines it spans. */
export interface FrontmatterEntry {
  key: string;
  /** Source lines for this key, each still carrying its own line terminator. */
  lines: string[];
}

export interface ParsedDocument {
  /** True when a complete `---` delimited block opened the document. */
  hasFrontmatter: boolean;
  /**
   * Lines inside the block that precede the first key, such as leading
   * comments or blank lines. Preserved verbatim.
   */
  preamble: string[];
  entries: FrontmatterEntry[];
  /** The document after the closing delimiter, unmodified. */
  body: string;
  /** The exact opening delimiter line, terminator included. */
  openDelimiter: string;
  /** The exact closing delimiter line, terminator included. */
  closeDelimiter: string;
  /** A byte-order mark, if the document started with one. */
  bom: string;
  /** Dominant line terminator inside the block, used when writing new lines. */
  eol: string;
}

/** Splits text into lines that each keep their own terminator. */
const splitLines = (text: string): string[] => (text.length === 0 ? [] : text.split(/(?<=\n)/));

/** Strips a line's trailing terminator. */
const lineContent = (line: string): string => line.replace(/\r?\n$/, '');

/** A delimiter is exactly three dashes, ignoring trailing spaces. */
const isDelimiter = (line: string): boolean => /^---[ \t]*$/.test(lineContent(line));

/** A closing delimiter may also be the YAML document end marker. */
const isCloseDelimiter = (line: string): boolean =>
  isDelimiter(line) || /^\.\.\.[ \t]*$/.test(lineContent(line));

/**
 * Matches a top-level key at column zero.
 *
 * Anything indented, blank, or starting with a list dash is a continuation of
 * the key above it, which is what keeps nested maps and block scalars whole.
 */
const KEY_PATTERN = /^([A-Za-z0-9_][A-Za-z0-9_\-.]*)[ \t]*:/;

const matchKey = (line: string): string | null => {
  const match = KEY_PATTERN.exec(lineContent(line));
  return match ? match[1] : null;
};

const detectEol = (lines: string[]): string => {
  for (const line of lines) {
    if (line.endsWith('\r\n')) {
      return '\r\n';
    }
    if (line.endsWith('\n')) {
      return '\n';
    }
  }
  return '\n';
};

/** A document with no frontmatter block, so the whole text is the body. */
const bodyOnly = (body: string, bom: string): ParsedDocument => ({
  hasFrontmatter: false,
  preamble: [],
  entries: [],
  body,
  openDelimiter: '',
  closeDelimiter: '',
  bom,
  eol: detectEol(splitLines(body)),
});

/**
 * Parses a Markdown document into its frontmatter block and body.
 *
 * A document whose block never closes is treated as having no frontmatter at
 * all. Guessing where an unterminated block ends risks swallowing real content
 * into metadata, and losing the top of someone's note is worse than showing a
 * stray `---`.
 */
export const parseDocument = (raw: string): ParsedDocument => {
  const bom = raw.startsWith('﻿') ? '﻿' : '';
  const text = bom ? raw.slice(bom.length) : raw;
  const lines = splitLines(text);

  if (lines.length === 0 || !isDelimiter(lines[0])) {
    return bodyOnly(text, bom);
  }

  let closeIndex = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (isCloseDelimiter(lines[index])) {
      closeIndex = index;
      break;
    }
  }

  if (closeIndex === -1) {
    return bodyOnly(text, bom);
  }

  const blockLines = lines.slice(1, closeIndex);
  const preamble: string[] = [];
  const entries: FrontmatterEntry[] = [];

  for (const line of blockLines) {
    const key = matchKey(line);
    if (key === null) {
      if (entries.length === 0) {
        preamble.push(line);
      } else {
        entries[entries.length - 1].lines.push(line);
      }
      continue;
    }
    entries.push({ key, lines: [line] });
  }

  return {
    hasFrontmatter: true,
    preamble,
    entries,
    body: lines.slice(closeIndex + 1).join(''),
    openDelimiter: lines[0],
    closeDelimiter: lines[closeIndex],
    bom,
    eol: detectEol(blockLines.length > 0 ? blockLines : lines),
  };
};

/**
 * Rebuilds a document from its parsed parts.
 *
 * Reassembling an untouched document returns the original bytes exactly, which
 * is what makes a read and write round trip safe.
 */
export const serializeDocument = (document: ParsedDocument): string => {
  if (!document.hasFrontmatter) {
    return `${document.bom}${document.body}`;
  }

  if (document.entries.length === 0 && document.preamble.length === 0) {
    return `${document.bom}${document.body}`;
  }

  const block = [
    ...document.preamble,
    ...document.entries.flatMap((entry) => entry.lines),
  ].join('');

  return `${document.bom}${document.openDelimiter}${block}${document.closeDelimiter}${document.body}`;
};

export const findEntry = (
  document: ParsedDocument,
  key: string
): FrontmatterEntry | undefined => document.entries.find((entry) => entry.key === key);

/**
 * Replaces or appends a single top-level key.
 *
 * A replaced key keeps its position in the block so that rewriting a title does
 * not reorder someone's frontmatter. The value is written as a single line, so
 * this is only ever used for keys Notara owns.
 */
export const setEntry = (
  document: ParsedDocument,
  key: string,
  value: string
): ParsedDocument => {
  const line = `${key}: ${value}${document.eol}`;
  const index = document.entries.findIndex((entry) => entry.key === key);

  const entries =
    index === -1
      ? [...document.entries, { key, lines: [line] }]
      : document.entries.map((entry, position) =>
          position === index ? { key, lines: [line] } : entry
        );

  if (document.hasFrontmatter) {
    return { ...document, entries };
  }

  // The document had no block, so one is opened around the new key. The body is
  // left exactly as it was.
  return {
    ...document,
    hasFrontmatter: true,
    entries,
    openDelimiter: `---${document.eol}`,
    closeDelimiter: `---${document.eol}`,
  };
};

export const removeEntry = (document: ParsedDocument, key: string): ParsedDocument => ({
  ...document,
  entries: document.entries.filter((entry) => entry.key !== key),
});
