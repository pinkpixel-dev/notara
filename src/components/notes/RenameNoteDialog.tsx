import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useNotes } from '@/context/NotesContextTypes';
import { MAX_TITLE_LENGTH, NOTE_EXTENSION, titleToFileName } from '@/lib/notes/naming';
import type { Note } from '@/types';

interface RenameNoteDialogProps {
  /** The note being renamed, or null when the dialog is closed. */
  note: Note | null;
  onClose: () => void;
}

/**
 * Renames a note from the sidebar.
 *
 * A note's title is its file name, so renaming here is the same operation as
 * editing the title in the editor. This exists so a rename does not require
 * opening the note first.
 *
 * The resulting file name is shown while the user types. `titleToFileName` is
 * deliberately lossy, and a colon or a slash disappearing from a title is the
 * kind of thing that should be visible at the moment it happens rather than
 * discovered later in a folder listing.
 */
const RenameNoteDialog: React.FC<RenameNoteDialogProps> = ({ note, onClose }) => {
  const { updateNote } = useNotes();
  const [title, setTitle] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts from the note's current title, so a cancelled attempt
  // does not leave its text or its error behind for the next note.
  useEffect(() => {
    setTitle(note?.title ?? '');
    setError(null);
  }, [note]);

  const trimmed = title.trim();
  const fileName = useMemo(
    () => (trimmed === '' ? '' : `${titleToFileName(trimmed)}${NOTE_EXTENSION}`),
    [trimmed]
  );

  // Worth pointing out only when the characters actually changed. Length
  // trimming is reported by the same comparison.
  const wasChanged = trimmed !== '' && titleToFileName(trimmed) !== trimmed;
  const isUnchanged = note !== null && trimmed === note.title;
  const canConfirm = trimmed !== '' && !isUnchanged && !isBusy;

  const confirm = async () => {
    if (!note || !canConfirm) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const renamed = await updateNote(note.id, { title: trimmed });
      toast({
        title: 'Note renamed',
        description: renamed ? `Now at ${renamed.path}.` : 'The note was renamed.',
      });
      onClose();
    } catch (thrown) {
      setError((thrown as Error)?.message ?? 'That note could not be renamed.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename note</DialogTitle>
          <DialogDescription>
            A note's title is its file name, so this renames the Markdown file too. Its
            folder, tags, pin, and star stay as they are.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rename-note-title">Title</Label>
          <Input
            id="rename-note-title"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canConfirm) {
                event.preventDefault();
                void confirm();
              }
            }}
          />
        </div>

        {fileName && (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">Saves as </span>
            <span className="break-all font-mono">{fileName}</span>
            {wasChanged && (
              <span className="mt-1 block text-muted-foreground">
                Some characters cannot be used in a file name, so they were removed.
              </span>
            )}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button disabled={!canConfirm} loading={isBusy} onClick={confirm}>
            Rename note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RenameNoteDialog;
