/**
 * Reading and writing the small set of YAML value shapes Notara owns.
 *
 * This is not a YAML implementation. It covers plain scalars, quoted scalars,
 * flow sequences, and block sequences, which is everything Notara writes into
 * frontmatter. Anything it cannot understand is reported as absent rather than
 * guessed at, so an unusual value is left alone instead of being rewritten into
 * something the user did not author.
 */
import type { FrontmatterEntry } from './frontmatter';

const stripTerminator = (line: string): string => line.replace(/\r?\n$/, '');

/** Returns the text after `key:` on the entry's first line. */
const inlineValue = (entry: FrontmatterEntry): string => {
  const first = stripTerminator(entry.lines[0] ?? '');
  const colon = first.indexOf(':');
  return colon === -1 ? '' : first.slice(colon + 1).trim();
};

/** Removes a trailing unquoted comment, which YAML requires be space separated. */
const stripComment = (value: string): string => {
  if (value.startsWith('"') || value.startsWith("'")) {
    return value;
  }
  const comment = value.search(/\s#/);
  return comment === -1 ? value : value.slice(0, comment).trim();
};

const unquote = (value: string): string => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
};

/**
 * Reads an entry as a single string.
 *
 * Returns null for a key whose value spans more lines than Notara writes, such
 * as a block scalar, because rewriting those is not safe here.
 */
export const readScalar = (entry: FrontmatterEntry | undefined): string | null => {
  if (!entry) {
    return null;
  }
  if (entry.lines.length > 1 && entry.lines.slice(1).some((line) => stripTerminator(line).trim())) {
    return null;
  }
  const value = stripComment(inlineValue(entry));
  return value === '' ? null : unquote(value);
};

/** Splits a flow sequence body on commas that sit outside quotes. */
const splitFlow = (inner: string): string[] => {
  const items: string[] = [];
  let current = '';
  let quote: string | null = null;

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner[index];

    if (quote) {
      if (character === '\\' && quote === '"') {
        current += character + (inner[index + 1] ?? '');
        index += 1;
        continue;
      }
      if (character === quote) {
        quote = null;
      }
      current += character;
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      current += character;
      continue;
    }

    if (character === ',') {
      items.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  items.push(current);
  return items;
};

/**
 * Reads an entry as a list of strings.
 *
 * Handles both `tags: [a, b]` and a block sequence of `- a` lines. An empty or
 * unreadable value gives an empty list.
 */
export const readStringList = (entry: FrontmatterEntry | undefined): string[] => {
  if (!entry) {
    return [];
  }

  const inline = stripComment(inlineValue(entry));

  if (inline.startsWith('[')) {
    const close = inline.lastIndexOf(']');
    const inner = inline.slice(1, close === -1 ? undefined : close).trim();
    if (inner === '') {
      return [];
    }
    return splitFlow(inner)
      .map((item) => unquote(item.trim()))
      .filter((item) => item !== '');
  }

  if (inline !== '') {
    return [unquote(inline)];
  }

  return entry.lines
    .slice(1)
    .map((line) => stripTerminator(line).trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => unquote(line.slice(2).trim()))
    .filter((item) => item !== '');
};

/**
 * Quotes a scalar only when leaving it bare would change its meaning.
 *
 * Bare values keep files readable and diffs small. Anything that YAML would
 * read as a number, boolean, null, or structure gets quoted.
 */
export const writeScalar = (value: string): string => {
  const needsQuotes =
    value === '' ||
    /^[\s]|[\s]$/.test(value) ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(value) ||
    /["\\]/.test(value) ||
    /:\s|\s#/.test(value) ||
    /^(true|false|null|yes|no|on|off|~)$/i.test(value) ||
    /^[-+]?(\d[\d_]*)(\.\d*)?([eE][-+]?\d+)?$/.test(value);

  if (!needsQuotes) {
    return value;
  }

  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

/**
 * Writes one item of a flow sequence.
 *
 * Inside brackets a comma separates items, so a value containing one has to be
 * quoted even though the same value would be safe bare on its own line.
 * Leaving it unquoted would split a single tag into two on the next read.
 */
const writeFlowItem = (value: string): string => {
  const encoded = writeScalar(value);
  if (encoded.startsWith('"') || !/[,[\]{}]/.test(value)) {
    return encoded;
  }
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

/** Writes a list as a flow sequence, which is how Notara has always written tags. */
export const writeStringList = (values: string[]): string =>
  values.length === 0 ? '[]' : `[${values.map(writeFlowItem).join(', ')}]`;
