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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useNotes } from '@/context/NotesContextTypes';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { flattenDirectories } from '@/lib/workspace/tree';
import { parentOf } from '@/lib/workspace/types';
import type { Note } from '@/types';

interface MoveNoteDialogProps {
  /** The note being moved, or null when the dialog is closed. */
  note: Note | null;
  onClose: () => void;
}

/** The root is shown by its folder name, so the path reads the way it looks on disk. */
const displayPath = (path: string, rootName: string): string =>
  path ? `${rootName}/${path}` : rootName;

/**
 * Moves a note into another workspace folder.
 *
 * This moves a real file, so the destination path is shown before anything is
 * written, the same way the folder actions do it. Pinning, starring, and tags
 * are untouched: only the directory changes.
 */
const MoveNoteDialog: React.FC<MoveNoteDialogProps> = ({ note, onClose }) => {
  const { moveNote } = useNotes();
  const { scan } = useWorkspace();
  const [destination, setDestination] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootName = scan?.root.name ?? 'Workspace';
  const currentDirectory = note ? parentOf(note.path) : '';

  // Each opening starts clean, so a failed attempt does not leave its error or
  // its half-made choice behind for the next note.
  useEffect(() => {
    setDestination('');
    setError(null);
  }, [note]);

  const choices = useMemo(() => {
    if (!scan) {
      return [];
    }

    return flattenDirectories(scan.root)
      .map((directory) => ({
        path: directory.path,
        label: displayPath(directory.path, rootName),
      }))
      // The folder the note is already in is not somewhere to move it to.
      .filter((option) => option.path !== currentDirectory);
  }, [currentDirectory, rootName, scan]);

  const confirm = async () => {
    if (!note || destination === '') {
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const moved = await moveNote(note.id, destination === '/' ? '' : destination);
      toast({
        title: 'Note moved',
        description: moved ? `Now at ${moved.path}.` : 'The note was moved.',
      });
      onClose();
    } catch (thrown) {
      setError((thrown as Error)?.message ?? 'That note could not be moved.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open={note !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move note</DialogTitle>
          <DialogDescription>
            This moves the Markdown file into another folder in your workspace. Its tags, pin,
            and star stay as they are.
          </DialogDescription>
        </DialogHeader>

        {note && (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">From </span>
            <span className="break-all font-mono">{displayPath(note.path, rootName)}</span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="move-note-destination">Destination folder</Label>
          {choices.length > 0 ? (
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger id="move-note-destination">
                <SelectValue placeholder="Choose a folder" />
              </SelectTrigger>
              <SelectContent>
                {choices.map((option) => (
                  <SelectItem key={option.path || 'root'} value={option.path || '/'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground">
              There is nowhere else to put this note yet. Create a folder first.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button disabled={destination === '' || isBusy} loading={isBusy} onClick={confirm}>
            Move note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MoveNoteDialog;
