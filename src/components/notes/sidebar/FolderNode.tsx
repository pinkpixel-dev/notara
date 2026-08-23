import React from 'react';
import { ChevronRight, Folder, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import type { Note } from '@/types';
import type { NoteTreeFolder } from '@/lib/notes/tree';
import type { DirectoryAction } from '../WorkspaceDirectoryDialogs';
import NoteRow from './NoteRow';

/** Indent per level. Small, so a deep folder still fits a narrow sidebar. */
const INDENT_REM = 0.75;

interface FolderNodeProps {
  folder: NoteTreeFolder;
  depth: number;
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onUnpinNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  onFolderAction: (action: DirectoryAction) => void;
}

/**
 * One folder group and everything under it.
 *
 * The disclosure is a native button, so the tree needs no key handling of its
 * own and works by tap, mouse, and keyboard alike. Children stay mounted while
 * collapsed and are hidden instead, which keeps the browser's find-in-page able
 * to reach a note inside a closed folder.
 */
const FolderNode: React.FC<FolderNodeProps> = ({
  folder,
  depth,
  activeNoteId,
  onSelectNote,
  onUnpinNote,
  onDeleteNote,
  onFolderAction,
}) => {
  const { expandedDirectories, toggleDirectory, canManageDirectories } = useWorkspace();
  const isExpanded = expandedDirectories.has(folder.path);
  const contentId = `notes-folder-${folder.path}`;
  const isEmpty = folder.folders.length === 0 && folder.notes.length === 0;

  return (
    <li>
      <div className="group relative flex items-stretch">
        <button
          type="button"
          onClick={() => toggleDirectory(folder.path)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          style={{ paddingLeft: `${0.5 + depth * INDENT_REM}rem` }}
          className={cn(
            'flex min-h-11 flex-1 items-center gap-2 py-1.5 pr-2 text-left text-sm transition-colors',
            'hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-inset focus-visible:ring-ring'
          )}
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isExpanded && 'rotate-90'
            )}
          />
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {folder.noteCount}
          </span>
        </button>

        {canManageDirectories && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Folder actions for ${folder.name}`}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground',
                  'transition-colors hover:bg-accent hover:text-foreground',
                  'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
                  'data-[state=open]:opacity-100'
                )}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => onFolderAction({ kind: 'create', parentPath: folder.path })}
              >
                New folder inside
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onFolderAction({ kind: 'rename', path: folder.path })}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onFolderAction({ kind: 'move', path: folder.path })}>
                Move to...
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => onFolderAction({ kind: 'delete', path: folder.path })}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <ul id={contentId} hidden={!isExpanded}>
        {folder.folders.map((child) => (
          <FolderNode
            key={child.path}
            folder={child}
            depth={depth + 1}
            activeNoteId={activeNoteId}
            onSelectNote={onSelectNote}
            onUnpinNote={onUnpinNote}
            onDeleteNote={onDeleteNote}
            onFolderAction={onFolderAction}
          />
        ))}

        {folder.notes.map((note) => (
          <NoteRow
            key={note.id}
            note={note}
            depth={depth + 1}
            isActive={activeNoteId === note.id}
            onSelect={onSelectNote}
            onUnpin={onUnpinNote}
            onDelete={onDeleteNote}
          />
        ))}

        {isEmpty && (
          <li
            style={{ paddingLeft: `${1.75 + depth * INDENT_REM}rem` }}
            className="py-1.5 pr-2 text-xs text-muted-foreground"
          >
            Empty folder
          </li>
        )}
      </ul>
    </li>
  );
};

export default FolderNode;
