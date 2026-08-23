/**
 * Moving notes out of `data/notes/notes.json` and into the workspace.
 *
 * Earlier versions kept notes as records in a JSON bundle and wrote a one-way
 * `note-{uuid}.md` mirror beside it that was never read back. Now the Markdown
 * file is the note, so those records have to become real files in folders the
 * user can see.
 *
 * Two rules shape everything here. The migration runs once and records that it
 * ran, so reopening a workspace does not produce a second copy of every note.
 * And it never deletes the JSON it read from. If something about the result is
 * wrong, the original is still sitting there, which matters far more than a
 * tidy folder.
 */
import { fileSystemHelpers, type RootDirectoryHandle } from '@/lib/filesystem';
import { NOTES_JSON_PATH } from '@/lib/filesystem/paths';
import { SIDECAR_DIRECTORY } from '@/lib/workspace/sidecar';
import type { Note } from '@/types';
import { uniqueNotePath } from './naming';
import { metadataOf } from './mapping';
import { buildNoteFile } from '@/lib/markdown/note-frontmatter';
import { writeNoteFile } from './store';

/** Records that the migration ran, so it never runs a second time. */
export const MIGRATION_MARKER_PATH = [SIDECAR_DIRECTORY, 'notes-migrated.json'];

interface MigrationMarker {
  version: 1;
  /** When the migration ran. */
  migratedAt: string;
  /** How many notes were written. */
  noteCount: number;
}

export interface MigrationResult {
  /** True when files were written during this call. */
  ran: boolean;
  written: string[];
  failures: Array<{ title: string; message: string }>;
}

const nothingToDo = (): MigrationResult => ({ ran: false, written: [], failures: [] });

/** A note record from the old bundle, before it became a file. */
type LegacyNote = Partial<Note> & { title?: string; content?: string };

const hasRun = async (root: RootDirectoryHandle): Promise<boolean> => {
  const marker = await fileSystemHelpers
    .readJSON<MigrationMarker>(root, MIGRATION_MARKER_PATH)
    .catch(() => null);
  return marker !== null;
};

/**
 * Writes the old JSON notes into the workspace as Markdown files.
 *
 * Notes land at the workspace root, because the bundle had no concept of
 * folders and inventing a structure for someone else's notes is not this
 * function's decision to make. Sorting them into folders is a thing the user
 * does afterwards, in the app or in their file manager.
 *
 * `existingPaths` is what the scan already found, so a migrated note cannot
 * overwrite a Markdown file that was already sitting in the folder.
 */
export const migrateNotesBundle = async (
  root: RootDirectoryHandle,
  existingPaths: string[]
): Promise<MigrationResult> => {
  if (await hasRun(root)) {
    return nothingToDo();
  }

  const bundle = await fileSystemHelpers
    .readJSON<{ notes?: LegacyNote[] }>(root, NOTES_JSON_PATH)
    .catch(() => null);

  const legacyNotes = bundle?.notes ?? [];
  if (legacyNotes.length === 0) {
    // Still record the run. A workspace that never had a bundle should not be
    // checked again every time it opens.
    await writeMarker(root, 0);
    return nothingToDo();
  }

  const claimed = [...existingPaths];
  const written: string[] = [];
  const failures: MigrationResult['failures'] = [];

  for (const legacy of legacyNotes) {
    const title = legacy.title?.trim() || 'Untitled';
    const path = uniqueNotePath('', title, claimed);

    try {
      const now = new Date().toISOString();
      const contents = buildNoteFile(
        metadataOf({
          ...(legacy as Note),
          tags: legacy.tags ?? [],
          isPinned: legacy.isPinned ?? false,
          isStarred: legacy.isStarred ?? false,
          createdAt: legacy.createdAt ?? now,
          updatedAt: legacy.updatedAt ?? now,
        }),
        legacy.content ?? ''
      );

      // No expected revision: the path was just proven unused, so there is
      // nothing on disk to conflict with.
      await writeNoteFile(root, path, contents, null);
      claimed.push(path);
      written.push(path);
    } catch (error) {
      failures.push({
        title,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // The marker goes in only after the writes, so a migration interrupted
  // halfway runs again rather than leaving the rest of the notes stranded in
  // the JSON. The already-written files keep their names, so the second pass
  // adds numbered copies instead of overwriting. That is noisy but recoverable,
  // which is the right way round.
  if (failures.length === 0) {
    await writeMarker(root, written.length);
  }

  return { ran: written.length > 0, written, failures };
};

const writeMarker = async (root: RootDirectoryHandle, noteCount: number): Promise<void> => {
  const marker: MigrationMarker = {
    version: 1,
    migratedAt: new Date().toISOString(),
    noteCount,
  };
  await fileSystemHelpers.writeJSON(root, MIGRATION_MARKER_PATH, marker);
};
