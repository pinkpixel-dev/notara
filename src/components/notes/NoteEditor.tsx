import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { useFileSystem } from '@/context/FileSystemContext';
import type { NotesBundle } from '@/lib/filesystem';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import TagSelector from './TagSelector';
import MarkdownPreview from './MarkdownPreview';
import MarkdownToolbar from './MarkdownToolbar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Maximize2, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface NoteEditorProps {
  note?: Note;
  isNew?: boolean;
  onSave?: (note: Note) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, isNew = false, onSave }) => {
  const {
    notes,
    tags: availableTags,
    visionBoards,
    addNote,
    updateNote,
    persistBundle,
  } = useNotes();
  const { status, rootHandle } = useFileSystem();
  const isLinkedDirectory =
    rootHandle?.kind === 'browser' ||
    (rootHandle?.kind === 'tauri' && rootHandle.source === 'linked');
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedTags, setSelectedTags] = useState(note?.tags || []);
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setSelectedTags(note.tags);
      setIsPinned(note.isPinned);
    }
  }, [note]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    const saveData = {
      title: title || 'Untitled',
      content,
      tags: selectedTags,
      isPinned,
    };

    try {
      let savedNote: Note | null = null;
      let updatedNotes: Note[] = notes;

      if (isNew) {
        const created = addNote(saveData);
        savedNote = created;
        updatedNotes = [...notes, created];
      } else if (note) {
        const updated = updateNote(note.id, saveData);
        if (updated) {
          savedNote = updated;
          updatedNotes = notes.map((existing) => (existing.id === note.id ? updated : existing));
        }
      }

      if (!savedNote) {
        throw new Error('Nothing to save yet');
      }

      const bundle: NotesBundle = {
        notes: updatedNotes,
        tags: availableTags,
        visionBoards,
      };

      await persistBundle(bundle);

      toast({
        title: status === 'ready' ? 'Note saved' : 'Saved locally',
        description:
          status === 'ready'
            ? isLinkedDirectory
              ? 'Your changes were written to the linked Notara folder.'
              : 'Your changes were written to Notara app storage.'
            : 'Storage is not ready yet, so the note was only saved in memory.',
      });

      if (onSave) {
        onSave(savedNote);
      }
    } catch (error) {
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
    availableTags,
    isNew,
    isPinned,
    note,
    notes,
    onSave,
    persistBundle,
    isLinkedDirectory,
    selectedTags,
    status,
    title,
    updateNote,
    visionBoards,
    content,
  ]);

  const togglePin = useCallback(() => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);

    if (!isNew && note) {
      updateNote(note.id, { isPinned: nextPinned });
    }
  }, [isNew, isPinned, note, updateNote]);

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
          <button
            onClick={togglePin}
            className={`p-2 rounded-md transition-colors ${
              isPinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            }`}
            aria-label={isPinned ? 'Unstar note' : 'Star note'}
          >
            <Star className={`h-5 w-5 ${isPinned ? 'fill-current' : 'fill-transparent'}`} />
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
    </div>
  );
};

export default NoteEditor;
