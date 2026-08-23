/**
 * The frontmatter keys Notara owns on a note file.
 *
 * A note's title is its file name, so there is no `title` key here. What is
 * left is the small amount of state that has nowhere else to live: which tags
 * the note carries, whether it is pinned or starred, and when it was created
 * and last changed.
 *
 * Every key is optional on read. A plain Markdown file with no frontmatter at
 * all is a valid note, and opening one must not invent metadata for it.
 *
 * Writing goes through `applyNoteMetadata`, which only ever touches these keys.
 * Anything else in the block is passed through byte for byte by the parser in
 * `frontmatter.ts`.
 */
import {
  findEntry,
  parseDocument,
  removeEntry,
  serializeDocument,
  setEntry,
  type ParsedDocument,
} from './frontmatter';
import { readScalar, readStringList, writeScalar, writeStringList } from './values';

/** State Notara keeps about a note, beyond its name and its body text. */
export interface NoteMetadata {
  tags: string[];
  pinned: boolean;
  starred: boolean;
  /** ISO timestamp, or null when the file does not record one. */
  created: string | null;
  /** ISO timestamp, or null when the file does not record one. */
  updated: string | null;
}

export interface ParsedNote {
  metadata: NoteMetadata;
  /** The document below the frontmatter block. */
  body: string;
  /**
   * The parsed source, kept so a later write can rebuild the file around the
   * keys Notara did not touch.
   */
  document: ParsedDocument;
}

/**
 * Key names accepted when reading, newest first.
 *
 * The second name in each list is what Notara's old one-way Markdown mirror
 * wrote. A user who copied those files out of `data/notes/markdown` into their
 * own folders should not lose their pins and dates, so both names are read.
 * Only the first name is ever written.
 */
const TAG_KEYS = ['tags'];
const PINNED_KEYS = ['pinned', 'isPinned'];
const STARRED_KEYS = ['starred', 'isStarred'];
const CREATED_KEYS = ['created', 'createdAt'];
const UPDATED_KEYS = ['updated', 'updatedAt'];

/** Every key this module may write, used to clear stale spellings on save. */
const LEGACY_KEYS = ['isPinned', 'isStarred', 'createdAt', 'updatedAt'];

const firstEntry = (document: ParsedDocument, keys: string[]) => {
  for (const key of keys) {
    const entry = findEntry(document, key);
    if (entry) {
      return entry;
    }
  }
  return undefined;
};

/** YAML's true-ish spellings. Anything else, including a missing key, is false. */
const readBoolean = (document: ParsedDocument, keys: string[]): boolean => {
  const value = readScalar(firstEntry(document, keys));
  return value === null ? false : /^(true|yes|on|1)$/i.test(value.trim());
};

/**
 * Reads a timestamp, rejecting anything that is not a real date.
 *
 * A hand-edited or malformed value becomes null rather than an Invalid Date,
 * which would otherwise reach the notes list and render as "Invalid Date".
 */
const readTimestamp = (document: ParsedDocument, keys: string[]): string | null => {
  const value = readScalar(firstEntry(document, keys));
  if (value === null) {
    return null;
  }
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

/** Reads a note file into its metadata and its body. */
export const parseNote = (raw: string): ParsedNote => {
  const document = parseDocument(raw);

  return {
    metadata: {
      tags: readStringList(firstEntry(document, TAG_KEYS)),
      pinned: readBoolean(document, PINNED_KEYS),
      starred: readBoolean(document, STARRED_KEYS),
      created: readTimestamp(document, CREATED_KEYS),
      updated: readTimestamp(document, UPDATED_KEYS),
    },
    body: document.body,
    document,
  };
};

/**
 * Writes the owned keys onto a document and returns the file's new text.
 *
 * Keys are only present when they carry information. An unpinned, unstarred,
 * untagged note gets no `pinned: false` line, because that is noise in a file
 * the user is meant to read and edit by hand. Timestamps are always written,
 * since nothing else records them reliably across platforms.
 *
 * `body` replaces the document's body. Pass the existing body through to change
 * metadata alone.
 */
export const applyNoteMetadata = (
  source: ParsedNote,
  metadata: NoteMetadata,
  body: string
): string => {
  let document: ParsedDocument = { ...source.document, body };

  // An old spelling left in place would win on the next read for any key whose
  // new name is absent, so both are cleared before the current names go in.
  LEGACY_KEYS.forEach((key) => {
    document = removeEntry(document, key);
  });

  document =
    metadata.tags.length > 0
      ? setEntry(document, 'tags', writeStringList(metadata.tags))
      : removeEntry(document, 'tags');

  document = metadata.pinned
    ? setEntry(document, 'pinned', 'true')
    : removeEntry(document, 'pinned');

  document = metadata.starred
    ? setEntry(document, 'starred', 'true')
    : removeEntry(document, 'starred');

  if (metadata.created) {
    document = setEntry(document, 'created', writeScalar(metadata.created));
  }
  if (metadata.updated) {
    document = setEntry(document, 'updated', writeScalar(metadata.updated));
  }

  return serializeDocument(document);
};

/** Builds the text of a brand new note file. */
export const buildNoteFile = (metadata: NoteMetadata, body: string): string =>
  applyNoteMetadata(parseNote(''), metadata, body);
