/**
 * Loading every note in a workspace.
 *
 * A workspace is a folder of Markdown files, so loading is a read of each file
 * the scan found. One unreadable file must not take the whole workspace down
 * with it, so failures are collected and reported rather than thrown, and the
 * notes that did load still open.
 */
import type { NoteTag } from '@/types';
import type { Note } from '@/types';
import type { RootDirectoryHandle } from '@/lib/filesystem';
import type { WorkspaceScan } from '@/lib/workspace/types';
import { readNoteFile } from './store';
import { noteFromFile } from './mapping';

/**
 * How many files to read at once.
 *
 * Reading one at a time makes a large workspace crawl, and reading all of them
 * at once opens hundreds of handles and can exhaust the browser's file API. A
 * small window keeps both ends in check.
 */
const READ_CONCURRENCY = 16;

/** A file that could not be read, kept so the interface can say which. */
export interface NoteLoadFailure {
  path: string;
  message: string;
}

export interface NoteLoadResult {
  notes: Note[];
  /** Tags introduced by the files, appended to the ones already known. */
  tags: NoteTag[];
  failures: NoteLoadFailure[];
}

/** Runs `worker` over `items`, at most `limit` at a time, keeping input order. */
const mapWithLimit = async <Input, Output>(
  items: Input[],
  limit: number,
  worker: (item: Input) => Promise<Output>
): Promise<Output[]> => {
  const results = new Array<Output>(items.length);
  let cursor = 0;

  const run = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => run())
  );

  return results;
};

/**
 * The result of reading one file.
 *
 * The discriminant is a string rather than a boolean because this project
 * compiles with `strictNullChecks` disabled, and a boolean discriminant does
 * not narrow a union under that setting.
 */
type FileOutcome =
  | { kind: 'loaded'; path: string; contents: string; revision: string }
  | { kind: 'failed'; path: string; message: string };

/**
 * Reads every Markdown file in a scan and builds the workspace's notes.
 *
 * `knownTags` seeds the tag list so colours the user picked are kept. Tags that
 * only exist inside note files are added on top, in the order the notes list
 * them, which keeps the result stable between loads.
 */
export const loadNotesFromWorkspace = async (
  root: RootDirectoryHandle,
  scan: WorkspaceScan,
  knownTags: NoteTag[]
): Promise<NoteLoadResult> => {
  const outcomes = await mapWithLimit<(typeof scan.files)[number], FileOutcome>(
    scan.files,
    READ_CONCURRENCY,
    async (file) => {
      try {
        const { contents, revision } = await readNoteFile(root, file.path);
        return { kind: 'loaded', path: file.path, contents, revision };
      } catch (error) {
        return {
          kind: 'failed',
          path: file.path,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );

  const notes: Note[] = [];
  const failures: NoteLoadFailure[] = [];
  // Grown as files are read, so a tag introduced by the first note is reused by
  // the second rather than being created twice with two different ids.
  const tags = [...knownTags];

  outcomes.forEach((outcome) => {
    if (outcome.kind === 'loaded') {
      const { note, createdTags } = noteFromFile({
        path: outcome.path,
        contents: outcome.contents,
        revision: outcome.revision,
        knownTags: tags,
      });

      notes.push(note);
      tags.push(...createdTags);
    } else {
      failures.push({ path: outcome.path, message: outcome.message });
    }
  });

  return { notes, tags, failures };
};
