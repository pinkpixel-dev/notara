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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNotes } from '@/context/NotesContextTypes';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { flattenDirectories } from '@/lib/workspace/tree';
import { joinRelative } from '@/lib/workspace/types';
import { MAX_TITLE_LENGTH, NOTE_EXTENSION, titleToFileName, uniqueNotePath } from '@/lib/notes/naming';

interface SaveAsDialogProps {
  open: boolean;
  /** Title to start from, usually the note being copied. */
  initialTitle: string;
  /** Folder to start in, usually the folder the note is already in. */
  initialDirectory: string;
  isBusy: boolean;
  onConfirm: (directory: string, title: string) => void;
  onCancel: () => void;
}

/**
 * The workspace root has an empty path, which a Select cannot use as a value.
 * A slash stands in for it and is mapped back before the save runs.
 */
const ROOT_VALUE = '/';

const displayPath = (path: string, rootName: string): string =>
  path ? `${rootName}/${path}` : rootName;

/**
 * Saves a copy of the open note to another place in the workspace.
 *
 * The original file is not touched. The copy is a new note, and the editor
 * moves to it once the write lands, which is what people expect Save As to do.
 *
 * There is no Open, so every destination is inside the workspace. That keeps
 * this to a folder and a name rather than a system save dialog, which could
 * return a path the workspace guard would refuse anyway.
 */
const SaveAsDialog: React.FC<SaveAsDialogProps> = ({
  open,
  initialTitle,
  initialDirectory,
  isBusy,
  onConfirm,
  onCancel,
}) => {
  const { notes } = useNotes();
  const { scan } = useWorkspace();
  const [title, setTitle] = useState(initialTitle);
  const [directory, setDirectory] = useState(initialDirectory || ROOT_VALUE);

  const rootName = scan?.root.name ?? 'Workspace';

  // Each opening starts from the note being copied, so a cancelled attempt does
  // not leave its half-made choice behind.
  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setDirectory(initialDirectory || ROOT_VALUE);
    }
  }, [initialDirectory, initialTitle, open]);

  const choices = useMemo(() => {
    if (!scan) {
      return [];
    }
    return flattenDirectories(scan.root).map((entry) => ({
      value: entry.path || ROOT_VALUE,
      label: displayPath(entry.path, rootName),
    }));
  }, [rootName, scan]);

  const trimmed = title.trim();
  const targetDirectory = directory === ROOT_VALUE ? '' : directory;

  /**
   * The path the save will actually use.
   *
   * Notara never overwrites an existing note here. A name already in use gets a
   * counter, and the preview shows the result, so the copy cannot quietly land
   * on top of something else.
   */
  const targetPath = useMemo(
    () =>
      trimmed === ''
        ? ''
        : uniqueNotePath(
            targetDirectory,
            trimmed,
            notes.map((note) => note.path)
          ),
    [notes, targetDirectory, trimmed]
  );

  const requestedPath =
    trimmed === ''
      ? ''
      : joinRelative(targetDirectory, `${titleToFileName(trimmed)}${NOTE_EXTENSION}`);
  const wasRenamed = targetPath !== '' && targetPath !== requestedPath;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !isBusy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save a copy</DialogTitle>
          <DialogDescription>
            This writes a new note and leaves the original file exactly as it is. The
            editor moves to the copy once it is saved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="save-as-title">Title</Label>
          <Input
            id="save-as-title"
            value={title}
            maxLength={MAX_TITLE_LENGTH}
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && trimmed !== '' && !isBusy) {
                event.preventDefault();
                onConfirm(targetDirectory, trimmed);
              }
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="save-as-directory">Folder</Label>
          <Select value={directory} onValueChange={setDirectory}>
            <SelectTrigger id="save-as-directory">
              <SelectValue placeholder="Choose a folder" />
            </SelectTrigger>
            <SelectContent>
              {choices.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetPath && (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <span className="text-muted-foreground">Saves as </span>
            <span className="break-all font-mono">{displayPath(targetPath, rootName)}</span>
            {wasRenamed && (
              <span className="mt-1 block text-muted-foreground">
                A note with that name is already in this folder, so the copy gets a
                number. Nothing is overwritten.
              </span>
            )}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            disabled={trimmed === '' || isBusy}
            loading={isBusy}
            onClick={() => onConfirm(targetDirectory, trimmed)}
          >
            Save copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveAsDialog;
