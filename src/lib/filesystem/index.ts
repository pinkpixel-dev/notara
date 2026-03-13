import { homeDir, join } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import {
  exists as tauriExists,
  mkdir as tauriMkdir,
  readDir as tauriReadDir,
  readTextFile,
  remove as tauriRemove,
  writeFile,
  writeTextFile,
} from '@tauri-apps/plugin-fs';
import type { Note, NoteTag, VisionBoard } from '@/types';
import {
  clearPersistedBrowserDirectoryHandle,
  persistBrowserDirectoryHandle,
  retrievePersistedBrowserDirectoryHandle,
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
  path: string;
}

export type RootDirectoryHandle = BrowserDirectoryReference | TauriDirectoryReference;

interface PersistedTauriDirectoryRecord {
  kind: 'tauri';
  path: string;
  name: string;
}

const DATA_DIRECTORY = 'data';
const TAURI_DIRECTORY_STORAGE_KEY = 'notara-tauri-root-directory';

const isBrowserEnvironment = typeof window !== 'undefined';

const isTauriEnvironment = () =>
  isBrowserEnvironment && '__TAURI_INTERNALS__' in (window as Window & Record<string, unknown>);

const supportsBrowserFileSystem = () =>
  isBrowserEnvironment &&
  'showDirectoryPicker' in window &&
  'isSecureContext' in window &&
  window.isSecureContext;

const getDirectoryNameFromPath = (directoryPath: string): string => {
  const normalizedPath = directoryPath.replace(/[\\/]+$/, '');
  const parts = normalizedPath.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || 'Notara';
};

const getPersistedTauriDirectory = (): PersistedTauriDirectoryRecord | null => {
  if (!isBrowserEnvironment) {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(TAURI_DIRECTORY_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as PersistedTauriDirectoryRecord;
    if (parsed.kind !== 'tauri' || !parsed.path) {
      return null;
    }

    return {
      kind: 'tauri',
      path: parsed.path,
      name: parsed.name || getDirectoryNameFromPath(parsed.path),
    };
  } catch (error) {
    console.error('Failed to parse persisted Tauri directory', error);
    return null;
  }
};

const persistTauriDirectory = async (handle: TauriDirectoryReference): Promise<void> => {
  if (!isBrowserEnvironment) {
    return;
  }

  window.localStorage.setItem(
    TAURI_DIRECTORY_STORAGE_KEY,
    JSON.stringify({
      kind: 'tauri',
      path: handle.path,
      name: handle.name,
    } satisfies PersistedTauriDirectoryRecord)
  );
};

const clearPersistedTauriDirectory = async (): Promise<void> => {
  if (!isBrowserEnvironment) {
    return;
  }

  window.localStorage.removeItem(TAURI_DIRECTORY_STORAGE_KEY);
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

const ensureTauriPath = async (rootPath: string, segments: string[]): Promise<void> => {
  const targetPath = await resolveTauriPath(rootPath, segments);
  await tauriMkdir(targetPath, { recursive: true });
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

const selectTauriDirectory = async (): Promise<TauriDirectoryReference | null> => {
  const defaultPath = await homeDir().catch(() => undefined);
  const selected = await open({
    directory: true,
    multiple: false,
    defaultPath,
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return {
    kind: 'tauri',
    path: selected,
    name: getDirectoryNameFromPath(selected),
  };
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
      const stored = getPersistedTauriDirectory();
      if (!stored) {
        return null;
      }

      return {
        kind: 'tauri',
        path: stored.path,
        name: stored.name,
      };
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
      await ensureTauriPath(root.path, segments);
      return;
    }

    await getBrowserDirectoryHandle(root.handle, segments, true);
  },

  writeJSON: async (root: RootDirectoryHandle, segments: string[], data: unknown): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root.path, segments.slice(0, -1));
      await writeTextFile(targetPath, JSON.stringify(data, null, 2));
      return;
    }

    await writeBrowserJSON(root.handle, segments, data);
  },

  writeText: async (root: RootDirectoryHandle, segments: string[], contents: string): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root.path, segments.slice(0, -1));
      await writeTextFile(targetPath, contents);
      return;
    }

    await writeBrowserText(root.handle, segments, contents);
  },

  writeBlob: async (root: RootDirectoryHandle, segments: string[], contents: Blob): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      await ensureTauriPath(root.path, segments.slice(0, -1));
      await writeFile(targetPath, new Uint8Array(await contents.arrayBuffer()));
      return;
    }

    await writeBrowserBlob(root.handle, segments, contents);
  },

  readJSON: async <T>(root: RootDirectoryHandle, segments: string[]): Promise<T | null> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const fileExists = await tauriExists(targetPath);
      if (!fileExists) {
        return null;
      }

      const text = await readTextFile(targetPath);
      return JSON.parse(text) as T;
    }

    return readBrowserJSON<T>(root.handle, segments);
  },

  listDirectoryEntries: async (root: RootDirectoryHandle, segments: string[]): Promise<string[]> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const directoryExists = await tauriExists(targetPath);
      if (!directoryExists) {
        return [];
      }

      const entries = await tauriReadDir(targetPath);
      return entries.map((entry) => entry.name).filter((name): name is string => Boolean(name));
    }

    return listBrowserDirectoryEntries(root.handle, segments);
  },

  deleteEntry: async (root: RootDirectoryHandle, segments: string[]): Promise<void> => {
    if (root.kind === 'tauri') {
      const targetPath = await resolveTauriPath(root.path, segments);
      const targetExists = await tauriExists(targetPath);
      if (!targetExists) {
        return;
      }

      await tauriRemove(targetPath, { recursive: true });
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
      return tauriExists(root.path);
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
