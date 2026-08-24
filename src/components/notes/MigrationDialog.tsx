import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useNotes } from '@/context/NotesContextTypes';
import type { LegacySource } from '@/lib/notes/migrate';

/** How many titles to list before summarising the rest. */
const PREVIEW_LIMIT = 8;

const SOURCE_LABELS: Record<LegacySource, string> = {
  'workspace-json': 'the old notes file in this folder',
  'browser-storage': 'your browser storage',
};

/**
 * Offers to import notes left in Notara's old storage.
 *
 * Notes used to be records rather than files: a JSON bundle in the workspace on
 * desktop, and `localStorage` in the browser. Neither is read any more, so
 * those notes are invisible until they are turned into Markdown files.
 *
 * The import is shown before it happens because it writes into a folder the
 * user owns. Nothing is removed from the old storage either way, so declining
 * costs nothing and a bad result can be deleted with the originals intact.
 */
const MigrationDialog: React.FC = () => {
  const { pendingMigration, runMigration, dismissMigration } = useNotes();
  const [isBusy, setIsBusy] = useState(false);

  if (!pendingMigration) {
    return null;
  }

  const { total, titles, found } = pendingMigration;
  const shown = titles.slice(0, PREVIEW_LIMIT);
  const remaining = total - shown.length;

  const confirm = async () => {
    setIsBusy(true);
    try {
      const result = await runMigration();
      if (!result) {
        return;
      }

      if (result.written.length > 0) {
        toast({
          title: `${result.written.length} note${
            result.written.length === 1 ? '' : 's'
          } imported`,
          description:
            result.failures.length > 0
              ? `${result.failures.length} could not be written. Your old notes were left alone.`
              : 'They are in your workspace folder now. Your old notes were left alone.',
          variant: result.failures.length > 0 ? 'destructive' : undefined,
        });
        return;
      }

      toast({
        title: 'Nothing was imported',
        description: 'Your old notes were left alone.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Failed to import old notes', error);
      toast({
        title: 'Import failed',
        description:
          (error instanceof Error && error.message) ||
          'Unable to write the old notes. Nothing was removed.',
        variant: 'destructive',
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !isBusy && dismissMigration()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Import {total} older {total === 1 ? 'note' : 'notes'}?
          </DialogTitle>
          <DialogDescription>
            Notara found {total === 1 ? 'a note' : 'notes'} in{' '}
            {found.map((entry) => SOURCE_LABELS[entry.source]).join(' and ')}. Importing
            writes {total === 1 ? 'it' : 'them'} into your workspace folder as Markdown
            files. Nothing is removed from the old storage.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
          {shown.map((title, index) => (
            <li key={`${title}-${index}`} className="truncate font-mono">
              {title}
            </li>
          ))}
          {remaining > 0 && (
            <li className="text-muted-foreground">and {remaining} more</li>
          )}
        </ul>

        <p className="text-xs text-muted-foreground">
          Everything lands at the top level of your workspace. You can move notes into
          folders afterwards.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={dismissMigration} disabled={isBusy}>
            Not now
          </Button>
          <Button onClick={confirm} loading={isBusy} disabled={isBusy}>
            Import {total === 1 ? 'note' : 'notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MigrationDialog;
