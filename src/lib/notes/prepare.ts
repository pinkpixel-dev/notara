/**
 * Getting a freshly chosen workspace ready.
 *
 * One job is left here: seeding the starter notes when the folder is genuinely
 * empty. Migrating old storage used to run from here too, and now does not.
 * That writes into the user's folder, so it waits for the user to say yes.
 *
 * This lives outside `useNoteFiles` because it is a plain sequence of file
 * operations with no React in it, and keeping it there pushed that file past
 * the repository's size limit.
 */
import type { RootDirectoryHandle } from '@/lib/filesystem';
import type { WorkspaceScan } from '@/lib/workspace/types';
import { buildNoteFile } from '@/lib/markdown/note-frontmatter';
import { uniqueNotePath } from './naming';
import { writeNoteFile } from './store';
import { STARTER_NOTES } from '@/context/notes/starter-notes';

export interface PrepareOptions {
  /**
   * True when old notes are waiting to be imported.
   *
   * A workspace with a pending import is not really empty, so it does not get
   * starter notes. Seeding them would mix Notara's sample text into the folder
   * the user is about to fill with their own.
   */
  hasPendingMigration: boolean;
}

/** True when files were written, which means the scan on screen is stale. */
export const prepareWorkspaceFiles = async (
  root: RootDirectoryHandle,
  scan: WorkspaceScan,
  options: PrepareOptions
): Promise<boolean> => {
  const existingPaths = scan.files.map((file) => file.path);

  // Only a genuinely blank workspace with nothing waiting gets starters.
  if (existingPaths.length > 0 || options.hasPendingMigration) {
    return false;
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

  return claimed.length > 0;
};
