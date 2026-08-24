import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNotes, PIN_LIMIT } from '@/context/NotesContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import type { NotesBundle } from '@/lib/filesystem';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import TagSelector from './TagSelector';
import MarkdownPreview from './MarkdownPreview';
import MarkdownToolbar from './MarkdownToolbar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Maximize2, Pin, Plus, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import NoteConflictDialog from './NoteConflictDialog';
import { NoteConflictError } from '@/lib/notes/store';
import { isNewNoteDirty, isNoteDirty } from '@/lib/notes/dirty';

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
  } = useNotes();
  const { status } = useFileSystem();
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedTags, setSelectedTags] = useState(note?.tags || []);
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isStarred, setIsStarred] = useState(note?.isStarred || false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  // Set when a save is refused because the file moved underneath us. Holding it
  // here keeps the user's unsaved text in the editor while they decide.
  const [hasConflict, setHasConflict] = useState(false);
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
        setIsPreview(false);
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

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  const toggleFullPreview = useCallback(() => {
    setIsFullPreviewOpen((open) => !open);
  }, []);

  useEffect(() => {
    const handleSaveEvent = () => handleSave();
    const handlePreviewEvent = () => toggleFullPreview();

    window.addEventListener('notara:save-active-note', handleSaveEvent);
    window.addEventListener('notara:toggle-full-preview', handlePreviewEvent);

    return () => {
      window.removeEventListener('notara:save-active-note', handleSaveEvent);
      window.removeEventListener('notara:toggle-full-preview', handlePreviewEvent);
    };
  }, [handleSave, toggleFullPreview]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          {/* Pinning keeps a note at the top of the notes bar and is capped.
              Starring marks it important and is not. They are separate
              controls because they answer different questions. */}
          <button
            type="button"
            onClick={handleTogglePin}
            className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
              isPinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
            aria-pressed={isPinned}
            aria-label={isPinned ? 'Unpin note' : 'Pin note'}
            title={isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className={`h-5 w-5 ${isPinned ? 'fill-current' : 'fill-transparent'}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={handleToggleStar}
            className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
              isStarred ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
            aria-pressed={isStarred}
            aria-label={isStarred ? 'Unstar note' : 'Star note'}
            title={isStarred ? 'Unstar note' : 'Star note'}
          >
            <Star className={`h-5 w-5 ${isStarred ? 'fill-current' : 'fill-transparent'}`} aria-hidden="true" />
          </button>
          <div className="flex gap-2">
            <Button
              onClick={togglePreview}
              variant="ghost"
              size="sm"
              className={isPreview ? 'bg-secondary' : ''}
            >
              Preview
            </Button>
            <Button
              onClick={() => setIsFullPreviewOpen(true)}
              variant="ghost"
              size="sm"
              className={isFullPreviewOpen ? 'bg-secondary' : ''}
            >
              <Maximize2 className="h-4 w-4 mr-1" />
              Full Preview
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <TagSelector
            selectedTags={selectedTags}
            onChange={setSelectedTags}
            availableTags={availableTags}
          />
          <Button
            onClick={onCreateNote}
            disabled={!onCreateNote}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            New Note
          </Button>
          {/* Named rather than shown only as a colour, so the state is
              readable without relying on seeing the dot. */}
          {isDirty && (
            <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              Unsaved
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="ml-2"
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note Title"
          className="w-full text-2xl font-bold mb-4 bg-transparent border-none outline-none focus:ring-0"
        />

        {isPreview ? (
          <MarkdownPreview content={content} />
        ) : (
          <>
            <MarkdownToolbar textareaRef={editorRef} content={content} setContent={setContent} />
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing..."
              className="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none font-mono focus:ring-0"
            />
          </>
        )}
      </div>

      <Dialog open={isFullPreviewOpen} onOpenChange={setIsFullPreviewOpen}>
        <DialogContent className="max-w-5xl w-[90vw] h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{title || 'Untitled Note'}</DialogTitle>
            <DialogDescription className="sr-only">
              Full-screen markdown preview for the current note.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md border border-border/30 bg-background/80 p-4">
            <MarkdownPreview content={content} />
          </div>
          <DialogFooter className="sm:justify-end">
            <DialogClose asChild>
              <Button variant="secondary">Close Preview</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NoteConflictDialog
        open={hasConflict}
        path={note?.path ?? ''}
        isBusy={isSaving}
        onKeepMine={() => void resolveKeepMine()}
        onUseTheirs={() => void resolveUseTheirs()}
        onCancel={() => setHasConflict(false)}
      />
    </div>
  );
};

export default NoteEditor;
