import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note, NoteTag, VisionBoard } from '../types';
import { NotesContext } from './NotesContextTypes';
import { useFileSystem } from './FileSystemContext';
import { useIntegrations } from './IntegrationContext';
import type { NotesBundle } from '@/lib/filesystem';

const defaultTags: NoteTag[] = [
  { id: '1', name: 'Personal', color: '#9b87f5' },
  { id: '2', name: 'Work', color: '#0EA5E9' },
  { id: '3', name: 'Ideas', color: '#10B981' },
  { id: '4', name: 'Important', color: '#F97316' },
];

const defaultNotes: Note[] = [
  {
    id: '1',
    title: 'Welcome to Notara',
    content: `# Welcome to Notara!

Notara is an AI assisted note-taking app and markdown editor designed to help you capture ideas, organize your thoughts, and visualize connections between your notes.

## Features
- Write in Markdown
- Organize with tags
- Visualize connections with Constellation View
- Create vision boards
- Use AI assistance

Get started by creating your first note!`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [defaultTags[0], defaultTags[2]],
    isPinned: true,
  },
  {
    id: '2',
    title: 'Markdown Cheat Sheet',
    content: `# Markdown Cheat Sheet

## Headers
# H1
## H2
### H3

## Emphasis
*italic*
**bold**
~~strikethrough~~

## Lists
- Item 1
- Item 2
  - Subitem

1. Item 1
2. Item 2

## Links & Images
[Link](https://example.com)
![Image Alt](https://example.com/image.jpg)

## Code
\`inline code\`

\`\`\`
// code block
function hello() {
  console.log("Hello Notara!");
}
\`\`\`

## Blockquotes
> This is a blockquote

## Tables
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [defaultTags[2]],
    isPinned: false,
  },
];

const defaultVisionBoards: VisionBoard[] = [
  {
    id: '1',
    name: 'Project Inspiration',
    items: [
      {
        id: '1',
        type: 'image',
        content: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158',
        position: { x: 50, y: 50 },
        size: { width: 200, height: 150 },
      },
      {
        id: '2',
        type: 'text',
        content: 'Key project goals for Q3',
        position: { x: 300, y: 100 },
      },
    ],
  },
];

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, loadNotesBundle, saveNotesBundle } = useFileSystem();
  const integrations = useIntegrations();
  const [notes, setNotes] = useState<Note[]>(defaultNotes);
  const [tags, setTags] = useState<NoteTag[]>(defaultTags);
  const [visionBoards, setVisionBoards] = useState<VisionBoard[]>(defaultVisionBoards);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isInitialised, setIsInitialised] = useState(false);

  const notesRef = useRef(notes);
  const tagsRef = useRef(tags);
  const visionBoardsRef = useRef(visionBoards);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  useEffect(() => {
    visionBoardsRef.current = visionBoards;
  }, [visionBoards]);

  const isBrowser = typeof window !== 'undefined';

  const loadFromLocalStorage = useCallback((): NotesBundle => {
    if (!isBrowser) {
      return { notes: defaultNotes, tags: defaultTags, visionBoards: defaultVisionBoards };
    }
    try {
      const storedNotes = window.localStorage.getItem('notara-notes');
      const storedTags = window.localStorage.getItem('notara-tags');
      const storedVisionBoards = window.localStorage.getItem('notara-visionboards');
      return {
        notes: storedNotes ? JSON.parse(storedNotes) : defaultNotes,
        tags: storedTags ? JSON.parse(storedTags) : defaultTags,
        visionBoards: storedVisionBoards ? JSON.parse(storedVisionBoards) : defaultVisionBoards,
      };
    } catch (error) {
      console.error('Failed to load notes from localStorage', error);
      return { notes: defaultNotes, tags: defaultTags, visionBoards: defaultVisionBoards };
    }
  }, [isBrowser]);

  const persistToLocalStorage = useCallback((bundle: NotesBundle) => {
    if (!isBrowser) {
      return;
    }
    try {
      window.localStorage.setItem('notara-notes', JSON.stringify(bundle.notes));
      window.localStorage.setItem('notara-tags', JSON.stringify(bundle.tags));
      window.localStorage.setItem('notara-visionboards', JSON.stringify(bundle.visionBoards));
    } catch (error) {
      console.error('Failed to persist notes to localStorage', error);
    }
  }, [isBrowser]);

  const getCurrentBundle = useCallback((): NotesBundle => ({
    notes: notesRef.current,
    tags: tagsRef.current,
    visionBoards: visionBoardsRef.current,
  }), []);

  const persistBundle = useCallback(async (bundle?: NotesBundle) => {
    const snapshot = bundle ?? getCurrentBundle();

    // Save to filesystem or localStorage
    if (status === 'ready') {
      try {
        await saveNotesBundle(snapshot);
      } catch (error) {
        persistToLocalStorage(snapshot);
        throw error;
      }
      persistToLocalStorage(snapshot);
    } else {
      persistToLocalStorage(snapshot);
    }

    // Trigger integration sync if enabled
    if (integrations.areIntegrationsEnabled() && integrations.isInitialized) {
      const providers = Array.from(integrations.integrations.keys());
      for (const provider of providers) {
        const state = integrations.getIntegrationState(provider);
        if (state?.status === 'connected' && state?.isEnabled) {
          if (provider === 'github') {
            const repoConfigured = Boolean(state.config?.repoOwner && state.config?.repoName);
            if (!repoConfigured) {
              continue;
            }
          }
          // Trigger background sync - don't await to prevent blocking
          integrations.manualSync(provider).catch(error => {
            console.error(`[Sync] Background sync failed for ${provider}:`, error);
          });
        }
      }
    }
  }, [getCurrentBundle, persistToLocalStorage, saveNotesBundle, status, integrations]);

  useEffect(() => {
    if (status === 'uninitialized') {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsInitialised(false);

      if (status === 'ready') {
        try {
          const bundle = (await loadNotesBundle()) || {
            notes: defaultNotes,
            tags: defaultTags,
            visionBoards: defaultVisionBoards,
          };
          if (cancelled) {
            return;
          }
          setNotes(bundle.notes?.length ? bundle.notes : defaultNotes);
          setTags(bundle.tags?.length ? bundle.tags : defaultTags);
          setVisionBoards(bundle.visionBoards?.length ? bundle.visionBoards : defaultVisionBoards);
        } catch (error) {
          console.error('Falling back to local storage after FS load failure', error);
          const localBundle = loadFromLocalStorage();
          if (cancelled) {
            return;
          }
          setNotes(localBundle.notes?.length ? localBundle.notes : defaultNotes);
          setTags(localBundle.tags?.length ? localBundle.tags : defaultTags);
          setVisionBoards(localBundle.visionBoards?.length ? localBundle.visionBoards : defaultVisionBoards);
        }
      } else {
        const localBundle = loadFromLocalStorage();
        if (cancelled) {
          return;
        }
        setNotes(localBundle.notes?.length ? localBundle.notes : defaultNotes);
        setTags(localBundle.tags?.length ? localBundle.tags : defaultTags);
        setVisionBoards(localBundle.visionBoards?.length ? localBundle.visionBoards : defaultVisionBoards);
      }

      if (!cancelled) {
        setIsInitialised(true);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loadFromLocalStorage, loadNotesBundle, status]);

  useEffect(() => {
    if (!isInitialised) {
      return;
    }

    void persistBundle().catch((error) => {
      console.error('Error saving notes bundle to filesystem', error);
    });
  }, [isInitialised, notes, tags, visionBoards, persistBundle]);

  const addNote = (note: Partial<Note>) => {
    const now = new Date().toISOString();
    const newNote: Note = {
      id: uuidv4(),
      title: note.title || 'Untitled',
      content: note.content || '',
      createdAt: note.createdAt || now,
      updatedAt: now,
      tags: note.tags || [],
      isPinned: note.isPinned || false,
    };

    setNotes((prevNotes) => [...prevNotes, newNote]);
    return newNote;
  };

  const updateNote = (id: string, note: Partial<Note>) => {
    let updatedNote: Note | null = null;

    setNotes((prevNotes) =>
      prevNotes.map((existing) => {
        if (existing.id !== id) {
          return existing;
        }
        updatedNote = {
          ...existing,
          ...note,
          updatedAt: new Date().toISOString(),
        };
        return updatedNote;
      })
    );

    if (updatedNote && activeNote?.id === id) {
      setActiveNote(updatedNote);
    }

    return updatedNote;
  };

  const deleteNote = (id: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
    if (activeNote?.id === id) {
      setActiveNote(null);
    }
  };

  const togglePin = (id: string) => {
    let updatedNote: Note | null = null;
    setNotes((prevNotes) =>
      prevNotes.map((existing) => {
        if (existing.id !== id) {
          return existing;
        }
        updatedNote = {
          ...existing,
          isPinned: !existing.isPinned,
          updatedAt: new Date().toISOString(),
        };
        return updatedNote;
      })
    );

    if (updatedNote && activeNote?.id === id) {
      setActiveNote(updatedNote);
    }
  };

  const addTag = (tag: Partial<NoteTag>) => {
    const newTag: NoteTag = {
      id: uuidv4(),
      name: tag.name || 'New Tag',
      color: tag.color || '#9b87f5',
    };
    setTags((prevTags) => [...prevTags, newTag]);
  };

  const updateTag = (id: string, tag: Partial<NoteTag>) => {
    setTags((prevTags) =>
      prevTags.map((existing) => (existing.id === id ? { ...existing, ...tag } : existing))
    );
  };

  const deleteTag = (id: string) => {
    setTags((prevTags) => prevTags.filter((tag) => tag.id !== id));
    setNotes((prevNotes) =>
      prevNotes.map((note) => ({
        ...note,
        tags: note.tags.filter((tag) => tag.id !== id),
      }))
    );
  };

  const addVisionBoard = (visionBoard: Partial<VisionBoard>) => {
    const newVisionBoard: VisionBoard = {
      id: uuidv4(),
      name: visionBoard.name || 'New Vision Board',
      items: visionBoard.items || [],
    };
    setVisionBoards((prevVisionBoards) => [...prevVisionBoards, newVisionBoard]);
    return newVisionBoard;
  };

  const updateVisionBoard = (id: string, visionBoard: Partial<VisionBoard>) => {
    setVisionBoards((prevVisionBoards) =>
      prevVisionBoards.map((existing) => (existing.id === id ? { ...existing, ...visionBoard } : existing))
    );
  };

  const deleteVisionBoard = (id: string) => {
    setVisionBoards((prevVisionBoards) => prevVisionBoards.filter((board) => board.id !== id));
  };

  return (
    <NotesContext.Provider
      value={{
        notes,
        tags,
        visionBoards,
        activeNote,
        addNote,
        updateNote,
        deleteNote,
        togglePin,
        addTag,
        updateTag,
        deleteTag,
        setActiveNote,
        addVisionBoard,
        updateVisionBoard,
        deleteVisionBoard,
        getCurrentBundle,
        persistBundle,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export default NotesProvider;
