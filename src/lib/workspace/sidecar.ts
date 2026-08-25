/**
 * The `.notara` sidecar directory.
 *
 * Notara's own state lives here rather than in the user's Markdown. Toggling a
 * pin or opening a folder in the tree must not rewrite a note file or change
 * its modified time, and keeping app state out of the document is the only way
 * to promise that. See `DOCS/PHASE-3-PLAN.md` for the full split.
 */
import { fileSystemHelpers, type RootDirectoryHandle } from '@/lib/filesystem';
import { emptySidecarState, type WorkspaceSidecarState } from './types';

export const SIDECAR_DIRECTORY = '.notara';

export const SIDECAR_STATE_PATH = [SIDECAR_DIRECTORY, 'workspace.json'];
export const SIDECAR_TODOS_PATH = [SIDECAR_DIRECTORY, 'todos.json'];
export const SIDECAR_VISION_BOARDS_PATH = [SIDECAR_DIRECTORY, 'vision-boards.json'];
export const SIDECAR_AI_CONVERSATIONS_PATH = [SIDECAR_DIRECTORY, 'ai-conversations.json'];
export const SIDECAR_BACKUPS_DIRECTORY = [SIDECAR_DIRECTORY, 'backups'];
export const SIDECAR_MEDIA_DIRECTORY = [SIDECAR_DIRECTORY, 'media'];

/**
 * Creates the sidecar directories.
 *
 * The desktop build already does this inside `approve_workspace`, so this call
 * is a no-op there and the real work happens for the browser build. It runs on
 * selection rather than on the first pin, so every later stage can assume the
 * directory is there.
 */
export const ensureSidecarDirectories = async (root: RootDirectoryHandle): Promise<void> => {
  await fileSystemHelpers.ensurePath(root, [SIDECAR_DIRECTORY]);
  await fileSystemHelpers.ensurePath(root, SIDECAR_BACKUPS_DIRECTORY);
  await fileSystemHelpers.ensurePath(root, SIDECAR_MEDIA_DIRECTORY);
};

/** Reads `workspace.json`, falling back to empty state on a missing or bad file. */
export const readSidecarState = async (
  root: RootDirectoryHandle
): Promise<WorkspaceSidecarState> => {
  try {
    const stored = await fileSystemHelpers.readJSON<Partial<WorkspaceSidecarState>>(
      root,
      SIDECAR_STATE_PATH
    );
    if (!stored) {
      return emptySidecarState();
    }

    return {
      version: 1,
      expandedDirectories: Array.isArray(stored.expandedDirectories)
        ? stored.expandedDirectories.filter((entry): entry is string => typeof entry === 'string')
        : [],
      lastActiveFile: typeof stored.lastActiveFile === 'string' ? stored.lastActiveFile : null,
    };
  } catch (error) {
    console.error('Failed to read the workspace sidecar state', error);
    return emptySidecarState();
  }
};

export const writeSidecarState = async (
  root: RootDirectoryHandle,
  state: WorkspaceSidecarState
): Promise<void> => {
  await fileSystemHelpers.writeJSON(root, SIDECAR_STATE_PATH, state);
};

/** What a relocation pass moved, so the caller can tell the user. */
export interface RelocationSummary {
  todos: boolean;
  visionBoards: boolean;
  mediaFiles: number;
}

export const relocationHappened = (summary: RelocationSummary): boolean =>
  summary.todos || summary.visionBoards || summary.mediaFiles > 0;

const LEGACY_TODOS_PATH = ['data', 'todos', 'todos.json'];
const LEGACY_VISION_BOARDS_PATH = ['data', 'vision-boards', 'vision-boards.json'];
const LEGACY_MEDIA_DIRECTORY = ['data', 'media'];

const copyLegacyJSON = async (
  root: RootDirectoryHandle,
  from: string[],
  to: string[]
): Promise<boolean> => {
  // A sidecar file that already exists is the newer copy, so it wins. Without
  // this check a second run would overwrite real work with stale data.
  const existing = await fileSystemHelpers.readJSON<unknown>(root, to);
  if (existing !== null) {
    return false;
  }

  const legacy = await fileSystemHelpers.readJSON<unknown>(root, from);
  if (legacy === null) {
    return false;
  }

  await fileSystemHelpers.writeJSON(root, to, legacy);
  return true;
};

const copyLegacyMedia = async (root: RootDirectoryHandle): Promise<number> => {
  const legacyFiles = await fileSystemHelpers.listDirectoryEntries(root, LEGACY_MEDIA_DIRECTORY);
  if (!legacyFiles.length) {
    return 0;
  }

  const existing = new Set(
    await fileSystemHelpers.listDirectoryEntries(root, SIDECAR_MEDIA_DIRECTORY)
  );

  let copied = 0;
  for (const name of legacyFiles) {
    if (existing.has(name)) {
      continue;
    }
    const blob = await fileSystemHelpers.readBlob(root, [...LEGACY_MEDIA_DIRECTORY, name]);
    if (!blob) {
      continue;
    }
    await fileSystemHelpers.writeBlob(root, [...SIDECAR_MEDIA_DIRECTORY, name], blob);
    copied += 1;
  }

  return copied;
};

/**
 * Copies Notara's own files out of `data/` and into `.notara/`.
 *
 * Todos, vision boards, and media move here so the user's folder holds their
 * Markdown and one dot directory, nothing else. The originals stay in place.
 * Deleting them is the migration's job in stage 5, and doing it here would
 * destroy the only copy if something later in this stage went wrong.
 */
export const relocateLegacyNotaraFiles = async (
  root: RootDirectoryHandle
): Promise<RelocationSummary> => {
  const summary: RelocationSummary = { todos: false, visionBoards: false, mediaFiles: 0 };

  try {
    summary.todos = await copyLegacyJSON(root, LEGACY_TODOS_PATH, SIDECAR_TODOS_PATH);
    summary.visionBoards = await copyLegacyJSON(
      root,
      LEGACY_VISION_BOARDS_PATH,
      SIDECAR_VISION_BOARDS_PATH
    );
    summary.mediaFiles = await copyLegacyMedia(root);
  } catch (error) {
    console.error('Failed to relocate Notara files into .notara', error);
  }

  return summary;
};
