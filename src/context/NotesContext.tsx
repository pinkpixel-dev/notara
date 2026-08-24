import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Note, NoteTag, VisionBoard } from '../types';
import { NotesContext, PIN_LIMIT, type PinResult } from './NotesContextTypes';
import { useFileSystem } from './FileSystemContext';
import type { NotesBundle } from '@/lib/filesystem';
import { useNoteFiles, type NoteInput, type SaveOptions } from './notes/useNoteFiles';

/**
 * Notes, tags, and vision boards.
 *
 * Notes are Markdown files in the workspace and are handled by `useNoteFiles`.
 * Tags and vision boards are not documents, so they stay as JSON alongside the
 * workspace. That split is why this file no longer writes a notes bundle: the
 * notes half of it is the folder itself now.
 */

const defaultTags: NoteTag[] = [
  { id: '1', name: 'Personal', color: '#9b87f5' },
  { id: '2', name: 'Work', color: '#0EA5E9' },
  { id: '3', name: 'Ideas', color: '#10B981' },
  { id: '4', name: 'Important', color: '#F97316' },
];

const defaultVisionBoards: VisionBoard[] = [
  {
    id: '1',
    name: 'My Vision Board',
    items: [],
  },
];

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, saveNotesBundle, loadNotesBundle } = useFileSystem();

  const [tags, setTags] = useState<NoteTag[]>(defaultTags);
  const [visionBoards, setVisionBoards] = useState<VisionBoard[]>(defaultVisionBoards);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isInitialised, setIsInitialised] = useState(false);

  const files = useNoteFiles(tags);
  const { notes, createNote, createNotes, saveNote, moveNote: moveNoteFile, reloadNote: reloadNoteFile, removeNote } = files;

  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const visionBoardsRef = useRef(visionBoards);
  visionBoardsRef.current = visionBoards;
  // Read through a ref rather than a dependency, so the identity of the save
  // callback does not change on every note edit. It used to, which meant
  // editing one note rewrote the tag and vision board files as a side effect.
  const notesRef = useRef(notes);
  notesRef.current = notes;

  /**
   * Folds tags found inside note files into the stored list.
   *
   * A tag written into a file by hand should appear in the app, and it should
   * keep the same id and colour on the next load rather than being recreated.
   */
  useEffect(() => {
    if (files.discoveredTags.length === 0) {
      return;
    }

    setTags((previous) => {
      const known = new Set(previous.map((tag) => tag.name.toLowerCase()));
      const additions = files.discoveredTags.filter(
        (tag) => !known.has(tag.name.toLowerCase())
      );
      return additions.length === 0 ? previous : [...previous, ...additions];
    });
  }, [files.discoveredTags]);

  // Tags and vision boards still load from JSON. Notes are not read here any
  // more; the bundle's notes are only an input to the one-time migration.
  useEffect(() => {
    if (status === 'uninitialized') {
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setIsInitialised(false);

      if (status === 'ready') {
        try {
          const bundle = await loadNotesBundle();
          if (cancelled) {
            return;
          }
          setTags(bundle?.tags?.length ? bundle.tags : defaultTags);
          setVisionBoards(
            bundle?.visionBoards?.length ? bundle.visionBoards : defaultVisionBoards
          );
        } catch (error) {
          console.error('Failed to load tags and vision boards', error);
        }
      }

      if (!cancelled) {
        setIsInitialised(true);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loadNotesBundle, status]);

  const getCurrentBundle = useCallback(
    (): NotesBundle => ({
      notes: notesRef.current,
      tags: tagsRef.current,
      visionBoards: visionBoardsRef.current,
    }),
    []
  );

  /**
   * Writes tags and vision boards.
   *
   * Notes are not included. Each one saved itself to its own file when it
   * changed, and rewriting them from here would undo edits made outside Notara
   * between then and now.
   */
  const persistBundle = useCallback(
    async (bundle?: NotesBundle) => {
      if (status !== 'ready') {
        return;
      }
      const snapshot = bundle ?? getCurrentBundle();
      await saveNotesBundle(snapshot);
    },
    [getCurrentBundle, saveNotesBundle, status]
  );

  useEffect(() => {
    if (!isInitialised || status !== 'ready') {
      return;
    }

    void persistBundle().catch((error) => {
      console.error('Error saving tags and vision boards', error);
    });
  }, [isInitialised, tags, visionBoards, persistBundle, status]);

  const addNote = useCallback(
    async (note: Partial<Note> & { directory?: string }): Promise<Note> => {
      const created = await createNote(note as NoteInput);
      return created;
    },
    [createNote]
  );

  const addNotes = useCallback(
    (notes: Array<Partial<Note>>, directory = '') =>
      createNotes(notes as NoteInput[], directory),
    [createNotes]
  );

  const updateNote = useCallback(
    async (id: string, note: Partial<Note>, options?: SaveOptions): Promise<Note | null> => {
      const updated = await saveNote(id, note as NoteInput, options);
      if (updated) {
        setActiveNote((current) => (current?.id === id ? updated : current));
      }
      return updated;
    },
    [saveNote]
  );

  const moveNote = useCallback(
    async (id: string, directory: string): Promise<Note | null> => {
      const moved = await moveNoteFile(id, directory);
      if (moved) {
        setActiveNote((current) => (current?.id === id ? moved : current));
      }
      return moved;
    },
    [moveNoteFile]
  );

  const reloadNote = useCallback(
    async (id: string): Promise<Note | null> => {
      const fresh = await reloadNoteFile(id);
      if (fresh) {
        setActiveNote((current) => (current?.id === id ? fresh : current));
      }
      return fresh;
    },
    [reloadNoteFile]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await removeNote(id);
      setActiveNote((current) => (current?.id === id ? null : current));
    },
    [removeNote]
  );

  const togglePin = useCallback(
    async (id: string): Promise<PinResult> => {
      const target = notes.find((note) => note.id === id);
      if (!target) {
        return { ok: false, reason: 'That note no longer exists.' };
      }

      // Unpinning is always allowed. Only adding a pin can hit the cap, so a
      // user who already had more than `PIN_LIMIT` pinned keeps every one of
      // them and simply cannot add more.
      if (!target.isPinned) {
        const pinnedCount = notes.filter((note) => note.isPinned).length;
        if (pinnedCount >= PIN_LIMIT) {
          return {
            ok: false,
            reason: `You can pin up to ${PIN_LIMIT} notes. Unpin one to make room.`,
          };
        }
      }

      try {
        const updated = await saveNote(id, { isPinned: !target.isPinned });
        if (updated) {
          setActiveNote((current) => (current?.id === id ? updated : current));
        }
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : 'Unable to update that note.',
        };
      }
    },
    [notes, saveNote]
  );

  const toggleStar = useCallback(
    async (id: string) => {
      const target = notes.find((note) => note.id === id);
      if (!target) {
        return;
      }

      const updated = await saveNote(id, { isStarred: !target.isStarred });
      if (updated) {
        setActiveNote((current) => (current?.id === id ? updated : current));
      }
    },
    [notes, saveNote]
  );

  const addTag = useCallback((tag: Partial<NoteTag>) => {
    const newTag: NoteTag = {
      id: uuidv4(),
      name: tag.name || 'New Tag',
      color: tag.color || '#9b87f5',
    };
    setTags((prevTags) => [...prevTags, newTag]);
  }, []);

  const updateTag = useCallback((id: string, tag: Partial<NoteTag>) => {
    setTags((prevTags) =>
      prevTags.map((existing) => (existing.id === id ? { ...existing, ...tag } : existing))
    );
  }, []);

  /**
   * Removes a tag from the workspace and from every note carrying it.
   *
   * Each affected note is rewritten, because the tag list lives in the note's
   * own frontmatter. Deleting a tag only from the JSON would leave it in the
   * files and it would reappear on the next load.
   */
  const deleteTag = useCallback(
    async (id: string) => {
      const doomed = tagsRef.current.find((tag) => tag.id === id);
      setTags((prevTags) => prevTags.filter((tag) => tag.id !== id));

      if (!doomed) {
        return;
      }

      const affected = notes.filter((note) => note.tags.some((tag) => tag.id === id));
      for (const note of affected) {
        try {
          await saveNote(note.id, { tags: note.tags.filter((tag) => tag.id !== id) });
        } catch (error) {
          console.error(`Failed to remove the tag from ${note.path}`, error);
        }
      }
    },
    [notes, saveNote]
  );

  const addVisionBoard = useCallback((visionBoard: Partial<VisionBoard>) => {
    const newVisionBoard: VisionBoard = {
      id: uuidv4(),
      name: visionBoard.name || 'New Vision Board',
      items: visionBoard.items || [],
    };
    setVisionBoards((previous) => [...previous, newVisionBoard]);
    return newVisionBoard;
  }, []);

  const updateVisionBoard = useCallback((id: string, visionBoard: Partial<VisionBoard>) => {
    setVisionBoards((previous) =>
      previous.map((existing) => (existing.id === id ? { ...existing, ...visionBoard } : existing))
    );
  }, []);

  const deleteVisionBoard = useCallback((id: string) => {
    setVisionBoards((previous) => previous.filter((board) => board.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      notes,
      tags,
      visionBoards,
      activeNote,
      notesStatus: files.status,
      notesError: files.lastError,
      noteFailures: files.failures,
      reloadNotes: files.reload,
      pendingMigration: files.pendingMigration,
      runMigration: files.runMigration,
      dismissMigration: files.dismissMigration,
      addNote,
      addNotes,
      updateNote,
      moveNote,
      reloadNote,
      deleteNote,
      togglePin,
      toggleStar,
      addTag,
      updateTag,
      deleteTag,
      setActiveNote,
      addVisionBoard,
      updateVisionBoard,
      deleteVisionBoard,
      getCurrentBundle,
      persistBundle,
    }),
    [
      activeNote,
      addNote,
      addNotes,
      addTag,
      addVisionBoard,
      deleteNote,
      deleteTag,
      deleteVisionBoard,
      files.failures,
      files.pendingMigration,
      files.runMigration,
      files.dismissMigration,
      files.lastError,
      files.reload,
      files.status,
      getCurrentBundle,
      moveNote,
      reloadNote,
      notes,
      persistBundle,
      tags,
      toggleStar,
      togglePin,
      updateNote,
      updateTag,
      updateVisionBoard,
      visionBoards,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export default NotesProvider;
