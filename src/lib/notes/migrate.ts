/**
 * Moving notes out of the old storage and into the workspace.
 *
 * Earlier versions kept notes as records rather than files: a JSON bundle at
 * `data/notes/notes.json` in desktop workspaces, and `localStorage` in the
 * browser. Now the Markdown file is the note, so those records have to become
 * real files in folders the user can see.
 *
 * Three rules shape everything here. Finding notes never writes anything, so
 * the user is asked before their folder changes. The import runs once per
 * workspace and records that it ran, so reopening does not produce a second
 * copy of every note. And nothing is ever deleted from the old storage: if the
 * result is wrong, the original is still sitting there, which matters far more
 * than a tidy folder.
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
  written: string[];
  failures: Array<{ title: string; message: string }>;
}

/** Where a set of legacy notes was found. */
export type LegacySource = 'workspace-json' | 'browser-storage';

/** Legacy notes found in one place, before anything has been written. */
export interface LegacyNotesFound {
  source: LegacySource;
  notes: LegacyNote[];
}

/** Everything a workspace could import, and enough detail to preview it. */
export interface PendingMigration {
  found: LegacyNotesFound[];
  /** Note titles in the order they would be written, for the preview. */
  titles: string[];
  total: number;
}

/** A note record from the old bundle, before it became a file. */
export type LegacyNote = Partial<Note> & { title?: string; content?: string };

/** `localStorage` keys the browser build used before notes were files. */
export const LEGACY_NOTES_STORAGE_KEY = 'notara-notes';

const hasRun = async (root: RootDirectoryHandle): Promise<boolean> => {
  const marker = await fileSystemHelpers
    .readJSON<MigrationMarker>(root, MIGRATION_MARKER_PATH)
    .catch(() => null);
  return marker !== null;
};

/** Reads the notes the browser build left in `localStorage`. */
const readBrowserNotes = (): LegacyNote[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(LEGACY_NOTES_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as LegacyNote[]) : [];
  } catch {
    // Unreadable storage is treated as empty. There is nothing useful to
    // recover from a value that will not parse, and failing the whole app over
    // it would be worse.
    return [];
  }
};

/** The title a legacy record will be filed under. */
export const legacyTitle = (legacy: LegacyNote): string => legacy.title?.trim() || 'Untitled';

/**
 * Looks for notes still living in the old storage.
 *
 * This never writes a note. The one thing it can write is the marker, and only
 * when there is nothing to migrate, so a workspace that never had old data is
 * not searched again on every open.
 *
 * Returns null when there is nothing to offer.
 */
export const findLegacyNotes = async (
  root: RootDirectoryHandle
): Promise<PendingMigration | null> => {
  if (await hasRun(root)) {
    return null;
  }

  const bundle = await fileSystemHelpers
    .readJSON<{ notes?: LegacyNote[] }>(root, NOTES_JSON_PATH)
    .catch(() => null);

  const found: LegacyNotesFound[] = [];

  const jsonNotes = bundle?.notes ?? [];
  if (jsonNotes.length > 0) {
    found.push({ source: 'workspace-json', notes: jsonNotes });
  }

  const browserNotes = readBrowserNotes();
  if (browserNotes.length > 0) {
    found.push({ source: 'browser-storage', notes: browserNotes });
  }

  if (found.length === 0) {
    await writeMarker(root, 0);
    return null;
  }

  const titles = found.flatMap((entry) => entry.notes.map(legacyTitle));
  return { found, titles, total: titles.length };
};

/**
 * Writes the legacy notes into the workspace as Markdown files.
 *
 * Notes land at the workspace root, because the old storage had no concept of
 * folders and inventing a structure for someone else's notes is not this
 * function's decision to make. Sorting them into folders is a thing the user
 * does afterwards, in the app or in their file manager.
 *
 * `existingPaths` is what the scan already found, so a migrated note cannot
 * overwrite a Markdown file that was already sitting in the folder.
 */
export const importLegacyNotes = async (
  root: RootDirectoryHandle,
  pending: PendingMigration,
  existingPaths: string[]
): Promise<MigrationResult> => {
  const claimed = [...existingPaths];
  const written: string[] = [];
  const failures: MigrationResult['failures'] = [];

  for (const legacy of pending.found.flatMap((entry) => entry.notes)) {
    const title = legacyTitle(legacy);
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

  // The marker goes in only after a clean run, so a migration interrupted
  // halfway is offered again rather than leaving the rest of the notes
  // stranded. The already-written files keep their names, so the second pass
  // adds numbered copies instead of overwriting. That is noisy but
  // recoverable, which is the right way round.
  if (failures.length === 0) {
    await writeMarker(root, written.length);
  }

  return { written, failures };
};

const writeMarker = async (root: RootDirectoryHandle, noteCount: number): Promise<void> => {
  const marker: MigrationMarker = {
    version: 1,
    migratedAt: new Date().toISOString(),
    noteCount,
  };
  await fileSystemHelpers.writeJSON(root, MIGRATION_MARKER_PATH, marker);
};
