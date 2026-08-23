/**
 * Turning a note file into a `Note`, and a `Note` back into file text.
 *
 * The split of responsibility is worth stating once. The file name carries the
 * title, the frontmatter carries tags and flags and timestamps, and everything
 * below the frontmatter is the note's content. Nothing else about a note is
 * stored anywhere, which is what makes a workspace folder readable without
 * Notara.
 */
import { v4 as uuidv4 } from 'uuid';
import type { Note, NoteTag } from '@/types';
import { applyNoteMetadata, parseNote, type NoteMetadata } from '@/lib/markdown/note-frontmatter';
import { fileNameToTitle } from './naming';

/** Colour given to a tag Notara meets for the first time inside a note file. */
const DISCOVERED_TAG_COLOR = '#9b87f5';

/**
 * Recovers a timestamp from a revision string.
 *
 * A revision is `{modified-nanoseconds}-{length}`, so a file with no dates in
 * its frontmatter can still show when it last changed. Reaching into the
 * revision's shape is a little cheeky, but the alternative is a second metadata
 * call per note on every load, and a plain Markdown file the user wrote in
 * another editor is exactly the case that needs a sensible date.
 */
const timestampFromRevision = (revision: string | null): string | null => {
  if (!revision) {
    return null;
  }

  const [nanoseconds] = revision.split('-');
  const milliseconds = Number(nanoseconds) / 1_000_000;
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return null;
  }

  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Resolves tag names from a file against the workspace's tag list.
 *
 * A name Notara has not seen becomes a new tag rather than being dropped, so
 * adding `tags: [Recipes]` to a file by hand is enough to create the tag. The
 * comparison ignores case, because `recipes` and `Recipes` in two files are
 * plainly meant to be one tag.
 */
export const resolveTags = (
  names: string[],
  known: NoteTag[]
): { tags: NoteTag[]; created: NoteTag[] } => {
  const byName = new Map(known.map((tag) => [tag.name.toLowerCase(), tag]));
  const tags: NoteTag[] = [];
  const created: NoteTag[] = [];

  names.forEach((name) => {
    const trimmed = name.trim();
    if (trimmed === '') {
      return;
    }

    const key = trimmed.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      tags.push(existing);
      return;
    }

    const fresh: NoteTag = { id: uuidv4(), name: trimmed, color: DISCOVERED_TAG_COLOR };
    byName.set(key, fresh);
    created.push(fresh);
    tags.push(fresh);
  });

  return { tags, created };
};

export interface NoteFromFileInput {
  /** Workspace-relative path, which becomes the note's identity. */
  path: string;
  contents: string;
  revision: string | null;
  /** Tags already known to the workspace, so files agree on colours. */
  knownTags: NoteTag[];
}

export interface NoteFromFileResult {
  note: Note;
  /** Tags this file introduced, for the caller to add to the workspace list. */
  createdTags: NoteTag[];
}

/** Builds a `Note` from a file's path and contents. */
export const noteFromFile = ({
  path,
  contents,
  revision,
  knownTags,
}: NoteFromFileInput): NoteFromFileResult => {
  const parsed = parseNote(contents);
  const { tags, created } = resolveTags(parsed.metadata.tags, knownTags);

  // A file with no dates of its own falls back to when it last changed, then to
  // now. Showing "just now" for a note written last year would be a lie the
  // notes list sorts on.
  const fromFile = timestampFromRevision(revision);
  const updated = parsed.metadata.updated ?? fromFile ?? new Date().toISOString();
  const created_at = parsed.metadata.created ?? fromFile ?? updated;

  return {
    note: {
      id: path,
      path,
      revision,
      title: fileNameToTitle(path),
      content: parsed.body,
      createdAt: created_at,
      updatedAt: updated,
      tags,
      isPinned: parsed.metadata.pinned,
      isStarred: parsed.metadata.starred,
    },
    createdTags: created,
  };
};

/** The metadata block Notara would write for a note. */
export const metadataOf = (note: Note): NoteMetadata => ({
  tags: note.tags.map((tag) => tag.name),
  pinned: note.isPinned,
  starred: note.isStarred,
  created: note.createdAt,
  updated: note.updatedAt,
});

/**
 * Renders a note as file text.
 *
 * `existingContents` is the file as it is on disk right now. Passing it is what
 * lets frontmatter keys Notara does not own survive the save untouched, so an
 * empty string is only correct for a file that does not exist yet.
 */
export const noteToFileContents = (note: Note, existingContents: string): string =>
  applyNoteMetadata(parseNote(existingContents), metadataOf(note), note.content);
