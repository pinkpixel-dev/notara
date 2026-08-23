import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderPlus, Plus, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import { useElementWidth } from '@/hooks/use-element-width';
import { useNotes } from '@/context/NotesContextTypes';
import { toast } from '@/hooks/use-toast';
import { buildNoteTree } from '@/lib/notes/tree';
import { flattenDirectories } from '@/lib/workspace/tree';
import type { Note } from '@/types';
import WorkspaceDirectoryDialogs, { type DirectoryAction } from '../WorkspaceDirectoryDialogs';
import NotesEmptyState from '../NotesEmptyState';
import FolderNode from './FolderNode';
import NoteRow from './NoteRow';

/** Which slice of the notes the sidebar is showing. */
type NoteFilter = 'all' | 'starred';

interface NotesSidebarProps {
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onRenameNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onDeleteNote: (note: Note) => void;
  /** Starts a new note in a folder. The empty string is the workspace root. */
  onCreateNote: (directory: string) => void;
}

/**
 * The notes sidebar.
 *
 * One list, not two. Folders come from the workspace scan, notes sit inside the
 * folder their file is in, and pinned notes are lifted to the top. This replaces
 * the old arrangement where a directory tree sat above a separate flat list of
 * the same notes, which showed everything twice.
 *
 * Searching and the Starred filter both drop the tree and show flat results.
 * Folders are how you browse; when you already know what you are looking for,
 * grouping just adds rows between you and it.
 */
const NotesSidebar: React.FC<NotesSidebarProps> = ({
  activeNoteId,
  onSelectNote,
  onRenameNote,
  onMoveNote,
  onDeleteNote,
  onCreateNote,
}) => {
  const { notes, notesStatus, togglePin, toggleStar } = useNotes();
  const { scan, scanStatus, canManageDirectories, refresh } = useWorkspace();

  // The sidebar is resizable, so its contents react to its own width rather
  // than the window's. A viewport breakpoint would say "desktop" while this
  // pane sits at 240 pixels.
  const [sidebarRef, sidebarWidth] = useElementWidth<HTMLDivElement>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<NoteFilter>('all');
  const [folderAction, setFolderAction] = useState<DirectoryAction>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useEffect(() => {
    window.addEventListener('notara:focus-note-search', focusSearchInput);
    return () => window.removeEventListener('notara:focus-note-search', focusSearchInput);
  }, [focusSearchInput]);

  const query = searchQuery.trim().toLowerCase();

  const matches = useMemo(() => {
    if (query === '') {
      return notes;
    }
    return notes.filter(
      (note) =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.name.toLowerCase().includes(query))
    );
  }, [notes, query]);

  const starredCount = useMemo(
    () => notes.filter((note) => note.isStarred).length,
    [notes]
  );

  // Every directory the scan found, so a folder with nothing in it still shows.
  const directoryPaths = useMemo(
    () =>
      scan
        ? flattenDirectories(scan.root)
            .map((directory) => directory.path)
            .filter((path) => path !== '')
        : [],
    [scan]
  );

  const tree = useMemo(() => buildNoteTree(matches, directoryPaths), [matches, directoryPaths]);

  const isFlat = query !== '' || filter === 'starred';
  const flatNotes = useMemo(
    () =>
      isFlat
        ? [...(filter === 'starred' ? matches.filter((note) => note.isStarred) : matches)].sort(
            (left, right) =>
              new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
          )
        : [],
    [filter, isFlat, matches]
  );

  // Both write the note's file, so a failure is reported rather than dropped.
  const handleTogglePin = useCallback(
    (note: Note) => {
      void togglePin(note.id).then((result) => {
        if (!result.ok) {
          toast({ title: 'Could not pin', description: result.reason, variant: 'destructive' });
        }
      });
    },
    [togglePin]
  );

  const handleToggleStar = useCallback(
    (note: Note) => {
      void toggleStar(note.id).catch((error) => {
        toast({
          title: 'Could not update the note',
          description: error instanceof Error ? error.message : 'Unable to write the note file.',
          variant: 'destructive',
        });
      });
    },
    [toggleStar]
  );

  const isEmpty = isFlat ? flatNotes.length === 0 : tree.total === 0 && directoryPaths.length === 0;

  /**
   * Shorter filter labels once the pane gets narrow.
   *
   * "All notes" and "Starred" plus the two folder actions need about 300 pixels
   * to sit on one row. Below that the labels drop to "All" and "Starred", which
   * is the difference between a readable row and a clipped one. 0 means the
   * width has not been measured yet, so the full labels stand in.
   */
  const isCompact = sidebarWidth > 0 && sidebarWidth < 300;

  const hasWorkspace = notesStatus !== 'no-workspace';

  return (
    <div ref={sidebarRef} className="flex h-full flex-col surface-content">
      {/* Creating a note or a folder used to be reachable only from a folder's
          own menu, which meant an empty workspace had nowhere obvious to start.
          These sit above search because they act on the whole workspace, while
          the row below filters what is already in it. */}
      <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
        {/* A note is a file, so there is nowhere to put one until a folder is
            chosen. The empty state hides its own Create Note for the same
            reason: letting someone write a note that cannot be saved is worse
            than not offering it. */}
        {hasWorkspace && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="New note in the workspace root"
                onClick={() => onCreateNote('')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New note</TooltipContent>
          </Tooltip>
        )}

        {canManageDirectories && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="New folder in the workspace root"
                onClick={() => setFolderAction({ kind: 'create', parentPath: '' })}
              >
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New folder</TooltipContent>
          </Tooltip>
        )}

        <span className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Rescan the workspace folder"
              onClick={() => void refresh()}
            >
              <RefreshCw
                className={cn('h-4 w-4', scanStatus === 'scanning' && 'animate-spin')}
                aria-hidden="true"
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rescan folder</TooltipContent>
        </Tooltip>
      </div>

      <div className="border-b border-border p-3">
        <div className="relative">
          <label htmlFor="note-search" className="sr-only">
            Search notes
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="note-search"
            ref={searchInputRef}
            type="search"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearchQuery('');
              }
            }}
            className="min-h-11 w-full rounded-md surface-input border border-border py-2 pl-9 pr-10 text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-1 border-b border-border px-3 py-2"
        role="group"
        aria-label="Filter notes"
      >
        {(
          [
            { id: 'all' as const, label: isCompact ? 'All' : 'All notes', count: notes.length },
            { id: 'starred' as const, label: 'Starred', count: starredCount },
          ]
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            aria-pressed={filter === option.id}
            className={cn(
              'min-h-11 flex-1 whitespace-nowrap rounded-md text-sm font-medium transition-colors',
              isCompact ? 'px-2' : 'px-3',
              filter === option.id
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {option.label}
            <span className="ml-1.5 text-xs tabular-nums opacity-70">{option.count}</span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isFlat ? (
          <>
            {query !== '' && (
              <p
                className="surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                role="status"
              >
                {flatNotes.length} {flatNotes.length === 1 ? 'result' : 'results'}
              </p>
            )}
            <ul>
              {flatNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  depth={0}
                  isActive={activeNoteId === note.id}
                  onSelect={onSelectNote}
                  onTogglePin={handleTogglePin}
                  onToggleStar={handleToggleStar}
                  onRename={onRenameNote}
                  onMove={onMoveNote}
                  onDelete={onDeleteNote}
                />
              ))}
            </ul>
          </>
        ) : (
          <>
            {/* Pinned notes sit above the folders and are not repeated inside
                them. Unpinning a note drops it back where its file lives. */}
            {tree.pinned.length > 0 && (
              <ul aria-label="Pinned notes">
                {tree.pinned.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    depth={0}
                    isActive={activeNoteId === note.id}
                    onSelect={onSelectNote}
                    onTogglePin={handleTogglePin}
                    onToggleStar={handleToggleStar}
                    onRename={onRenameNote}
                    onMove={onMoveNote}
                    onDelete={onDeleteNote}
                  />
                ))}
              </ul>
            )}

            <ul>
              {tree.folders.map((folder) => (
                <FolderNode
                  key={folder.path}
                  folder={folder}
                  depth={0}
                  activeNoteId={activeNoteId}
                  onSelectNote={onSelectNote}
                  onTogglePinNote={handleTogglePin}
                  onToggleStarNote={handleToggleStar}
                  onRenameNote={onRenameNote}
                  onMoveNote={onMoveNote}
                  onDeleteNote={onDeleteNote}
                  onCreateNote={onCreateNote}
                  onFolderAction={setFolderAction}
                />
              ))}
            </ul>

            {tree.uncategorized.length > 0 && (
              <section aria-label="Uncategorized notes">
                {/* Only worth a heading when there are folders to tell it apart
                    from. In a flat workspace it is just the list of notes. */}
                {tree.folders.length > 0 && (
                  <h3 className="surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Uncategorized
                  </h3>
                )}
                <ul>
                  {tree.uncategorized.map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      depth={0}
                      isActive={activeNoteId === note.id}
                      onSelect={onSelectNote}
                      onTogglePin={handleTogglePin}
                      onToggleStar={handleToggleStar}
                      onRename={onRenameNote}
                      onMove={onMoveNote}
                      onDelete={onDeleteNote}
                    />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {isEmpty &&
          (isFlat ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">
              {filter === 'starred' && query === ''
                ? 'No starred notes yet. Star a note to keep it here.'
                : 'No matching notes'}
            </p>
          ) : (
            <NotesEmptyState status={notesStatus} />
          ))}
      </div>

      <WorkspaceDirectoryDialogs action={folderAction} onClose={() => setFolderAction(null)} />
    </div>
  );
};

export default NotesSidebar;
