const DB_NAME = 'notara-filesystem';
const STORE_NAME = 'handles';
const KEY_ROOT = 'root-directory';

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

export const persistBrowserDirectoryHandle = async (
  handle: FileSystemDirectoryHandle
): Promise<void> => {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(handle, KEY_ROOT);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

export const retrievePersistedBrowserDirectoryHandle = async (): Promise<FileSystemDirectoryHandle | null> => {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(KEY_ROOT);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearPersistedBrowserDirectoryHandle = async (): Promise<void> => {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(KEY_ROOT);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

/**
 * The desktop build remembers its workspace as a plain path string.
 *
 * `tauri-plugin-persisted-scope` restores filesystem *access* across restarts,
 * but it does not tell Notara which folder was in use. That part is stored
 * here. The path is not a secret, so `localStorage` is the right amount of
 * machinery for it.
 */
const KEY_WORKSPACE_PATH = 'notara-workspace-path';

export const persistWorkspacePath = (path: string): void => {
  try {
    window.localStorage.setItem(KEY_WORKSPACE_PATH, path);
  } catch (error) {
    console.error('Failed to remember the workspace path', error);
  }
};

export const retrievePersistedWorkspacePath = (): string | null => {
  try {
    return window.localStorage.getItem(KEY_WORKSPACE_PATH);
  } catch {
    return null;
  }
};

export const clearPersistedWorkspacePath = (): void => {
  try {
    window.localStorage.removeItem(KEY_WORKSPACE_PATH);
  } catch (error) {
    console.error('Failed to forget the workspace path', error);
  }
};
