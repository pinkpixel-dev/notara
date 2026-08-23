import React, { useState } from 'react';
import { FileText, FolderOpen, RefreshCw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFileSystem } from '@/context/FileSystemContext';
import { useNotes } from '@/context/NotesContextTypes';
import type { NoteFilesStatus } from '@/context/notes/useNoteFiles';

/**
 * What the notes bar shows when it has no notes to show.
 *
 * Notes are Markdown files, so "nothing here" has several different causes and
 * they need different answers. No folder chosen is not the same as an empty
 * folder, and neither is the same as a folder Notara could not read. Showing
 * one generic message for all three leaves the user with no idea what to do.
 */
interface NotesEmptyStateProps {
  status: NoteFilesStatus;
}

const NotesEmptyState: React.FC<NotesEmptyStateProps> = ({ status }) => {
  const { selectDirectory, isSupported } = useFileSystem();
  const { notesError, reloadNotes } = useNotes();
  const [isBusy, setIsBusy] = useState(false);

  const runChooseFolder = async () => {
    setIsBusy(true);
    try {
      await selectDirectory();
    } finally {
      setIsBusy(false);
    }
  };

  const runReload = async () => {
    setIsBusy(true);
    try {
      await reloadNotes();
    } finally {
      setIsBusy(false);
    }
  };

  if (status === 'loading') {
    return (
      <div
        className="flex h-40 flex-col items-center justify-center px-6 text-center text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <RefreshCw className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p className="mt-3 text-sm">Reading your notes...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <TriangleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium">Could not read this folder</p>
        <p className="mt-1 text-xs text-muted-foreground" role="status">
          {notesError ?? 'Something went wrong while reading your notes.'}
        </p>
        <Button className="mt-4" variant="outline" loading={isBusy} onClick={runReload}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  if (status === 'no-workspace') {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <FolderOpen className="h-6 w-6 text-primary" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium">Choose a folder for your notes</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          Notara reads and writes plain Markdown files. Pick the folder they should live in and
          your notes appear here.
        </p>

        {isSupported ? (
          <Button className="mt-4" loading={isBusy} onClick={runChooseFolder}>
            <FolderOpen className="mr-2 h-4 w-4" aria-hidden="true" />
            Choose folder
          </Button>
        ) : (
          <p className="mt-4 max-w-xs text-xs text-muted-foreground" role="status">
            This browser cannot open a local folder. Use the desktop app, or a browser that
            supports the File System Access API.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-40 flex-col items-center justify-center px-6 text-center text-muted-foreground">
      <FileText className="h-6 w-6" aria-hidden="true" />
      <p className="mt-2 text-sm">No notes in this folder yet</p>
      <p className="mt-1 text-xs">Create one, and it is saved as a Markdown file.</p>
    </div>
  );
};

export default NotesEmptyState;
