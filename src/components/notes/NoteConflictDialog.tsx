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
import { AlertTriangle } from 'lucide-react';

interface NoteConflictDialogProps {
  open: boolean;
  /** Workspace-relative path of the file that changed. */
  path: string;
  isBusy: boolean;
  /** Overwrite the file with what is in the editor. */
  onKeepMine: () => void;
  /** Throw away the editor's version and load the file from disk. */
  onUseTheirs: () => void;
  onCancel: () => void;
}

/**
 * What to do when a note changed outside Notara.
 *
 * The write engine refuses to overwrite a file that moved underneath it, which
 * is the right default but leaves the user stuck if nothing offers a way out.
 * This is that way out, and it deliberately does not choose for them: both
 * versions are somebody's work, and only the person who wrote them knows which
 * one matters.
 *
 * Neither option loses the file silently. Keeping the editor's version copies
 * what is on disk into `.notara/backups` before overwriting it, and taking the
 * disk version only discards text that was never written anywhere.
 */
const NoteConflictDialog: React.FC<NoteConflictDialogProps> = ({
  open,
  path,
  isBusy,
  onKeepMine,
  onUseTheirs,
  onCancel,
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>This note changed outside Notara</DialogTitle>
        <DialogDescription>
          Something else edited this file after you opened it. Saving now would replace those
          changes, so nothing has been written yet.
        </DialogDescription>
      </DialogHeader>

      <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <span className="min-w-0 break-all font-mono text-xs">{path}</span>
      </p>

      <ul className="space-y-1 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Keep my version</span> overwrites the
          file. The version on disk is copied to <code className="text-xs">.notara/backups</code>{' '}
          first.
        </li>
        <li>
          <span className="font-medium text-foreground">Use the file on disk</span> reloads the
          note and discards what is in the editor.
        </li>
      </ul>

      {/* No default action. Picking one for the user is how work gets lost. */}
      <DialogFooter className="gap-2 sm:gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isBusy}>
          Cancel
        </Button>
        <Button variant="outline" onClick={onUseTheirs} disabled={isBusy}>
          Use the file on disk
        </Button>
        <Button variant="destructive" loading={isBusy} onClick={onKeepMine}>
          Keep my version
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default NoteConflictDialog;
