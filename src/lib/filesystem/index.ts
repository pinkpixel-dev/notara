import type { Note, NoteTag, VisionBoard } from '@/types';
import { clearPersistedDirectoryHandle, persistDirectoryHandle, retrieveDirectoryHandle } from './persistence';

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

const DATA_DIRECTORY = 'data';

const getDirectoryHandle = async (
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

const ensurePath = async (
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<FileSystemDirectoryHandle> => {
  return getDirectoryHandle(root, segments, true);
};

const getFileHandle = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  create = false
): Promise<FileSystemFileHandle> => {
  const directories = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];
  const directory = directories.length
    ? await getDirectoryHandle(root, directories, create)
    : root;
  return directory.getFileHandle(fileName, { create });
};

const writeJSON = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  data: unknown
): Promise<void> => {
  const fileHandle = await getFileHandle(root, segments, true);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
};

const writeText = async (
  root: FileSystemDirectoryHandle,
  segments: string[],
  contents: string
): Promise<void> => {
  const fileHandle = await getFileHandle(root, segments, true);
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const readJSON = async <T>(
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<T | null> => {
  try {
    const fileHandle = await getFileHandle(root, segments, false);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    const message = (error as DOMException)?.name ?? '';
    if (message === 'NotFoundError') {
      return null;
    }
    throw error;
  }
};

const listDirectoryEntries = async (
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<string[]> => {
  try {
    const directory = await getDirectoryHandle(root, segments, false);
    const results: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const [name] of directory.entries()) {
      results.push(name);
    }
    return results;
  } catch (error) {
    const message = (error as DOMException)?.name ?? '';
    if (message === 'NotFoundError') {
      return [];
    }
    throw error;
  }
};

const deleteEntry = async (
  root: FileSystemDirectoryHandle,
  segments: string[]
): Promise<void> => {
  try {
    const directories = segments.slice(0, -1);
    const entryName = segments[segments.length - 1];
    const directory = directories.length
      ? await getDirectoryHandle(root, directories, false)
      : root;
    await directory.removeEntry(entryName);
  } catch (error) {
    const message = (error as DOMException)?.name ?? '';
    if (message === 'NotFoundError') {
      return;
    }
    throw error;
  }
};

const requestReadWritePermission = async (
  handle: FileSystemDirectoryHandle
): Promise<PermissionState> => {
  const options = { mode: 'readwrite' as const };
  const permission = await handle.queryPermission(options);
  if (permission === 'granted') {
    return permission;
  }
  return handle.requestPermission(options);
};

export const fileSystemHelpers = {
  persistDirectoryHandle,
  retrieveDirectoryHandle,
  clearPersistedDirectoryHandle,
  ensureDataDirectory: async (root: FileSystemDirectoryHandle) => ensurePath(root, [DATA_DIRECTORY]),
  ensurePath,
  writeJSON,
  writeText,
  readJSON,
  listDirectoryEntries,
  deleteEntry,
  requestReadWritePermission,
};

export type { FileSystemDirectoryHandle, FileSystemFileHandle };
