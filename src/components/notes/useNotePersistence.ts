import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Note, NoteTag } from '@/types';
import type { NotesContextType } from '@/context/NotesContextTypes';
import { toast } from '@/hooks/use-toast';
import { NoteConflictError } from '@/lib/notes/store';
import { sameTags } from '@/lib/notes/dirty';
import {
  createAutosaveController,
  type AutosaveController,
} from '@/lib/notes/autosave';

export interface NoteSaveSnapshot {
  title: string;
  content: string;
  tags: NoteTag[];
  isPinned: boolean;
  isStarred: boolean;
}

export type NoteSaveStatus =
  | 'not-saved'
  | 'saved'
  | 'unsaved'
  | 'saving'
  | 'error'
  | 'conflict';

interface AdoptionWaiter {
  id: string;
  revision: string | null;
  resolve: () => void;
}

interface UseNotePersistenceOptions {
  note?: Note;
  isNew: boolean;
  directory: string;
  isDirty: boolean;
  autoSave: boolean;
  snapshot: NoteSaveSnapshot;
  addNote: NotesContextType['addNote'];
  updateNote: NotesContextType['updateNote'];
  reloadNote: NotesContextType['reloadNote'];
  onSave?: (note: Note) => void;
  reconcileSavedSnapshot: (saved: Note, snapshot: NoteSaveSnapshot) => void;
  replaceWithDiskNote: (note: Note) => void;
  adoptExternalIdentity: (note: Note) => void;
}

/**
 * Owns the editor's serialized save lane.
 *
 * A save can change a note's path and revision. The controller waits until the
 * returned note reaches the editor through context before it writes a queued
 * snapshot, so the next revision check always starts from current state.
 */
export const useNotePersistence = ({
  note,
  isNew,
  directory,
  isDirty,
  autoSave,
  snapshot,
  addNote,
  updateNote,
  reloadNote,
  onSave,
  reconcileSavedSnapshot,
  replaceWithDiskNote,
  adoptExternalIdentity,
}: UseNotePersistenceOptions) => {
  const [controllerSaving, setControllerSaving] = useState(false);
  const [directWriteBusy, setDirectWriteBusy] = useState(false);
  const [metadataWriteBusy, setMetadataWriteBusy] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [autosaveSuspended, setAutosaveSuspended] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const noteRef = useRef(note);
  const savedTargetRef = useRef<Note | null>(isNew ? null : note ?? null);
  const snapshotRef = useRef(snapshot);
  const onSaveRef = useRef(onSave);
  const reconcileRef = useRef(reconcileSavedSnapshot);
  const replaceWithDiskRef = useRef(replaceWithDiskNote);
  const adoptExternalIdentityRef = useRef(adoptExternalIdentity);
  const previousNoteRef = useRef(note);
  const directWriteBusyRef = useRef(false);
  const metadataWriteBusyRef = useRef(false);
  const adoptionWaiterRef = useRef<AdoptionWaiter | null>(null);
  const controllerRef = useRef<AutosaveController<NoteSaveSnapshot> | null>(null);

  noteRef.current = note;
  snapshotRef.current = snapshot;
  onSaveRef.current = onSave;
  reconcileRef.current = reconcileSavedSnapshot;
  replaceWithDiskRef.current = replaceWithDiskNote;
  adoptExternalIdentityRef.current = adoptExternalIdentity;

  const waitForAdoption = useCallback((saved: Note): Promise<void> => {
    const current = noteRef.current;
    if (current?.id === saved.id && current.revision === saved.revision) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      adoptionWaiterRef.current?.resolve();
      adoptionWaiterRef.current = {
        id: saved.id,
        revision: saved.revision,
        resolve,
      };
    });
  }, []);

  const persistSnapshot = useCallback(
    async (next: NoteSaveSnapshot, force = false): Promise<Note> => {
      const target = savedTargetRef.current;
      const saveData = {
        title: next.title || 'Untitled',
        content: next.content,
        tags: next.tags,
        isPinned: next.isPinned,
        isStarred: next.isStarred,
      };
      const saved = target
        ? await updateNote(target.id, saveData, force ? { force: true } : undefined)
        : await addNote({ ...saveData, directory });

      if (!saved) {
        throw new Error('Nothing to save yet');
      }

      savedTargetRef.current = saved;
      reconcileRef.current(saved, next);
      const adoption = waitForAdoption(saved);
      onSaveRef.current?.(saved);
      await adoption;
      return saved;
    },
    [addNote, directory, updateNote, waitForAdoption]
  );

  const persistSnapshotRef = useRef(persistSnapshot);
  persistSnapshotRef.current = persistSnapshot;

  if (!controllerRef.current) {
    controllerRef.current = createAutosaveController<NoteSaveSnapshot>({
      save: async (next) => {
        await persistSnapshotRef.current(next);
      },
      onStateChange: (state) => {
        if (mountedRef.current) {
          setControllerSaving(state.isSaving);
        }
      },
      onSaved: () => {
        if (mountedRef.current) {
          setSaveError(null);
        }
      },
      onError: (error) => {
        if (!mountedRef.current) {
          return;
        }

        if (error instanceof NoteConflictError || (error as Error)?.name === 'NoteConflictError') {
          setHasConflict(true);
          setAutosaveSuspended(true);
          setSaveError(null);
          controllerRef.current?.cancel();
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to save the current note.';
        setSaveError(message);
        toast({ title: 'Save failed', description: message, variant: 'destructive' });
      },
    });
  }

  const controller = controllerRef.current;

  useEffect(() => {
    const waiter = adoptionWaiterRef.current;
    if (note && waiter?.id === note.id && waiter.revision === note.revision) {
      savedTargetRef.current = note;
      previousNoteRef.current = note;
      adoptionWaiterRef.current = null;
      waiter.resolve();
      return;
    }

    if (note && !waiter) {
      const previous = previousNoteRef.current;
      if (previous && previous.id !== note.id) {
        const current = snapshotRef.current;
        const wasClean =
          current.title === previous.title
          && current.content === previous.content
          && sameTags(current.tags, previous.tags);

        if (wasClean) {
          replaceWithDiskRef.current(note);
        } else if (note.title !== previous.title) {
          // A rename or move is an explicit file action. Keep dirty body text,
          // but adopt an explicitly renamed title so autosave cannot rename it
          // back. A folder-only move preserves every draft field.
          adoptExternalIdentityRef.current(note);
        }
      }
      savedTargetRef.current = note;
      previousNoteRef.current = note;
    }
  }, [note]);

  useEffect(() => {
    if (
      !autoSave
      || !isDirty
      || hasConflict
      || autosaveSuspended
      || metadataWriteBusy
      || directWriteBusy
      || saveError
    ) {
      controller.cancel();
      return;
    }

    controller.schedule(snapshot);
  }, [
    autoSave,
    autosaveSuspended,
    controller,
    hasConflict,
    isDirty,
    metadataWriteBusy,
    directWriteBusy,
    saveError,
    snapshot,
  ]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      controller.cancel();
      adoptionWaiterRef.current?.resolve();
      adoptionWaiterRef.current = null;
    },
    [controller]
  );

  const saveNow = useCallback(async () => {
    if (directWriteBusyRef.current || metadataWriteBusyRef.current) {
      return;
    }

    setAutosaveSuspended(false);
    setSaveError(null);
    controller.schedule(snapshotRef.current);
    const saved = await controller.flush();
    if (saved && mountedRef.current) {
      const target = savedTargetRef.current;
      toast({
        title: 'Note saved',
        description: target ? `Written to ${target.path}.` : 'The note was written.',
      });
    }
  }, [controller]);

  const resumeAfterEdit = useCallback(() => {
    setSaveError(null);
    setAutosaveSuspended(false);
  }, []);

  const cancelConflict = useCallback(() => {
    setHasConflict(false);
  }, []);

  const beginDirectWrite = useCallback(async (): Promise<boolean> => {
    if (directWriteBusyRef.current || metadataWriteBusyRef.current) {
      return false;
    }

    directWriteBusyRef.current = true;
    setDirectWriteBusy(true);
    controller.cancel();
    const ready = await controller.flush();
    if (!ready) {
      directWriteBusyRef.current = false;
      setDirectWriteBusy(false);
      return false;
    }
    return true;
  }, [controller]);

  const endDirectWrite = useCallback(() => {
    directWriteBusyRef.current = false;
    setDirectWriteBusy(false);
  }, []);

  const keepMine = useCallback(async () => {
    const target = savedTargetRef.current;
    if (!target) {
      return;
    }

    if (!(await beginDirectWrite())) {
      return;
    }
    try {
      const saved = await persistSnapshot(snapshotRef.current, true);
      setHasConflict(false);
      setAutosaveSuspended(false);
      setSaveError(null);
      toast({
        title: 'Your version was kept',
        description: `Written to ${saved.path}. The previous file is in .notara/backups.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the current note.';
      setSaveError(message);
      toast({ title: 'Save failed', description: message, variant: 'destructive' });
    } finally {
      if (mountedRef.current) {
        endDirectWrite();
      }
    }
  }, [beginDirectWrite, endDirectWrite, persistSnapshot]);

  const useTheirs = useCallback(async () => {
    const target = savedTargetRef.current;
    if (!target) {
      return;
    }

    if (!(await beginDirectWrite())) {
      return;
    }
    try {
      const fresh = await reloadNote(target.id);
      if (fresh) {
        savedTargetRef.current = fresh;
        replaceWithDiskRef.current(fresh);
      }
      setHasConflict(false);
      setAutosaveSuspended(false);
      setSaveError(null);
      toast({ title: 'Reloaded from disk' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to read the note file.';
      toast({ title: 'Could not reload the note', description: message, variant: 'destructive' });
    } finally {
      if (mountedRef.current) {
        endDirectWrite();
      }
    }
  }, [beginDirectWrite, endDirectWrite, reloadNote]);

  const beginMetadataWrite = useCallback(async () => {
    if (directWriteBusyRef.current || metadataWriteBusyRef.current) {
      return false;
    }

    metadataWriteBusyRef.current = true;
    setMetadataWriteBusy(true);
    controller.cancel();
    const ready = await controller.flush();
    if (!ready) {
      metadataWriteBusyRef.current = false;
      setMetadataWriteBusy(false);
      return false;
    }
    return true;
  }, [controller]);

  const endMetadataWrite = useCallback(() => {
    metadataWriteBusyRef.current = false;
    setMetadataWriteBusy(false);
  }, []);

  const adoptDirectTarget = useCallback((saved: Note) => {
    savedTargetRef.current = saved;
    previousNoteRef.current = saved;
  }, []);

  const isSaving = controllerSaving || directWriteBusy || metadataWriteBusy;
  const status = useMemo<NoteSaveStatus>(() => {
    if (hasConflict) return 'conflict';
    if (isSaving) return 'saving';
    if (saveError) return 'error';
    if (isDirty) return 'unsaved';
    if (isNew) return 'not-saved';
    return 'saved';
  }, [hasConflict, isDirty, isNew, isSaving, saveError]);

  return {
    status,
    isSaving,
    hasConflict,
    conflictPath: savedTargetRef.current?.path ?? note?.path ?? '',
    saveNow,
    resumeAfterEdit,
    cancelConflict,
    keepMine,
    useTheirs,
    beginMetadataWrite,
    endMetadataWrite,
    beginDirectWrite,
    endDirectWrite,
    adoptDirectTarget,
    cancelPendingSave: controller.cancel,
  };
};
