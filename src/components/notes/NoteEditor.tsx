import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNotes, PIN_LIMIT } from '@/context/NotesContextTypes';
import { Note } from '@/types';
import { cn } from '@/lib/utils';
import type { EditorMode } from './NoteEditorHeader';
import MarkdownPreview from './MarkdownPreview';
import MarkdownToolbar from './MarkdownToolbar';
import { toast } from '@/hooks/use-toast';
import NoteConflictDialog from './NoteConflictDialog';
import { isNewNoteDirty, isNoteDirty } from '@/lib/notes/dirty';
import SaveAsDialog from './SaveAsDialog';
import NoteEditorHeader from './NoteEditorHeader';
import { parentOf } from '@/lib/workspace/types';
import { usePublishWorkspaceFocus } from '@/context/WorkspaceFocusContext';
import NoteFindReplaceBar, { type NoteFindHighlightState } from './NoteFindReplaceBar';
import NoteHighlightedTextarea from './NoteHighlightedTextarea';
import { useEditorSettings } from '@/context/EditorSettingsContext';
import { useNotePersistence, type NoteSaveSnapshot } from './useNotePersistence';

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
    addNote,
    updateNote,
    reloadNote,
    togglePin,
    toggleStar,
    setActiveNote,
  } = useNotes();
  const { settings: editorSettings } = useEditorSettings();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedTags, setSelectedTags] = useState(note?.tags || []);
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isStarred, setIsStarred] = useState(note?.isStarred || false);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [findHighlight, setFindHighlight] = useState<NoteFindHighlightState>({
    isOpen: false,
    matches: [],
    currentIndex: -1,
  });
  const [isSaveAsBusy, setIsSaveAsBusy] = useState(false);
  const [isSaveAsOpen, setIsSaveAsOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const currentNoteRef = useRef(note);
  currentNoteRef.current = note;

  /**
   * Whether there is unsaved work in the buffer.
   *
   * A new note counts once it holds anything at all, because nothing has been
   * written for it yet. The comparison itself lives in `lib/notes/dirty`.
   */
  const isDirty = isNew
    ? isNewNoteDirty({ title, content })
    : isNoteDirty({ title, content, tags: selectedTags }, note);

  const saveSnapshot = useMemo<NoteSaveSnapshot>(
    () => ({ title, content, tags: selectedTags, isPinned, isStarred }),
    [content, isPinned, isStarred, selectedTags, title]
  );
  const draftRef = useRef(saveSnapshot);
  draftRef.current = saveSnapshot;

  const reconcileSavedSnapshot = useCallback((saved: Note, written: NoteSaveSnapshot) => {
    // A blank or filesystem-normalized title comes back changed. Adopt it only
    // when the user has not typed a newer title while the write was in flight.
    if (draftRef.current.title === written.title && saved.title !== written.title) {
      setTitle(saved.title);
    }
  }, []);

  const replaceWithDiskNote = useCallback((fresh: Note) => {
    setTitle(fresh.title);
    setContent(fresh.content);
    setSelectedTags(fresh.tags);
    setIsPinned(fresh.isPinned);
    setIsStarred(fresh.isStarred);
  }, []);

  const adoptExternalIdentity = useCallback((fresh: Note) => {
    setTitle(fresh.title);
  }, []);

  const persistence = useNotePersistence({
    note,
    isNew,
    directory,
    isDirty,
    autoSave: editorSettings.autoSave,
    snapshot: saveSnapshot,
    addNote,
    updateNote,
    reloadNote,
    onSave,
    reconcileSavedSnapshot,
    replaceWithDiskNote,
    adoptExternalIdentity,
  });

  const updateContent: React.Dispatch<React.SetStateAction<string>> = useCallback(
    (next) => {
      persistence.resumeAfterEdit();
      setContent(next);
    },
    [persistence]
  );

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

  const refusePin = (reason: string) => {
    toast({ title: 'Pin limit reached', description: reason, variant: 'destructive' });
  };

  const handleTogglePin = useCallback(async () => {
    if (!(await persistence.beginMetadataWrite())) {
      return;
    }
    try {
      const currentNote = currentNoteRef.current;
      if (!isNew && currentNote) {
        // Pinning a saved note rewrites its file, so this waits for the write
        // rather than flipping the control and hoping.
        const result = await togglePin(currentNote.id);
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
    } finally {
      persistence.endMetadataWrite();
    }
  }, [isNew, isPinned, notes, persistence, togglePin]);

  const handleToggleStar = useCallback(async () => {
    if (!(await persistence.beginMetadataWrite())) {
      return;
    }
    setIsStarred((starred) => !starred);

    const currentNote = currentNoteRef.current;
    if (isNew || !currentNote) {
      persistence.endMetadataWrite();
      return;
    }

    // Starring writes the note's file. If that fails the control goes back to
    // where it was, so it never shows a state the file does not have.
    try {
      await toggleStar(currentNote.id);
    } catch (error) {
      console.error('Failed to update the note', error);
      setIsStarred((starred) => !starred);
      toast({
        title: 'Could not update the note',
        description: error instanceof Error ? error.message : 'Unable to write the note file.',
        variant: 'destructive',
      });
    } finally {
      persistence.endMetadataWrite();
    }
  }, [isNew, persistence, toggleStar]);

  /**
   * Writes the buffer to a new note and moves the editor to it.
   *
   * The note this was invoked from is left exactly as it is, including any
   * unsaved edits still sitting in the buffer, which are what gets copied. That
   * is the point of Save As: the original file is not written at all.
   */
  const handleSaveAs = useCallback(
    async (targetDirectory: string, targetTitle: string) => {
      if (!(await persistence.beginDirectWrite())) {
        return;
      }

      const editorTitleAtStart = draftRef.current.title;
      const contentAtStart = draftRef.current.content;
      const tagsAtStart = draftRef.current.tags;
      setIsSaveAsBusy(true);
      try {
        const copy = await addNote({
          title: targetTitle,
          content: contentAtStart,
          tags: tagsAtStart,
          directory: targetDirectory,
        });

        setIsSaveAsOpen(false);
        // The editor session stays mounted so text typed during the write is
        // preserved. The returned copy becomes the new persistence target.
        persistence.adoptDirectTarget(copy);
        setActiveNote(copy);
        if (draftRef.current.title === editorTitleAtStart) {
          setTitle(copy.title);
        }
        setIsPinned(copy.isPinned);
        setIsStarred(copy.isStarred);

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
        setIsSaveAsBusy(false);
        persistence.endDirectWrite();
      }
    },
    [addNote, onSave, persistence, setActiveNote]
  );

  useEffect(() => {
    const handleSaveEvent = () => void persistence.saveNow();
    const handleSaveAsEvent = () => setIsSaveAsOpen(true);

    window.addEventListener('notara:save-active-note', handleSaveEvent);
    window.addEventListener('notara:save-note-as', handleSaveAsEvent);

    return () => {
      window.removeEventListener('notara:save-active-note', handleSaveEvent);
      window.removeEventListener('notara:save-note-as', handleSaveAsEvent);
    };
  }, [persistence]);

  return (
    <div className="h-full flex flex-col">
      <NoteEditorHeader
        isPinned={isPinned}
        isStarred={isStarred}
        mode={mode}
        isSaving={persistence.isSaving || isSaveAsBusy}
        saveStatus={persistence.status}
        isNew={isNew}
        selectedTags={selectedTags}
        availableTags={availableTags}
        onTogglePin={handleTogglePin}
        onToggleStar={handleToggleStar}
        onModeChange={setMode}
        onTagsChange={(tags) => {
          persistence.resumeAfterEdit();
          setSelectedTags(tags);
        }}
        onCreateNote={onCreateNote}
        onSave={() => void persistence.saveNow()}
        onSaveAs={() => setIsSaveAsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            persistence.resumeAfterEdit();
            setTitle(e.target.value);
          }}
          placeholder="Note Title"
          className="w-full shrink-0 text-2xl font-bold mb-4 bg-transparent border-none outline-none focus:ring-0"
        />

        <NoteFindReplaceBar
          content={content}
          setContent={updateContent}
          textareaRef={editorRef}
          mode={mode}
          onModeChange={setMode}
          onHighlightChange={setFindHighlight}
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
            <div className="flex min-h-0 flex-1 flex-col">
              <MarkdownToolbar textareaRef={editorRef} content={content} setContent={updateContent} />
              <NoteHighlightedTextarea
                content={content}
                setContent={updateContent}
                textareaRef={editorRef}
                mode={mode}
                matches={findHighlight.matches}
                currentIndex={findHighlight.currentIndex}
                isHighlighting={findHighlight.isOpen && findHighlight.matches.length > 0}
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
        open={persistence.hasConflict}
        path={persistence.conflictPath}
        isBusy={persistence.isSaving}
        onKeepMine={() => void persistence.keepMine()}
        onUseTheirs={() => void persistence.useTheirs()}
        onCancel={persistence.cancelConflict}
      />

      <SaveAsDialog
        open={isSaveAsOpen}
        initialTitle={title || 'Untitled'}
        initialDirectory={note ? parentOf(note.path) : ''}
        isBusy={persistence.isSaving || isSaveAsBusy}
        onConfirm={(directory, nextTitle) => void handleSaveAs(directory, nextTitle)}
        onCancel={() => setIsSaveAsOpen(false)}
      />
    </div>
  );
};

export default NoteEditor;
