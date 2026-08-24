import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UnsavedChangesDialogProps {
  /** True while something is waiting on the answer. */
  open: boolean;
  /** Title of the note holding the unsaved edits, for naming what is at risk. */
  noteTitle: string;
  /** Throw the edits away and carry on with what the user asked for. */
  onDiscard: () => void;
  /** Stay where we are and keep the edits. */
  onCancel: () => void;
}

/**
 * Asks before throwing away unsaved edits.
 *
 * Notara saves on demand rather than as you type, so leaving a note takes the
 * buffer with it. Nothing else in the app warns about that, which made moving
 * between notes a quiet way to lose work.
 *
 * Cancel is the default action: it is the safe one, and it is what someone who
 * hit the wrong note in the sidebar actually wants.
 */
const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  noteTitle,
  onDiscard,
  onCancel,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Discard unsaved changes?</DialogTitle>
        <DialogDescription>
          {noteTitle ? `"${noteTitle}" has` : 'This note has'} edits that were never
          saved. Leaving now throws them away, and there is no way to get them back.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button variant="ghost" onClick={onCancel} autoFocus>
          Keep editing
        </Button>
        <Button variant="destructive" onClick={onDiscard}>
          Discard changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default UnsavedChangesDialog;
