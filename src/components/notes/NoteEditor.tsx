import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNotes, PIN_LIMIT } from '@/context/NotesContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import type { NotesBundle } from '@/lib/filesystem';
import { Note } from '@/types';
import { cn } from '@/lib/utils';
import type { EditorMode } from './NoteEditorHeader';
import MarkdownPreview from './MarkdownPreview';
import MarkdownToolbar from './MarkdownToolbar';
import { toast } from '@/hooks/use-toast';
import NoteConflictDialog from './NoteConflictDialog';
import { NoteConflictError } from '@/lib/notes/store';
import { isNewNoteDirty, isNoteDirty } from '@/lib/notes/dirty';
import SaveAsDialog from './SaveAsDialog';
import NoteEditorHeader from './NoteEditorHeader';
import { parentOf } from '@/lib/workspace/types';
import { usePublishWorkspaceFocus } from '@/context/WorkspaceFocusContext';

interface NoteEditorProps {
  note?: Note;
  isNew?: boolean;
  /**
   * Folder a new note is written into. Empty is the workspace root.
   *
   * Only meaningful with `isNew`. An existing note already has a folder, and
   * changing it is a move rather than a save.
   */
  directory?: string;
  onSave?: (note: Note) => void;
  onCreateNote?: () => void;
  /**
   * Reports whether the buffer differs from what is on disk.
   *
   * The editor owns the buffer, but the page owns note selection, so the page
   * has to be told before it can ask about discarding anything.
   */
  onDirtyChange?: (isDirty: boolean) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isNew = false,
  directory = '',
  onSave,
  onCreateNote,
  onDirtyChange,
}) => {
  const {
    notes,
    tags: availableTags,
    visionBoards,
    addNote,
    updateNote,
    reloadNote,
    persistBundle,
    togglePin,
    toggleStar,
    setActiveNote,
  } = useNotes();
  const { status } = useFileSystem();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedTags, setSelectedTags] = useState(note?.tags || []);
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isStarred, setIsStarred] = useState(note?.isStarred || false);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [isSaving, setIsSaving] = useState(false);
  // Set when a save is refused because the file moved underneath us. Holding it
  // here keeps the user's unsaved text in the editor while they decide.
  const [hasConflict, setHasConflict] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Which note the buffer was last filled from.
   *
   * Pinning or starring the open note saves it, which hands this component a
   * new `note` object for the same note. Refilling the buffer on that would
   * throw away whatever the user had typed but not yet saved, so the buffer is
   * only refilled when a genuinely different note arrives.
   */
  const loadedNoteIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isNew) {
      if (loadedNoteIdRef.current !== null) {
        loadedNoteIdRef.current = null;
        setTitle('');
        setContent('');
        setSelectedTags([]);
        setIsPinned(false);
        setIsStarred(false);
        setMode('edit');
      }
      return;
    }

    if (note && loadedNoteIdRef.current !== note.id) {
      loadedNoteIdRef.current = note.id;
      setTitle(note.title);
      setContent(note.content);
      setSelectedTags(note.tags);
      setIsPinned(note.isPinned);
      setIsStarred(note.isStarred);
    }
  }, [isNew, note]);

  /**
   * Whether there is unsaved work in the buffer.
   *
   * A new note counts once it holds anything at all, because nothing has been
   * written for it yet. The comparison itself lives in `lib/notes/dirty`.
   */
  const isDirty = isNew
    ? isNewNoteDirty({ title, content })
    : isNoteDirty({ title, content, tags: selectedTags }, note);

  const replaceFocusedContent = useCallback((nextContent: string) => {
    setContent(nextContent);
  }, []);
  const focusTarget = useMemo(
    () => ({
      kind: 'note' as const,
      path: note?.path ?? null,
      title,
      content,
      isDirty,
      isNew,
      directory: isNew ? directory : note ? parentOf(note.path) : directory,
    }),
    [content, directory, isDirty, isNew, note, title]
  );
  usePublishWorkspaceFocus(focusTarget, replaceFocusedContent);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Tells the editor to forget the note when it unmounts, so a stale dirty flag
  // cannot outlive the buffer it described.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  // The browser's own prompt is the only thing that can interrupt a tab close
  // or a reload. It cannot be styled and its wording is up to the browser.
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const saveData = {
      title: title || 'Untitled',
      content,
      tags: selectedTags,
      isPinned,
      isStarred,
    };

    try {
      // The note writes its own file, so there is no bundle to assemble here.
      // A title change renames that file, which means the saved note can come
      // back carrying a different path than the one that went in.
      const savedNote = isNew
        ? await addNote({ ...saveData, directory })
        : note
          ? await updateNote(note.id, saveData)
          : null;

      if (!savedNote) {
        throw new Error('Nothing to save yet');
      }

      toast({
        title: 'Note saved',
        description: `Written to ${savedNote.path}.`,
      });

      if (onSave) {
        onSave(savedNote);
      }
    } catch (error) {
      // A refused write is not a failure, it is a question. The editor keeps
      // the user's text and asks which version should win.
      if (error instanceof NoteConflictError || (error as Error)?.name === 'NoteConflictError') {
        setHasConflict(true);
        return;
      }

      console.error('Failed to save note', error);
      toast({
        title: 'Save failed',
        description:
          (error instanceof Error && error.message) || 'Unable to save the current note.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    addNote,
    directory,
    isNew,
    isPinned,
    isStarred,
    note,
    onSave,
    selectedTags,
    title,
    updateNote,
    content,
  ]);

  const refusePin = (reason: string) => {
    toast({ title: 'Pin limit reached', description: reason, variant: 'destructive' });
  };

  const handleTogglePin = useCallback(async () => {
    if (!isNew && note) {
      // Pinning a saved note rewrites its file, so this waits for the write
      // rather than flipping the control and hoping.
      const result = await togglePin(note.id);
      if (!result.ok) {
        refusePin(result.reason);
        return;
      }
      setIsPinned((pinned) => !pinned);
      return;
    }

    // An unsaved note is not in the list yet, so the cap is measured against
    // the notes that are already pinned.
    if (!isPinned && notes.filter((entry) => entry.isPinned).length >= PIN_LIMIT) {
      refusePin(`You can pin up to ${PIN_LIMIT} notes. Unpin one to make room.`);
      return;
    }

    setIsPinned((pinned) => !pinned);
  }, [isNew, isPinned, note, notes, togglePin]);

  const handleToggleStar = useCallback(async () => {
    setIsStarred((starred) => !starred);

    if (isNew || !note) {
      return;
    }

    // Starring writes the note's file. If that fails the control goes back to
    // where it was, so it never shows a state the file does not have.
    try {
      await toggleStar(note.id);
    } catch (error) {
      console.error('Failed to update the note', error);
      setIsStarred((starred) => !starred);
      toast({
        title: 'Could not update the note',
        description: error instanceof Error ? error.message : 'Unable to write the note file.',
        variant: 'destructive',
      });
    }
  }, [isNew, note, toggleStar]);

  /** Overwrite the file with what is in the editor. */
  const resolveKeepMine = useCallback(async () => {
    if (!note) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await updateNote(
        note.id,
        { title: title || 'Untitled', content, tags: selectedTags, isPinned, isStarred },
        { force: true }
      );
      setHasConflict(false);
      toast({
        title: 'Your version was kept',
        description: saved
          ? `Written to ${saved.path}. The previous file is in .notara/backups.`
          : 'The note was written.',
      });
      if (saved && onSave) {
        onSave(saved);
      }
    } catch (error) {
      toast({
        title: 'Save failed',
        description:
          (error instanceof Error && error.message) || 'Unable to save the current note.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [content, isPinned, isStarred, note, onSave, selectedTags, title, updateNote]);

  /** Throw away the editor's text and take whatever is on disk. */
  const resolveUseTheirs = useCallback(async () => {
    if (!note) {
      return;
    }

    setIsSaving(true);
    try {
      const fresh = await reloadNote(note.id);
      if (fresh) {
        // The effect that syncs these fields keys off the note object, and the
        // reloaded note may be the same object identity, so they are set here.
        setTitle(fresh.title);
        setContent(fresh.content);
        setSelectedTags(fresh.tags);
        setIsPinned(fresh.isPinned);
        setIsStarred(fresh.isStarred);
      }
      setHasConflict(false);
      toast({ title: 'Reloaded from disk' });
    } catch (error) {
      toast({
        title: 'Could not reload the note',
        description:
          (error instanceof Error && error.message) || 'Unable to read the note file.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [note, reloadNote]);

  /**
   * Writes the buffer to a new note and moves the editor to it.
   *
   * The note this was invoked from is left exactly as it is, including any
   * unsaved edits still sitting in the buffer, which are what gets copied. That
   * is the point of Save As: the original file is not written at all.
   */
  const handleSaveAs = useCallback(
    async (targetDirectory: string, targetTitle: string) => {
      setIsSaving(true);
      try {
        const copy = await addNote({
          title: targetTitle,
          content,
          tags: selectedTags,
          directory: targetDirectory,
        });

        setIsSaveAsOpen(false);
        // Moving the active note remounts the editor against the copy, so the
        // buffer lines up with the file that was just written.
        setActiveNote(copy);

        toast({ title: 'Copy saved', description: `Written to ${copy.path}.` });

        if (onSave) {
          onSave(copy);
        }
      } catch (error) {
        console.error('Failed to save a copy', error);
        toast({
          title: 'Could not save a copy',
          description:
            (error instanceof Error && error.message) || 'Unable to write the new note.',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [addNote, content, onSave, selectedTags, setActiveNote]
  );

  useEffect(() => {
    const handleSaveEvent = () => handleSave();
    const handleSaveAsEvent = () => setIsSaveAsOpen(true);

    window.addEventListener('notara:save-active-note', handleSaveEvent);
    window.addEventListener('notara:save-note-as', handleSaveAsEvent);

    return () => {
      window.removeEventListener('notara:save-active-note', handleSaveEvent);
      window.removeEventListener('notara:save-note-as', handleSaveAsEvent);
    };
  }, [handleSave]);

  return (
    <div className="h-full flex flex-col">
      <NoteEditorHeader
        isPinned={isPinned}
        isStarred={isStarred}
        mode={mode}
        isSaving={isSaving}
        isDirty={isDirty}
        isNew={isNew}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onTogglePin={handleTogglePin}
        onToggleStar={handleToggleStar}
        onModeChange={setMode}
        onTagsChange={setSelectedTags}
        onCreateNote={onCreateNote}
        onSave={handleSave}
        onSaveAs={() => setIsSaveAsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="w-full shrink-0 text-2xl font-bold mb-4 bg-transparent border-none outline-none focus:ring-0"
        />

        {/* Split stacks below the medium breakpoint. Two columns on a phone
            gives two unusable ones, and Edit and Preview are still a tap away. */}
        <div
          className={cn(
            'min-h-0 flex-1',
            mode === 'split' ? 'grid gap-4 md:grid-cols-2' : 'flex flex-col'
          )}
        >
          {mode !== 'preview' && (
            <div className="flex min-h-0 flex-col">
              <MarkdownToolbar textareaRef={editorRef} content={content} setContent={setContent} />
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing..."
                aria-label="Note content"
                className={cn(
                  'w-full flex-1 resize-none overflow-auto bg-transparent font-mono',
                  'border-none outline-none focus:ring-0',
                  mode === 'split' ? 'min-h-[40vh]' : 'min-h-[60vh]'
                )}
              />
            </div>
          )}

          {mode !== 'edit' && (
            <div
              className={cn(
                'min-h-0 flex-1 overflow-auto',
                mode === 'split' && 'rounded-md border border-border/40 p-3'
              )}
            >
              <MarkdownPreview content={content} />
            </div>
          )}
        </div>
      </div>

      <NoteConflictDialog
        open={hasConflict}
        path={note?.path ?? ''}
        isBusy={isSaving}
        onKeepMine={() => void resolveKeepMine()}
        onUseTheirs={() => void resolveUseTheirs()}
        onCancel={() => setHasConflict(false)}
      />

      <SaveAsDialog
        open={isSaveAsOpen}
        initialTitle={title || 'Untitled'}
        initialDirectory={note ? parentOf(note.path) : ''}
        isBusy={isSaving}
        onConfirm={(directory, nextTitle) => void handleSaveAs(directory, nextTitle)}
        onCancel={() => setIsSaveAsOpen(false)}
      />
    </div>
  );
};

export default NoteEditor;
