import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NotesBundle, RootDirectoryHandle } from '@/lib/filesystem';
import { fileSystemHelpers } from '@/lib/filesystem';
import {
  AI_CONVERSATIONS_JSON_PATH,
  inferFileExtension,
  LEGACY_NOTES_BUNDLE_PATH,
  LEGACY_TODOS_PATH,
  LEGACY_VISION_BOARDS_PATH,
  NOTES_JSON_PATH,
  REQUIRED_DIRECTORIES,
  sanitizeFileSegment,
  TAGS_JSON_PATH,
} from '@/lib/filesystem/paths';
import {
  ensureSidecarDirectories,
  relocateLegacyNotaraFiles,
  relocationHappened,
  SIDECAR_MEDIA_DIRECTORY,
  SIDECAR_TODOS_PATH,
  SIDECAR_VISION_BOARDS_PATH,
} from '@/lib/workspace/sidecar';
import type { AiConversationSnapshot, Note, NoteTag, TodoList, VisionBoard } from '@/types';

type FileSystemStatus = import('@/lib/filesystem').FileSystemStatus;

interface FileSystemContextValue {
  status: FileSystemStatus;
  isSupported: boolean;
  rootHandle: RootDirectoryHandle | null;
  lastError: string | null;
  selectDirectory: () => Promise<boolean>;
  reconnectToPersisted: () => Promise<boolean>;
  forgetDirectory: () => Promise<void>;
  saveNotesBundle: (bundle: NotesBundle) => Promise<void>;
  loadNotesBundle: () => Promise<NotesBundle | null>;
  saveTodos: (todos: TodoList[]) => Promise<void>;
  loadTodos: () => Promise<TodoList[] | null>;
  saveAiConversations: (conversations: AiConversationSnapshot[]) => Promise<void>;
  loadAiConversations: () => Promise<AiConversationSnapshot[] | null>;
  flushCachedAiConversations: () => Promise<void>;
  saveGeneratedImage: (blob: Blob, options?: { fileNamePrefix?: string; mimeType?: string }) => Promise<string | null>;
}

const FileSystemContext = createContext<FileSystemContextValue | undefined>(undefined);

const isFileSystemSupported = () => fileSystemHelpers.isSupported();

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supported = isFileSystemSupported();
  const [status, setStatus] = useState<FileSystemStatus>(supported ? 'uninitialized' : 'unsupported');
  const [rootHandle, setRootHandle] = useState<RootDirectoryHandle | null>(null);
  const [persistedHandle, setPersistedHandle] = useState<RootDirectoryHandle | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const aiArchiveCacheRef = useRef<AiConversationSnapshot[] | null>(null);

  /**
   * Creates everything a workspace needs before anything reads or writes.
   *
   * `.notara` is created here rather than lazily on the first pin, so every
   * later stage can assume it exists. The relocation pass then copies Notara's
   * own files out of the old `data/` layout, leaving the originals in place for
   * the stage 5 migration to deal with.
   */
  const ensureProjectStructure = useCallback(async (handle: RootDirectoryHandle) => {
    await fileSystemHelpers.ensureDataDirectory(handle);
    for (const path of REQUIRED_DIRECTORIES) {
      await fileSystemHelpers.ensurePath(handle, path);
    }
    await ensureSidecarDirectories(handle);

    const relocated = await relocateLegacyNotaraFiles(handle);
    if (relocationHappened(relocated)) {
      console.info('Moved Notara files into .notara', relocated);
    }
  }, []);

  const prepareHandle = useCallback(async (handle: RootDirectoryHandle) => {
    try {
      if (!fileSystemHelpers.isTauriEnvironment()) {
        await navigator.storage?.persist?.().catch(() => undefined);
      }
      await ensureProjectStructure(handle);
      setRootHandle(handle);
      setStatus('ready');
      setLastError(null);
    } catch (error) {
      console.error('Failed to prepare directory handle', error);
      setLastError((error as Error).message ?? 'Failed to prepare directory handle');
      setStatus('error');
    }
  }, [ensureProjectStructure]);

  const initialiseFromPersisted = useCallback(async () => {
    if (!supported || initializingRef.current) {
      return;
    }
    initializingRef.current = true;
    try {
      const savedHandle = await fileSystemHelpers.retrieveDirectoryHandle();
      if (!savedHandle) {
        setStatus('no-directory');
        setPersistedHandle(null);
        return;
      }
      setPersistedHandle(savedHandle);
      const permission = await fileSystemHelpers.requestReadWritePermission(savedHandle);
      if (permission === 'granted') {
        await prepareHandle(savedHandle);
      } else {
        setStatus('needs-permission');
      }
    } catch (error) {
      console.error('Error restoring directory handle', error);
      setLastError((error as Error).message ?? 'Unknown error restoring directory handle');
      setStatus('error');
    } finally {
      initializingRef.current = false;
    }
  }, [prepareHandle, supported]);

  useEffect(() => {
    if (!supported) {
      setStatus('unsupported');
      return;
    }
    void initialiseFromPersisted();
  }, [initialiseFromPersisted, supported]);

  const selectDirectory = useCallback(async (): Promise<boolean> => {
    if (!supported) {
      setLastError('File system access is not supported in this browser.');
      setStatus('unsupported');
      return false;
    }
    try {
      const directoryHandle = await fileSystemHelpers.selectDirectory();
      if (!directoryHandle) {
        return false;
      }
      const permission = await fileSystemHelpers.requestReadWritePermission(directoryHandle);
      if (permission !== 'granted') {
        setStatus('needs-permission');
        setLastError('Permission denied for selected directory.');
        return false;
      }
      await fileSystemHelpers.persistDirectoryHandle(directoryHandle);
      setPersistedHandle(directoryHandle);
      await prepareHandle(directoryHandle);
      return true;
    } catch (error) {
      const domError = error as DOMException;
      if (domError?.name === 'AbortError') {
        return false;
      }
      console.error('Error selecting directory', error);
      setLastError(domError?.message ?? 'Unable to select directory');
      setStatus('error');
      return false;
    }
  }, [prepareHandle, supported]);

  const reconnectToPersisted = useCallback(async (): Promise<boolean> => {
    if (!persistedHandle) {
      await initialiseFromPersisted();
      return fileSystemHelpers.isTauriEnvironment();
    }
    try {
      const exists = await fileSystemHelpers.directoryExists(persistedHandle);
      if (!exists) {
        await fileSystemHelpers.clearPersistedDirectoryHandle();
        const fallbackHandle = await fileSystemHelpers.retrieveDirectoryHandle();

        if (fallbackHandle) {
          setPersistedHandle(fallbackHandle);
          await prepareHandle(fallbackHandle);
          setLastError('The previously selected Notara folder is no longer available. Notara switched to app storage.');
          return true;
        }

        setPersistedHandle(null);
        setRootHandle(null);
        setStatus('no-directory');
        setLastError('The previously selected Notara folder is no longer available.');
        return false;
      }

      const permission = await fileSystemHelpers.requestReadWritePermission(persistedHandle);
      if (permission !== 'granted') {
        setStatus('needs-permission');
        setLastError('Permission to access the stored Notara directory is required.');
        return false;
      }
      await prepareHandle(persistedHandle);
      return true;
    } catch (error) {
      console.error('Error reconnecting to persisted directory handle', error);
      setLastError((error as Error).message ?? 'Unable to reconnect to directory');
      setStatus('error');
      return false;
    }
  }, [initialiseFromPersisted, persistedHandle, prepareHandle]);

  const forgetDirectory = useCallback(async () => {
    await fileSystemHelpers.clearPersistedDirectoryHandle();
    if (fileSystemHelpers.isTauriEnvironment()) {
      const fallbackHandle = await fileSystemHelpers.retrieveDirectoryHandle();
      if (fallbackHandle) {
        setPersistedHandle(fallbackHandle);
        await prepareHandle(fallbackHandle);
        return;
      }
    }

    setRootHandle(null);
    setPersistedHandle(null);
    setStatus('no-directory');
  }, [prepareHandle]);

  /**
   * Writes the workspace's tags and vision boards.
   *
   * Notes are not written here any more. Each note is a Markdown file that
   * saves itself, so rewriting the whole set from a snapshot would undo
   * edits made outside Notara since that snapshot was taken.
   *
   * The `note-{uuid}.md` mirror this used to keep is gone with it. That
   * mirror deleted any Markdown file in its directory that it had not
   * generated, which is not something that may ever run in a folder the
   * user owns.
   */
  const saveNotesBundle = useCallback(
    async (bundle: NotesBundle) => {
      if (!rootHandle) {
        return;
      }
      try {
        await Promise.all([
          fileSystemHelpers.writeJSON(rootHandle, TAGS_JSON_PATH, bundle.tags),
          fileSystemHelpers.writeJSON(rootHandle, SIDECAR_VISION_BOARDS_PATH, bundle.visionBoards),
        ]);
      } catch (error) {
        console.error('Failed to write notes bundle', error);
        setLastError((error as Error).message ?? 'Failed to save notes');
        throw error;
      }
    },
    [rootHandle]
  );

  const loadNotesBundle = useCallback(async (): Promise<NotesBundle | null> => {
    if (!rootHandle) {
      return null;
    }
    try {
      const [notes, tags, sidecarBoards] = await Promise.all([
        fileSystemHelpers.readJSON<Note[]>(rootHandle, NOTES_JSON_PATH),
        fileSystemHelpers.readJSON<NoteTag[]>(rootHandle, TAGS_JSON_PATH),
        fileSystemHelpers.readJSON<VisionBoard[]>(rootHandle, SIDECAR_VISION_BOARDS_PATH),
      ]);

      // Relocation runs on selection, so the sidecar copy is normally there.
      // The old path is still read for a workspace that has not been prepared
      // yet, which is what keeps boards visible instead of silently empty.
      const visionBoards =
        sidecarBoards ??
        (await fileSystemHelpers.readJSON<VisionBoard[]>(rootHandle, LEGACY_VISION_BOARDS_PATH));

      if (!notes && !tags && !visionBoards) {
        const legacy = await fileSystemHelpers.readJSON<NotesBundle>(rootHandle, LEGACY_NOTES_BUNDLE_PATH);
        if (legacy) {
          return legacy;
        }
        return null;
      }

      return {
        notes: notes ?? [],
        tags: tags ?? [],
        visionBoards: visionBoards ?? [],
      };
    } catch (error) {
      console.error('Failed to read notes bundle', error);
      setLastError((error as Error).message ?? 'Failed to load notes');
      return null;
    }
  }, [rootHandle]);

  const saveTodos = useCallback(
    async (todos: TodoList[]) => {
      if (!rootHandle) {
        return;
      }
      try {
        await fileSystemHelpers.writeJSON(rootHandle, SIDECAR_TODOS_PATH, todos);
      } catch (error) {
        console.error('Failed to write todos', error);
        setLastError((error as Error).message ?? 'Failed to save todos');
        throw error;
      }
    },
    [rootHandle]
  );

  const loadTodos = useCallback(async (): Promise<TodoList[] | null> => {
    if (!rootHandle) {
      return null;
    }
    try {
      const stored = await fileSystemHelpers.readJSON<TodoList[]>(rootHandle, SIDECAR_TODOS_PATH);
      if (stored) {
        return stored;
      }

      return fileSystemHelpers.readJSON<TodoList[]>(rootHandle, LEGACY_TODOS_PATH);
    } catch (error) {
      console.error('Failed to read todos', error);
      setLastError((error as Error).message ?? 'Failed to load todos');
      return null;
    }
  }, [rootHandle]);

  const saveAiConversations = useCallback(
    async (conversations: AiConversationSnapshot[]) => {
      const trimmed = conversations.slice(0, 20);
      aiArchiveCacheRef.current = trimmed;
      if (!rootHandle) {
        return;
      }
      try {
        await fileSystemHelpers.writeJSON(rootHandle, AI_CONVERSATIONS_JSON_PATH, trimmed);
      } catch (error) {
        console.error('Failed to write AI conversations', error);
        setLastError((error as Error).message ?? 'Failed to save AI assistant history');
        throw error;
      }
    },
    [rootHandle]
  );

  const loadAiConversations = useCallback(async (): Promise<AiConversationSnapshot[] | null> => {
    if (!rootHandle) {
      return null;
    }
    try {
      const stored = await fileSystemHelpers.readJSON<AiConversationSnapshot[]>(rootHandle, AI_CONVERSATIONS_JSON_PATH);
      if (stored) {
        const trimmed = stored.slice(0, 20);
        aiArchiveCacheRef.current = trimmed;
        return trimmed;
      }
      return stored;
    } catch (error) {
      console.error('Failed to read AI conversations', error);
      setLastError((error as Error).message ?? 'Failed to load AI assistant history');
      return null;
    }
  }, [rootHandle]);

  const flushCachedAiConversations = useCallback(async () => {
    if (!rootHandle || !aiArchiveCacheRef.current) {
      return;
    }
    await saveAiConversations(aiArchiveCacheRef.current);
  }, [rootHandle, saveAiConversations]);

  const saveGeneratedImage = useCallback(
    async (
      blob: Blob,
      options?: { fileNamePrefix?: string; mimeType?: string }
    ): Promise<string | null> => {
      if (!rootHandle) {
        return null;
      }

      try {
        await fileSystemHelpers.ensurePath(rootHandle, SIDECAR_MEDIA_DIRECTORY);

        const filePrefix = sanitizeFileSegment(options?.fileNamePrefix ?? 'ai-image');
        const extension = inferFileExtension(options?.mimeType ?? blob.type);
        const fileName = `${filePrefix}-${Date.now()}.${extension}`;

        await fileSystemHelpers.writeBlob(rootHandle, [...SIDECAR_MEDIA_DIRECTORY, fileName], blob);
        return `${SIDECAR_MEDIA_DIRECTORY.join('/')}/${fileName}`;
      } catch (error) {
        console.error('Failed to save generated image', error);
        setLastError((error as Error).message ?? 'Failed to save generated image');
        return null;
      }
    },
    [rootHandle]
  );

  const value = useMemo<FileSystemContextValue>(
    () => ({
      status,
      isSupported: supported,
      rootHandle,
      lastError,
      selectDirectory,
      reconnectToPersisted,
      forgetDirectory,
      saveNotesBundle,
      loadNotesBundle,
      saveTodos,
      loadTodos,
      saveAiConversations,
      loadAiConversations,
      flushCachedAiConversations,
      saveGeneratedImage,
    }),
    [
      forgetDirectory,
      flushCachedAiConversations,
      loadAiConversations,
      loadNotesBundle,
      loadTodos,
      lastError,
      rootHandle,
      saveAiConversations,
      saveNotesBundle,
      saveTodos,
      selectDirectory,
      status,
      supported,
      reconnectToPersisted,
      saveGeneratedImage,
    ]
  );

  return <FileSystemContext.Provider value={value}>{children}</FileSystemContext.Provider>;
};

export const useFileSystem = (): FileSystemContextValue => {
  const context = useContext(FileSystemContext);
  if (!context) {
    throw new Error('useFileSystem must be used within a FileSystemProvider');
  }
  return context;
};
