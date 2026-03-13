import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { NotesBundle } from '@/lib/filesystem';
import { fileSystemHelpers } from '@/lib/filesystem';
import type { AiConversationSnapshot, Note, NoteTag, TodoList, VisionBoard } from '@/types';

type ContextDirectoryHandle = FileSystemDirectoryHandle;

type FileSystemStatus = import('@/lib/filesystem').FileSystemStatus;

interface FileSystemContextValue {
  status: FileSystemStatus;
  isSupported: boolean;
  rootHandle: ContextDirectoryHandle | null;
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

const isFileSystemSupported = () =>
  typeof window !== 'undefined' &&
  'showDirectoryPicker' in window &&
  'isSecureContext' in window &&
  window.isSecureContext;

const DATA_DIRECTORY = 'data';
const NOTES_JSON_PATH = [DATA_DIRECTORY, 'notes', 'notes.json'] as const;
const TAGS_JSON_PATH = [DATA_DIRECTORY, 'notes', 'tags.json'] as const;
const VISION_BOARDS_JSON_PATH = [DATA_DIRECTORY, 'vision-boards', 'vision-boards.json'] as const;
const LEGACY_NOTES_BUNDLE_PATH = [DATA_DIRECTORY, 'notes-bundle.json'] as const;
const NOTE_MARKDOWN_DIRECTORY = [DATA_DIRECTORY, 'notes', 'markdown'] as const;
const TODOS_JSON_PATH = [DATA_DIRECTORY, 'todos', 'todos.json'] as const;
const AI_CONVERSATIONS_JSON_PATH = [DATA_DIRECTORY, 'ai', 'conversations.json'] as const;
const MEDIA_DIRECTORY_PATH = [DATA_DIRECTORY, 'media'] as const;

const inferFileExtension = (mimeType?: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
};

const sanitizeFileSegment = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || 'image';
};

const REQUIRED_DIRECTORIES: string[][] = [
  [DATA_DIRECTORY],
  [DATA_DIRECTORY, 'notes'],
  [DATA_DIRECTORY, 'notes', 'markdown'],
  [DATA_DIRECTORY, 'vision-boards'],
  [DATA_DIRECTORY, 'todos'],
  [DATA_DIRECTORY, 'ai'],
  [DATA_DIRECTORY, 'media'],
  [DATA_DIRECTORY, 'settings'],
];

const noteMarkdownFileName = (note: Note): string => `note-${note.id}.md`;

const escapeYamlValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const formatTagList = (tags: NoteTag[]): string => {
  if (!tags.length) {
    return '[]';
  }
  const rendered = tags.map((tag) => `"${escapeYamlValue(tag.name)}"`).join(', ');
  return `[${rendered}]`;
};

const buildNoteMarkdown = (note: Note): string => {
  const metadata = [
    '---',
    `id: ${note.id}`,
    `title: "${escapeYamlValue(note.title || 'Untitled')}"`,
    `createdAt: ${note.createdAt}`,
    `updatedAt: ${note.updatedAt}`,
    `isPinned: ${note.isPinned}`,
    `tags: ${formatTagList(note.tags)}`,
    '---',
    '',
  ];

  return [...metadata, note.content || ''].join('\n');
};

export const FileSystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supported = isFileSystemSupported();
  const [status, setStatus] = useState<FileSystemStatus>(supported ? 'uninitialized' : 'unsupported');
  const [rootHandle, setRootHandle] = useState<ContextDirectoryHandle | null>(null);
  const [persistedHandle, setPersistedHandle] = useState<ContextDirectoryHandle | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const aiArchiveCacheRef = useRef<AiConversationSnapshot[] | null>(null);

  const ensureProjectStructure = useCallback(async (handle: ContextDirectoryHandle) => {
    await fileSystemHelpers.ensureDataDirectory(handle);
    for (const path of REQUIRED_DIRECTORIES) {
      await fileSystemHelpers.ensurePath(handle, path);
    }
  }, []);

  const prepareHandle = useCallback(async (handle: ContextDirectoryHandle) => {
    try {
      await navigator.storage?.persist?.().catch(() => undefined);
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
      const permission = await savedHandle.queryPermission({ mode: 'readwrite' });
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
      const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
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
      return false;
    }
    try {
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
    setRootHandle(null);
    setPersistedHandle(null);
    setStatus('no-directory');
    await fileSystemHelpers.clearPersistedDirectoryHandle();
  }, []);

  const syncNoteMarkdownFiles = useCallback(async (notes: Note[]) => {
    if (!rootHandle) {
      return;
    }
    try {
      await fileSystemHelpers.ensurePath(rootHandle, NOTE_MARKDOWN_DIRECTORY);
      const desiredFiles = new Map<string, string>();
      notes.forEach((note) => {
        desiredFiles.set(noteMarkdownFileName(note), buildNoteMarkdown(note));
      });

      const existingFiles = await fileSystemHelpers.listDirectoryEntries(rootHandle, NOTE_MARKDOWN_DIRECTORY);

      await Promise.all(
        Array.from(desiredFiles.entries()).map(([fileName, contents]) =>
          fileSystemHelpers.writeText(rootHandle, [...NOTE_MARKDOWN_DIRECTORY, fileName], contents)
        )
      );

      await Promise.all(
        existingFiles
          .filter((name) => !desiredFiles.has(name) && name.endsWith('.md'))
          .map((name) => fileSystemHelpers.deleteEntry(rootHandle, [...NOTE_MARKDOWN_DIRECTORY, name]))
      );
    } catch (error) {
      console.error('Failed to sync markdown files', error);
      setLastError((error as Error).message ?? 'Failed to write note files');
    }
  }, [rootHandle]);

  const saveNotesBundle = useCallback(
    async (bundle: NotesBundle) => {
      if (!rootHandle) {
        return;
      }
      try {
        await Promise.all([
          fileSystemHelpers.writeJSON(rootHandle, NOTES_JSON_PATH, bundle.notes),
          fileSystemHelpers.writeJSON(rootHandle, TAGS_JSON_PATH, bundle.tags),
          fileSystemHelpers.writeJSON(rootHandle, VISION_BOARDS_JSON_PATH, bundle.visionBoards),
          // Legacy bundle for backwards compatibility
          fileSystemHelpers.writeJSON(rootHandle, LEGACY_NOTES_BUNDLE_PATH, bundle),
        ]);
        await syncNoteMarkdownFiles(bundle.notes);
      } catch (error) {
        console.error('Failed to write notes bundle', error);
        setLastError((error as Error).message ?? 'Failed to save notes');
        throw error;
      }
    },
    [rootHandle, syncNoteMarkdownFiles]
  );

  const loadNotesBundle = useCallback(async (): Promise<NotesBundle | null> => {
    if (!rootHandle) {
      return null;
    }
    try {
      const [notes, tags, visionBoards] = await Promise.all([
        fileSystemHelpers.readJSON<Note[]>(rootHandle, NOTES_JSON_PATH),
        fileSystemHelpers.readJSON<NoteTag[]>(rootHandle, TAGS_JSON_PATH),
        fileSystemHelpers.readJSON<VisionBoard[]>(rootHandle, VISION_BOARDS_JSON_PATH),
      ]);

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
        await fileSystemHelpers.writeJSON(rootHandle, TODOS_JSON_PATH, todos);
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
      return await fileSystemHelpers.readJSON<TodoList[]>(rootHandle, TODOS_JSON_PATH);
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
        await fileSystemHelpers.ensurePath(rootHandle, MEDIA_DIRECTORY_PATH as unknown as string[]);

        const filePrefix = sanitizeFileSegment(options?.fileNamePrefix ?? 'ai-image');
        const extension = inferFileExtension(options?.mimeType ?? blob.type);
        const fileName = `${filePrefix}-${Date.now()}.${extension}`;

        await fileSystemHelpers.writeBlob(rootHandle, [...MEDIA_DIRECTORY_PATH, fileName], blob);
        return `data/media/${fileName}`;
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
