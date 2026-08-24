/**
 * The offer to import notes out of Notara's old storage.
 *
 * Kept apart from `useNoteFiles` because it is a self-contained conversation
 * with the user: look for old notes, show them, write them if asked. It also
 * kept that file over the repository's size limit.
 *
 * Nothing here writes a note without being told to. `detectLegacyNotes` only
 * reads, and `runMigration` is called from the dialog after the user has seen
 * what it would do.
 */
import { useCallback, useState } from 'react';
import type { RootDirectoryHandle } from '@/lib/filesystem';
import type { WorkspaceScan } from '@/lib/workspace/types';
import {
  findLegacyNotes,
  importLegacyNotes,
  type MigrationResult,
  type PendingMigration,
} from '@/lib/notes/migrate';

export interface NoteMigrationApi {
  /** Old notes waiting to be imported, or null when there are none. */
  pendingMigration: PendingMigration | null;
  /** Looks for old notes. Reads only. Returns true when it found some. */
  detectLegacyNotes: () => Promise<boolean>;
  /** Imports them. Only called after the user has seen what is coming. */
  runMigration: () => Promise<MigrationResult | null>;
  /** Puts the offer away for this session, recording nothing. */
  dismissMigration: () => void;
}

export const useNoteMigration = (
  rootHandle: RootDirectoryHandle | null,
  scan: WorkspaceScan | null,
  refresh: () => Promise<unknown>,
  onError: (message: string) => void
): NoteMigrationApi => {
  const [pendingMigration, setPendingMigration] = useState<PendingMigration | null>(null);

  const detectLegacyNotes = useCallback(async (): Promise<boolean> => {
    if (!rootHandle) {
      return false;
    }
    const pending = await findLegacyNotes(rootHandle);
    setPendingMigration(pending);
    return pending !== null;
  }, [rootHandle]);

  const runMigration = useCallback(async (): Promise<MigrationResult | null> => {
    if (!rootHandle || !scan || !pendingMigration) {
      return null;
    }

    const result = await importLegacyNotes(
      rootHandle,
      pendingMigration,
      scan.files.map((file) => file.path)
    );

    if (result.failures.length > 0) {
      onError(
        `${result.failures.length} note${
          result.failures.length === 1 ? '' : 's'
        } could not be imported. Nothing was removed from the old storage.`
      );
    }

    setPendingMigration(null);
    if (result.written.length > 0) {
      await refresh();
    }

    return result;
  }, [onError, pendingMigration, refresh, rootHandle, scan]);

  const dismissMigration = useCallback(() => setPendingMigration(null), []);

  return { pendingMigration, detectLegacyNotes, runMigration, dismissMigration };
};
