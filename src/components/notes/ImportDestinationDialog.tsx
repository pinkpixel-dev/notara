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
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { flattenDirectories } from '@/lib/workspace/tree';
import type { ImportSelection } from '@/lib/notes/import';

interface ImportDestinationDialogProps {
  /** Files already picked and read, or null when the dialog is closed. */
  selection: ImportSelection | null;
  /** True while the notes are being written. */
  isBusy: boolean;
  onConfirm: (directory: string) => void;
  onCancel: () => void;
}

/**
 * The workspace root has an empty path, which a Select cannot use as a value.
 * A slash stands in for it and is mapped back before the import runs.
 */
const ROOT_VALUE = '/';

/** The root is shown by its folder name, so the path reads the way it looks on disk. */
const displayPath = (path: string, rootName: string): string =>
  path ? `${rootName}/${path}` : rootName;

/**
 * Asks which folder imported notes should land in.
 *
 * Import used to always write to the workspace root, which meant filing
 * anything took a second trip through Move for every note. The folder list is
 * built the same way the move dialog builds it, so both read the same.
 */
const ImportDestinationDialog: React.FC<ImportDestinationDialogProps> = ({
  selection,
  isBusy,
  onConfirm,
  onCancel,
}) => {
  const { scan } = useWorkspace();
  const [destination, setDestination] = useState(ROOT_VALUE);

  const rootName = scan?.root.name ?? 'Workspace';
  const count = selection?.sources.length ?? 0;

  // The root is the sensible default, and starting fresh each time stops a
  // previous import's folder from silently applying to the next one.
  useEffect(() => {
    setDestination(ROOT_VALUE);
  }, [selection]);

  const choices = useMemo(() => {
    if (!scan) {
      return [];
    }

    return flattenDirectories(scan.root).map((directory) => ({
      value: directory.path || ROOT_VALUE,
      label: displayPath(directory.path, rootName),
    }));
  }, [rootName, scan]);

  return (
    <Dialog open={selection !== null} onOpenChange={(open) => !open && !isBusy && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Import {count} {count === 1 ? 'file' : 'files'}
          </DialogTitle>
          <DialogDescription>
            Each file becomes a new note in the folder you choose. The files you picked
            are copied and never changed.
          </DialogDescription>
        </DialogHeader>

        {selection && selection.sources.length > 0 && (
          <p className="max-h-24 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
            <span className="break-all font-mono">
              {selection.sources.map((source) => source.name).join(', ')}
            </span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="import-destination">Destination folder</Label>
          <Select value={destination} onValueChange={setDestination}>
            <SelectTrigger id="import-destination">
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

        {selection && selection.failures.length > 0 && (
          <p role="alert" className="text-sm text-destructive">
            {selection.failures.length}{' '}
            {selection.failures.length === 1 ? 'file' : 'files'} could not be read and will
            be skipped.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button
            disabled={count === 0 || isBusy}
            loading={isBusy}
            onClick={() => onConfirm(destination === ROOT_VALUE ? '' : destination)}
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportDestinationDialog;
