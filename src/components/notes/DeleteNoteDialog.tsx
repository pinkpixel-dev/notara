import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNotes } from '@/context/NotesContextTypes';
import type { Note } from '@/types';

interface DeleteNoteDialogProps {
  /** The note awaiting confirmation, or null when the dialog is closed. */
  note: Note | null;
  onClose: () => void;
}

/**
 * Confirms deleting a note.
 *
 * A note is a file on the user's disk now, so this removes something they can
 * see in their file manager and Notara has no undo for it. The path is shown
 * rather than just the title, because the title is only the file name and the
 * folder is the part that tells you which note this actually is.
 */
const DeleteNoteDialog: React.FC<DeleteNoteDialogProps> = ({ note, onClose }) => {
  const { deleteNote } = useNotes();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each opening starts clean, so a failed attempt does not leave its error
  // behind for the next note.
  useEffect(() => {
    setError(null);
  }, [note]);

  const confirm = async () => {
    if (!note) {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      await deleteNote(note.id);
      toast({ title: 'Note deleted', description: `${note.path} was removed.` });
      onClose();
    } catch (thrown) {
      setError((thrown as Error)?.message ?? 'That note could not be deleted.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this note?</DialogTitle>
          <DialogDescription>
            This deletes the file from your workspace folder. Notara cannot undo it.
          </DialogDescription>
        </DialogHeader>

        {note && (
          <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <span className="min-w-0 break-all font-mono text-xs">{note.path}</span>
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
          <Button variant="destructive" loading={isBusy} onClick={confirm}>
            Delete note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteNoteDialog;
