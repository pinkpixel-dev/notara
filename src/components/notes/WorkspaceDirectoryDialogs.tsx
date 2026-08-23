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
import { AlertTriangle } from 'lucide-react';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { flattenDirectories } from '@/lib/workspace/tree';
import { nameOf, parentOf } from '@/lib/workspace/types';
import type { DeletionPreview } from '@/lib/workspace/commands';
import { toast } from '@/hooks/use-toast';

/** Which directory action is open, and what it is acting on. */
export type DirectoryAction =
  | { kind: 'create'; parentPath: string }
  | { kind: 'rename'; path: string }
  | { kind: 'move'; path: string }
  | { kind: 'delete'; path: string }
  | null;

interface WorkspaceDirectoryDialogsProps {
  action: DirectoryAction;
  onClose: () => void;
}

/** A workspace-relative path rendered the way the user thinks about it. */
const displayPath = (path: string, rootName: string): string =>
  path ? `${rootName}/${path}` : rootName;

const WorkspaceDirectoryDialogs: React.FC<WorkspaceDirectoryDialogsProps> = ({
  action,
  onClose,
}) => {
  const { scan, createDirectory, renameEntry, moveEntry, deleteEntry, previewDeletion } =
    useWorkspace();

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);

  const rootName = scan?.root.name ?? 'Workspace';

  const directoryOptions = useMemo(() => {
    if (!scan) {
      return [];
    }
    return flattenDirectories(scan.root).map((directory) => ({
      path: directory.path,
      label: displayPath(directory.path, rootName),
    }));
  }, [rootName, scan]);

  // Each opening starts clean, so a failed attempt does not leave its error or
  // its half-typed name behind for the next one.
  useEffect(() => {
    setError(null);
    setPreview(null);
    setIsBusy(false);

    if (!action) {
      setName('');
      setDestination('');
      return;
    }

    if (action.kind === 'create') {
      setName('');
      return;
    }

    if (action.kind === 'rename') {
      setName(nameOf(action.path));
      return;
    }

    if (action.kind === 'move') {
      setDestination(parentOf(action.path));
    }
  }, [action]);

  useEffect(() => {
    if (action?.kind !== 'delete') {
      return;
    }

    let cancelled = false;
    void previewDeletion(action.path).then((result) => {
      if (!cancelled) {
        setPreview(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [action, previewDeletion]);

  const run = async (task: () => Promise<unknown>, successMessage: string) => {
    setIsBusy(true);
    setError(null);
    try {
      await task();
      toast({ title: successMessage });
      onClose();
    } catch (thrown) {
      setError((thrown as Error)?.message ?? 'That action failed.');
    } finally {
      setIsBusy(false);
    }
  };

  if (!action) {
    return null;
  }

  const errorMessage = error ? (
    <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  ) : null;

  if (action.kind === 'create' || action.kind === 'rename') {
    const isCreate = action.kind === 'create';
    const target = isCreate ? action.parentPath : parentOf(action.path);
    const canSubmit = name.trim().length > 0 && !isBusy;

    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isCreate ? 'New folder' : 'Rename'}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? `A new folder inside ${displayPath(target, rootName)}.`
                : `Renaming ${displayPath(action.path, rootName)} on disk.`}
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit) {
                return;
              }
              void run(
                () =>
                  isCreate
                    ? createDirectory(action.parentPath, name)
                    : renameEntry(action.path, name),
                isCreate ? 'Folder created' : 'Renamed'
              );
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="workspace-directory-name">Name</Label>
              <Input
                id="workspace-directory-name"
                value={name}
                autoFocus
                onChange={(event) => setName(event.target.value)}
                placeholder="Project notes"
              />
            </div>

            {errorMessage}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit} loading={isBusy}>
                {isCreate ? 'Create folder' : 'Rename'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  if (action.kind === 'move') {
    const currentParent = parentOf(action.path);
    // A folder cannot land inside itself, and moving it where it already sits
    // is a no-op, so neither is offered.
    const choices = directoryOptions.filter(
      (option) =>
        option.path !== action.path &&
        !option.path.startsWith(`${action.path}/`) &&
        option.path !== currentParent
    );

    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move folder</DialogTitle>
            <DialogDescription>
              Moving {displayPath(action.path, rootName)} moves the real folder and everything in
              it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-move-destination">Destination</Label>
              {choices.length ? (
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger id="workspace-move-destination">
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
                  There is nowhere else to move this folder yet.
                </p>
              )}
            </div>

            {errorMessage}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!destination || isBusy}
                loading={isBusy}
                onClick={() =>
                  void run(
                    () => moveEntry(action.path, destination === '/' ? '' : destination),
                    'Folder moved'
                  )
                }
              >
                Move folder
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const contents = preview
    ? `${preview.fileCount} ${preview.fileCount === 1 ? 'file' : 'files'} and ${
        preview.directoryCount
      } ${preview.directoryCount === 1 ? 'folder' : 'folders'}`
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete folder</DialogTitle>
          <DialogDescription>
            This deletes {displayPath(action.path, rootName)} from disk. It cannot be undone from
            inside Notara.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* The count comes from the real folder, so the confirmation says what
              is actually at stake rather than a generic warning. */}
          <p className="rounded-md border border-border surface-elevated px-3 py-2 text-sm">
            {contents ? `Contains ${contents}.` : 'Checking what this folder contains...'}
          </p>

          {errorMessage}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={isBusy}
              onClick={() => void run(() => deleteEntry(action.path), 'Folder deleted')}
            >
              Delete folder
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkspaceDirectoryDialogs;
