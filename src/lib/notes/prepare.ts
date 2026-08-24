/**
 * Getting a freshly chosen workspace ready.
 *
 * Two one-time jobs run before a folder's notes are read: moving anything left
 * in the old JSON bundle into real Markdown files, and seeding the starter
 * notes when the folder is genuinely empty. Both write files, so the caller has
 * to rescan afterwards.
 *
 * This lives outside `useNoteFiles` because it is a plain sequence of file
 * operations with no React in it, and keeping it there pushed that file past
 * the repository's size limit.
 */
import type { RootDirectoryHandle } from '@/lib/filesystem';
import type { WorkspaceScan } from '@/lib/workspace/types';
import { buildNoteFile } from '@/lib/markdown/note-frontmatter';
import { migrateNotesBundle } from './migrate';
import { uniqueNotePath } from './naming';
import { writeNoteFile } from './store';
import { STARTER_NOTES } from '@/context/notes/starter-notes';

export interface PrepareResult {
  /**
   * True when files were written, which means the scan on screen is stale.
   */
  wroteFiles: boolean;
  /**
   * Set when the migration could not move some notes. The originals are left
   * where they were, so this is a warning rather than a failure.
   */
  migrationError: string | null;
}

export const prepareWorkspaceFiles = async (
  root: RootDirectoryHandle,
  scan: WorkspaceScan
): Promise<PrepareResult> => {
  const existingPaths = scan.files.map((file) => file.path);
  const migration = await migrateNotesBundle(root, existingPaths);

  const migrationError =
    migration.failures.length > 0
      ? `${migration.failures.length} note${
          migration.failures.length === 1 ? '' : 's'
        } could not be moved out of the old storage. The original file was left in place.`
      : null;

  if (migration.ran) {
    return { wroteFiles: true, migrationError };
  }

  // A folder with notes already in it is not empty, and neither is one the
  // migration just filled. Only a genuinely blank workspace gets starters.
  if (existingPaths.length > 0) {
    return { wroteFiles: false, migrationError };
  }

  const claimed: string[] = [];
  for (const starter of STARTER_NOTES) {
    const path = uniqueNotePath('', starter.title, claimed);
    const now = new Date().toISOString();

    await writeNoteFile(
      root,
      path,
      buildNoteFile(
        { tags: [], pinned: starter.pinned, starred: false, created: now, updated: now },
        starter.content
      ),
      null
    );
    claimed.push(path);
  }

  return { wroteFiles: claimed.length > 0, migrationError };
};
