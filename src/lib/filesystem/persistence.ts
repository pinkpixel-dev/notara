const DB_NAME = 'notara-filesystem';
const STORE_NAME = 'handles';
const KEY_ROOT = 'root-directory';

type DirectoryHandle = FileSystemDirectoryHandle;

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

export const persistDirectoryHandle = async (handle: DirectoryHandle): Promise<void> => {
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

export const retrieveDirectoryHandle = async (): Promise<DirectoryHandle | null> => {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(KEY_ROOT);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result ?? null);
    };
    request.onerror = () => reject(request.error);
  });
};

export const clearPersistedDirectoryHandle = async (): Promise<void> => {
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

