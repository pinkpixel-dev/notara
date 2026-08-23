import { join } from '@tauri-apps/api/path';
import { open as openSystemDialog } from '@tauri-apps/plugin-dialog';
import {
  BaseDirectory,
  exists as tauriExists,
  mkdir as tauriMkdir,
  readDir as tauriReadDir,
  readFile as tauriReadFile,
  readTextFile,
  remove as tauriRemove,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import type { Note, NoteTag, VisionBoard } from '@/types';
import { approveWorkspace, forgetWorkspace } from '@/lib/workspace/commands';
import {
  clearPersistedBrowserDirectoryHandle,
  clearPersistedWorkspacePath,
  persistBrowserDirectoryHandle,
  persistWorkspacePath,
  retrievePersistedBrowserDirectoryHandle,
  retrievePersistedWorkspacePath,
} from './persistence';

export interface NotesBundle {
  notes: Note[];
  tags: NoteTag[];
  visionBoards: VisionBoard[];
}

export type FileSystemStatus =
  | 'unsupported'
  | 'uninitialized'
  | 'no-directory'
  | 'needs-permission'
  | 'ready'
  | 'error';

export interface BrowserDirectoryReference {
  kind: 'browser';
  name: string;
  handle: FileSystemDirectoryHandle;
}

export interface TauriDirectoryReference {
  kind: 'tauri';
  name: string;
  /**
   * App-relative when `baseDir` is set, absolute when it is not.
   *
   * A workspace the user chose sits outside the app directories, so it has no
   * base directory to resolve against and carries its full path instead.
   */
  path: string;
  baseDir?: BaseDirectory;
  source: 'app-data' | 'workspace';
}

export type RootDirectoryHandle = BrowserDirectoryReference | TauriDirectoryReference;

const DATA_DIRECTORY = 'data';
const TAURI_DEFAULT_DIRECTORY_NAME = 'App storage';
const TAURI_DEFAULT_DIRECTORY_SEGMENT = 'workspace';

const isBrowserEnvironment = typeof window !== 'undefined';

const isTauriEnvironment = () =>
  isBrowserEnvironment &&
  '__TAURI_INTERNALS__' in (window as unknown as Record<string, unknown>);

const supportsBrowserFileSystem = () =>
  isBrowserEnvironment &&
  'showDirectoryPicker' in window &&
  'isSecureContext' in window &&
  window.isSecureContext;

const getDefaultTauriDirectory = async (): Promise<TauriDirectoryReference> => {
  return {
    kind: 'tauri',
    name: TAURI_DEFAULT_DIRECTORY_NAME,
    path: TAURI_DEFAULT_DIRECTORY_SEGMENT,
    baseDir: BaseDirectory.AppData,
    source: 'app-data',
  };
};

/**
 * Resolves the option bag for a `plugin-fs` call.
 *
 * App storage passes a base directory and a relative path. A chosen workspace
 * passes an absolute path and no base directory at all, so the key has to be
 * left out rather than set to `undefined`.
 */
const tauriOptions = (root: TauriDirectoryReference) =>
  root.baseDir === undefined ? {} : { baseDir: root.baseDir };

/**
 * Hands a folder to the backend for approval and turns it into a root handle.
 *
 * The backend resolves symlinks, widens the desktop filesystem scope, and
 * creates the `.notara` sidecar. Calling this again with the same path is how
 * the app reconnects after a restart.
 */
const approveTauriWorkspace = async (path: string): Promise<TauriDirectoryReference> => {
  const approved = await approveWorkspace(path);
  return {
    kind: 'tauri',
    name: approved.name,
    path: approved.path,
    source: 'workspace',
  };
};

const persistTauriDirectory = async (handle: TauriDirectoryReference): Promise<void> => {
  if (handle.source === 'workspace') {
    persistWorkspacePath(handle.path);
    return;
  }

  clearPersistedWorkspacePath();
};

const clearPersistedTauriDirectory = async (): Promise<void> => {
  if (!isBrowserEnvironment) {
    return;
  }

  clearPersistedWorkspacePath();
  await forgetWorkspace().catch((error) => {
    console.error('Failed to clear the approved workspace', error);
  });
};

const getBrowserDirectoryHandle = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  create = false
): Promise<FileSystemDirectoryHandle> => {
  let current = root;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create });
  }
  return current;
};

const getBrowserFileHandle = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  create = false
): Promise<FileSystemFileHandle> => {
  const directories = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];
  const directory = directories.length
    ? await getBrowserDirectoryHandle(root, directories, create)
    : root;
  return directory.getFileHandle(fileName, { create });
};

const resolveTauriPath = async (rootPath: string, segments: string[]): Promise<string> => {
  if (!segments.length) {
    return rootPath;
  }
  return join(rootPath, ...segments);
};

const ensureTauriPath = async (
  root: TauriDirectoryReference,
  segments: string[]
): Promise<void> => {
  const targetPath = await resolveTauriPath(root.path, segments);
  await tauriMkdir(targetPath, { recursive: true, ...tauriOptions(root) });
};

const writeBrowserJSON = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  data: unknown
): Promise<void> => {
  const fileHandle = await getBrowserFileHandle(root, segments, true);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
};

const writeBrowserText = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  contents: string
): Promise<void> => {
  const fileHandle = await getBrowserFileHandle(root, segments, true);
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const writeBrowserBlob = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  contents: Blob
): Promise<void> => {
  const fileHandle = await getBrowserFileHandle(root, segments, true);
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const readBrowserJSON = async <T>(
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<T | null> => {
  try {
    const fileHandle = await getBrowserFileHandle(root, segments, false);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if ((error as DOMException)?.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
};

const listBrowserDirectoryEntries = async (
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<string[]> => {
  try {
    const directory = await getBrowserDirectoryHandle(root, segments, false);
    const results: string[] = [];
    for await (const [name] of directory.entries()) {
      results.push(name);
    }
    return results;
  } catch (error) {
    if ((error as DOMException)?.name === 'NotFoundError') {
      return [];
    }
    throw error;
  }
};

const deleteBrowserEntry = async (
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<void> => {
  try {
    const directories = segments.slice(0, -1);
    const entryName = segments[segments.length - 1];
    const directory = directories.length
      ? await getBrowserDirectoryHandle(root, directories, false)
      : root;
    await directory.removeEntry(entryName);
  } catch (error) {
    if ((error as DOMException)?.name === 'NotFoundError') {
      return;
    }
    throw error;
  }
};

const selectBrowserDirectory = async (): Promise<BrowserDirectoryReference | null> => {
  if (!supportsBrowserFileSystem()) {
    return null;
  }

  const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return {
    kind: 'browser',
    name: directoryHandle.name,
    handle: directoryHandle,
  };
};

/**
 * Opens the native folder picker and approves whatever the user chooses.
 *
 * Returning `null` covers a cancelled dialog, which is a normal outcome rather
 * than an error, so the caller leaves the current workspace alone.
 */
const selectTauriDirectory = async (): Promise<TauriDirectoryReference | null> => {
  const selected = await openSystemDialog({
    directory: true,
    multiple: false,
    recursive: false,
    title: 'Choose your Notara workspace folder',
  });

  if (typeof selected !== 'string' || !selected) {
    return null;
  }

  return approveTauriWorkspace(selected);
};

export const fileSystemHelpers = {
  isSupported: () => isTauriEnvironment() || supportsBrowserFileSystem(),

  isTauriEnvironment,

  selectDirectory: async (): Promise<RootDirectoryHandle | null> => {
    if (isTauriEnvironment()) {
      return selectTauriDirectory();
    }

    return selectBrowserDirectory();
  },

  persistDirectoryHandle: async (root: RootDirectoryHandle): Promise<void> => {
    if (root.kind === 'tauri') {
      await persistTauriDirectory(root);
      return;
    }

    await persistBrowserDirectoryHandle(root.handle);
  },

  retrieveDirectoryHandle: async (): Promise<RootDirectoryHandle | null> => {
    if (isTauriEnvironment()) {
      const savedPath = retrievePersistedWorkspacePath();
      if (savedPath) {
        try {
          return await approveTauriWorkspace(savedPath);
        } catch (error) {
          // A workspace can be renamed, unmounted, or deleted between runs.
          // Forgetting it and falling back to app storage keeps Notara usable
          // instead of leaving it stuck on a folder that is no longer there.
          console.error('The saved workspace folder is unavailable', error);
          clearPersistedWorkspacePath();
        }
      }

      return getDefaultTauriDirectory();
    }

    const browserHandle = await retrievePersistedBrowserDirectoryHandle();
    if (!browserHandle) {
      return null;
    }

    return {
      kind: 'browser',
      name: browserHandle.name,
      handle: browserHandle,
    };
  },

  clearPersistedDirectoryHandle: async (): Promise<void> => {
    if (isTauriEnvironment()) {
      await clearPersistedTauriDirectory();
      return;
    }

    await clearPersistedBrowserDirectoryHandle();
  },

  ensureDataDirectory: async (root: RootDirectoryHandle) => {
    await fileSystemHelpers.ensurePath(root, [DATA_DIRECTORY]);
  },

  ensurePath: async (root: RootDirectoryHandle, segments: string[]): Promise<void> => {
    if (root.kind === 'tauri') {
      await ensureTauriPath(root, segments);
      return;
    }

    await getBrowserDirectoryHandle(root.handle, segments, true);
  },

  writeJSON: async (root: RootDirectoryHandle, segments: string[], data: unknown): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root, segments.slice(0, -1));
      await writeTextFile(targetPath, JSON.stringify(data, null, 2), tauriOptions(root));
      return;
    }

    await writeBrowserJSON(root.handle, segments, data);
  },

  writeText: async (root: RootDirectoryHandle, segments: string[], contents: string): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root, segments.slice(0, -1));
      await writeTextFile(targetPath, contents, tauriOptions(root));
      return;
    }

    await writeBrowserText(root.handle, segments, contents);
  },

  writeBlob: async (root: RootDirectoryHandle, segments: string[], contents: Blob): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root, segments.slice(0, -1));
      await writeFile(targetPath, new Uint8Array(await contents.arrayBuffer()), tauriOptions(root));
      return;
    }

    await writeBrowserBlob(root.handle, segments, contents);
  },

  readJSON: async <T>(root: RootDirectoryHandle, segments: string[]): Promise<T | null> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const fileExists = await tauriExists(targetPath, tauriOptions(root));
      if (!fileExists) {
        return null;
      }

      const text = await readTextFile(targetPath, tauriOptions(root));
      return JSON.parse(text) as T;
    }

    return readBrowserJSON<T>(root.handle, segments);
  },

  /** Reads a file as a blob, returning null when it is not there. */
  readBlob: async (root: RootDirectoryHandle, segments: string[]): Promise<Blob | null> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const fileExists = await tauriExists(targetPath, tauriOptions(root));
      if (!fileExists) {
        return null;
      }

      const bytes = await tauriReadFile(targetPath, tauriOptions(root));
      return new Blob([bytes as BlobPart]);
    }

    try {
      const fileHandle = await getBrowserFileHandle(root.handle, segments, false);
      return await fileHandle.getFile();
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  },

  listDirectoryEntries: async (root: RootDirectoryHandle, segments: string[]): Promise<string[]> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const directoryExists = await tauriExists(targetPath, tauriOptions(root));
      if (!directoryExists) {
        return [];
      }

      const entries = await tauriReadDir(targetPath, tauriOptions(root));
      return entries.map((entry) => entry.name).filter((name): name is string => Boolean(name));
    }

    return listBrowserDirectoryEntries(root.handle, segments);
  },

  deleteEntry: async (root: RootDirectoryHandle, segments: string[]): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const targetExists = await tauriExists(targetPath, tauriOptions(root));
      if (!targetExists) {
        return;
      }

      await tauriRemove(targetPath, { recursive: true, ...tauriOptions(root) });
      return;
    }

    await deleteBrowserEntry(root.handle, segments);
  },

  requestReadWritePermission: async (root: RootDirectoryHandle): Promise<PermissionState> => {
    if (root.kind === 'tauri') {
      return 'granted';
    }

    const options = { mode: 'readwrite' as const };
    const permission = await root.handle.queryPermission(options);
    if (permission === 'granted') {
      return permission;
    }

    return root.handle.requestPermission(options);
  },

  directoryExists: async (root: RootDirectoryHandle): Promise<boolean> => {
    if (root.kind === 'tauri') {
      return tauriExists(root.path, tauriOptions(root));
    }

    try {
      await root.handle.queryPermission({ mode: 'readwrite' });
      return true;
    } catch {
      return false;
    }
  },
};

export type { FileSystemDirectoryHandle, FileSystemFileHandle };
