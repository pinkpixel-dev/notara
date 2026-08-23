/**
 * Notes, backed by the Markdown files in the workspace.
 *
 * This hook owns the whole lifecycle: preparing a newly chosen folder, loading
 * every note out of it, and writing a single file when one note changes. It
 * deliberately does not batch or debounce writes. A note is a file, so saving a
 * note writes that file and nothing else, which is what keeps the folder honest
 * and keeps a crash from taking unrelated notes with it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Note, NoteTag } from '@/types';
import { useFileSystem } from '@/context/FileSystemContext';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { loadNotesFromWorkspace, type NoteLoadFailure } from '@/lib/notes/load';
import { metadataOf, noteFromFile, noteToFileContents } from '@/lib/notes/mapping';
import { migrateNotesBundle } from '@/lib/notes/migrate';
import { uniqueNotePath } from '@/lib/notes/naming';
import { buildNoteFile } from '@/lib/markdown/note-frontmatter';
import {
  deleteNoteFile,
  moveNoteFile,
  readNoteFile,
  writeNoteFile,
  NoteConflictError,
} from '@/lib/notes/store';
import { parentOf } from '@/lib/workspace/types';
import { STARTER_NOTES } from './starter-notes';

export type NoteFilesStatus = 'no-workspace' | 'loading' | 'ready' | 'error';

/** The fields a caller may set when creating or changing a note. */
export interface NoteInput {
  title?: string;
  content?: string;
  tags?: NoteTag[];
  isPinned?: boolean;
  isStarred?: boolean;
  createdAt?: string;
  /** Folder to create the note in. Defaults to the workspace root. */
  directory?: string;
}

/** Options for a save that is not a plain edit. */
export interface SaveOptions {
  /**
   * Write even though the file changed underneath Notara.
   *
   * Only set after the user has seen the conflict and chosen to keep their
   * version. The previous contents are still backed up before the overwrite.
   */
  force?: boolean;
}

export interface NoteFilesApi {
  notes: Note[];
  status: NoteFilesStatus;
  /** Files that could not be read, so the interface can name them. */
  failures: NoteLoadFailure[];
  lastError: string | null;
  /** Tags discovered inside note files, merged with the ones already known. */
  discoveredTags: NoteTag[];
  reload: () => Promise<void>;
  createNote: (input: NoteInput) => Promise<Note>;
  saveNote: (id: string, input: NoteInput, options?: SaveOptions) => Promise<Note | null>;
  /** Moves a note's file into another workspace folder. */
  moveNote: (id: string, directory: string) => Promise<Note | null>;
  /** Re-reads a note from disk, dropping any in-memory version. */
  reloadNote: (id: string) => Promise<Note | null>;
  removeNote: (id: string) => Promise<void>;
}

export const useNoteFiles = (knownTags: NoteTag[]): NoteFilesApi => {
  const { status: fileSystemStatus, rootHandle } = useFileSystem();
  const { scan, scanStatus, refresh } = useWorkspace();

  const [notes, setNotes] = useState<Note[]>([]);
  const [discoveredTags, setDiscoveredTags] = useState<NoteTag[]>([]);
  const [failures, setFailures] = useState<NoteLoadFailure[]>([]);
  const [status, setStatus] = useState<NoteFilesStatus>('no-workspace');
  const [lastError, setLastError] = useState<string | null>(null);

  // Read inside callbacks that must not re-create themselves on every keystroke.
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const knownTagsRef = useRef(knownTags);
  knownTagsRef.current = knownTags;

  /**
   * Which workspace has already been migrated and seeded.
   *
   * Preparation writes files, which triggers a rescan, which runs this effect
   * again. Without a marker that survives the rerun, the pair would loop.
   */
  const preparedForRef = useRef<string | null>(null);

  const workspaceKey =
    rootHandle?.kind === 'tauri' ? rootHandle.path : rootHandle?.name ?? null;

  const readNotes = useCallback(async () => {
    if (!rootHandle || !scan) {
      return;
    }

    const result = await loadNotesFromWorkspace(rootHandle, scan, knownTagsRef.current);

    setNotes(result.notes);
    setFailures(result.failures);
    // Only the tags the files introduced, so the caller can merge them into the
    // stored list without re-adding the ones it already had.
    setDiscoveredTags(result.tags.slice(knownTagsRef.current.length));
    setStatus('ready');
    setLastError(
      result.failures.length > 0
        ? `${result.failures.length} note${result.failures.length === 1 ? '' : 's'} could not be read.`
        : null
    );
  }, [rootHandle, scan]);

  /**
   * Gets a freshly chosen folder ready.
   *
   * Runs the one-time migration out of the old JSON bundle, then seeds the
   * starter notes if the folder is still empty. Returns true when it wrote
   * something, which means the scan on screen is stale and has to be redone.
   */
  const prepareWorkspace = useCallback(async (): Promise<boolean> => {
    if (!rootHandle || !scan) {
      return false;
    }

    const existingPaths = scan.files.map((file) => file.path);
    const migration = await migrateNotesBundle(rootHandle, existingPaths);

    if (migration.failures.length > 0) {
      setLastError(
        `${migration.failures.length} note${
          migration.failures.length === 1 ? '' : 's'
        } could not be moved out of the old storage. The original file was left in place.`
      );
    }

    if (migration.ran) {
      return true;
    }

    // A folder with notes already in it is not empty, and neither is one the
    // migration just filled. Only a genuinely blank workspace gets starters.
    if (existingPaths.length > 0) {
      return false;
    }

    const claimed: string[] = [];
    for (const starter of STARTER_NOTES) {
      const path = uniqueNotePath('', starter.title, claimed);
      const now = new Date().toISOString();

      await writeNoteFile(
        rootHandle,
        path,
        buildNoteFile(
          { tags: [], pinned: starter.pinned, starred: false, created: now, updated: now },
          starter.content
        ),
        null
      );
      claimed.push(path);
    }

    return claimed.length > 0;
  }, [rootHandle, scan]);

  useEffect(() => {
    if (fileSystemStatus !== 'ready' || !rootHandle) {
      preparedForRef.current = null;
      setNotes([]);
      setDiscoveredTags([]);
      setFailures([]);
      setStatus('no-workspace');
      return;
    }

    if (scanStatus !== 'ready' || !scan) {
      setStatus(scanStatus === 'error' ? 'error' : 'loading');
      return;
    }

    let cancelled = false;

    const run = async () => {
      setStatus('loading');

      try {
        if (preparedForRef.current !== workspaceKey) {
          const wroteFiles = await prepareWorkspace();
          // Marked before the rescan so the effect's next pass goes straight to
          // reading, rather than preparing a second time.
          preparedForRef.current = workspaceKey;

          if (wroteFiles) {
            await refresh();
            return;
          }
        }

        if (!cancelled) {
          await readNotes();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error('Failed to load notes from the workspace', error);
        setStatus('error');
        setLastError(
          error instanceof Error ? error.message : 'Unable to read notes from this folder.'
        );
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    fileSystemStatus,
    prepareWorkspace,
    readNotes,
    refresh,
    rootHandle,
    scan,
    scanStatus,
    workspaceKey,
  ]);

  const requireWorkspace = useCallback(() => {
    if (!rootHandle) {
      throw new Error('Choose a folder for your notes before saving.');
    }
    return rootHandle;
  }, [rootHandle]);

  const createNote = useCallback(
    async (input: NoteInput): Promise<Note> => {
      const root = requireWorkspace();
      const now = new Date().toISOString();

      const draft: Note = {
        id: '',
        path: '',
        revision: null,
        title: input.title?.trim() || 'Untitled',
        content: input.content ?? '',
        createdAt: input.createdAt ?? now,
        updatedAt: now,
        tags: input.tags ?? [],
        isPinned: input.isPinned ?? false,
        isStarred: input.isStarred ?? false,
      };

      const path = uniqueNotePath(
        input.directory ?? '',
        draft.title,
        notesRef.current.map((note) => note.path)
      );

      const written = await writeNoteFile(
        root,
        path,
        buildNoteFile(metadataOf(draft), draft.content),
        null
      );

      // The file name is the title, so the note takes its title back from the
      // path that was actually written. A title the filesystem would not accept
      // shows up corrected rather than silently disagreeing with the folder.
      const { note } = noteFromFile({
        path: written.path,
        contents: buildNoteFile(metadataOf(draft), draft.content),
        revision: written.revision,
        knownTags: knownTagsRef.current,
      });

      setNotes((previous) => [...previous, note]);
      return note;
    },
    [requireWorkspace]
  );

  const saveNote = useCallback(
    async (id: string, input: NoteInput, options?: SaveOptions): Promise<Note | null> => {
      const root = requireWorkspace();
      const existing = notesRef.current.find((note) => note.id === id);
      if (!existing) {
        return null;
      }

      const updated: Note = {
        ...existing,
        title: input.title?.trim() || existing.title,
        content: input.content ?? existing.content,
        tags: input.tags ?? existing.tags,
        isPinned: input.isPinned ?? existing.isPinned,
        isStarred: input.isStarred ?? existing.isStarred,
        updatedAt: new Date().toISOString(),
      };

      // Reading the file back is what lets frontmatter Notara does not own
      // survive the save. Skipping it would quietly strip a user's own keys.
      let onDisk = '';
      try {
        onDisk = (await readNoteFile(root, existing.path)).contents;
      } catch {
        // The file is gone. The save recreates it rather than failing, because
        // the content in the editor is the version the user still has.
        onDisk = '';
      }

      const contents = noteToFileContents(updated, onDisk);

      // A move and a rename are the same operation: both change the path. The
      // directory comes from the input when the caller is moving the note, and
      // from the note's current folder otherwise.
      const targetDirectory = input.directory ?? parentOf(existing.path);
      const keepsPath =
        updated.title === existing.title && targetDirectory === parentOf(existing.path);

      const targetPath = keepsPath
        ? existing.path
        : uniqueNotePath(
            targetDirectory,
            updated.title,
            notesRef.current.filter((note) => note.id !== id).map((note) => note.path)
          );

      /*
       * Forcing skips the revision guard.
       *
       * This is only reached after the user has been shown the conflict and
       * asked to keep their version, so the overwrite is a decision rather than
       * an accident. The previous contents still go to `.notara/backups` first.
       */
      const written = await moveNoteFile(
        root,
        existing.path,
        targetPath,
        contents,
        options?.force ? null : existing.revision
      );

      const saved: Note = {
        ...updated,
        id: written.path,
        path: written.path,
        revision: written.revision,
        title: updated.title,
      };

      setNotes((previous) => previous.map((note) => (note.id === id ? saved : note)));
      return saved;
    },
    [requireWorkspace]
  );

  const removeNote = useCallback(
    async (id: string) => {
      const root = requireWorkspace();
      const existing = notesRef.current.find((note) => note.id === id);
      if (!existing) {
        return;
      }

      await deleteNoteFile(root, existing.path);
      setNotes((previous) => previous.filter((note) => note.id !== id));
    },
    [requireWorkspace]
  );

  const moveNote = useCallback(
    (id: string, directory: string): Promise<Note | null> => saveNote(id, { directory }),
    [saveNote]
  );

  /**
   * Re-reads a note from disk, discarding whatever Notara had in memory.
   *
   * This is the "their version wins" half of resolving a conflict, and it is
   * also how a note recovers after being edited in another editor.
   */
  const reloadNote = useCallback(
    async (id: string): Promise<Note | null> => {
      const root = requireWorkspace();
      const existing = notesRef.current.find((note) => note.id === id);
      if (!existing) {
        return null;
      }

      const { contents, revision } = await readNoteFile(root, existing.path);
      const { note } = noteFromFile({
        path: existing.path,
        contents,
        revision,
        knownTags: knownTagsRef.current,
      });

      setNotes((previous) => previous.map((entry) => (entry.id === id ? note : entry)));
      return note;
    },
    [requireWorkspace]
  );

  const reload = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    notes,
    status,
    failures,
    lastError,
    discoveredTags,
    reload,
    createNote,
    saveNote,
    moveNote,
    reloadNote,
    removeNote,
  };
};

export { NoteConflictError };
