import React, { useState } from 'react';
import { ChevronRight, FileText, FolderPlus, Folder, MoreHorizontal, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useWorkspace } from '@/context/WorkspaceContextTypes';
import type { WorkspaceDirectory } from '@/lib/workspace/types';
import WorkspaceDirectoryDialogs, { type DirectoryAction } from './WorkspaceDirectoryDialogs';

/** Indent per level. Kept small so deep folders still fit a narrow notes bar. */
const INDENT_REM = 0.75;

interface DirectoryNodeProps {
  directory: WorkspaceDirectory;
  depth: number;
  isRoot: boolean;
  onAction: (action: DirectoryAction) => void;
}

const DirectoryNode: React.FC<DirectoryNodeProps> = ({ directory, depth, isRoot, onAction }) => {
  const { expandedDirectories, toggleDirectory, canManageDirectories } = useWorkspace();
  const isExpanded = expandedDirectories.has(directory.path);
  const contentId = `workspace-group-${directory.path || 'root'}`;
  const isEmpty = directory.directories.length === 0 && directory.files.length === 0;

  return (
    <li>
      <div className="group relative flex items-stretch">
        {/* One disclosure button per group. A native button carries its own
            keyboard and touch behavior, so the tree needs no key handling of
            its own and stays usable by tap, mouse, and keyboard alike. */}
        <button
          type="button"
          onClick={() => toggleDirectory(directory.path)}
          aria-expanded={isExpanded}
          aria-controls={contentId}
          style={{ paddingLeft: `${0.5 + depth * INDENT_REM}rem` }}
          className={cn(
            'flex min-h-11 flex-1 items-center gap-2 py-1.5 pr-2 text-left text-sm transition-colors',
            'hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isRoot && 'font-medium'
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
          <span className="min-w-0 flex-1 truncate">{directory.name}</span>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {directory.totalFiles}
          </span>
        </button>

        {canManageDirectories && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Visible on touch at all times. On pointer devices it appears on
                  hover or focus so it never becomes keyboard-unreachable. */}
              <button
                type="button"
                aria-label={`Folder actions for ${directory.name}`}
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
              <DropdownMenuItem onSelect={() => onAction({ kind: 'create', parentPath: directory.path })}>
                New folder inside
              </DropdownMenuItem>
              {!isRoot && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onAction({ kind: 'rename', path: directory.path })}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onAction({ kind: 'move', path: directory.path })}>
                    Move to...
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onAction({ kind: 'delete', path: directory.path })}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Kept mounted but hidden so the browser's find-in-page still reaches
          collapsed groups. */}
      <ul id={contentId} hidden={!isExpanded}>
        {directory.directories.map((child) => (
          <DirectoryNode
            key={child.path}
            directory={child}
            depth={depth + 1}
            isRoot={false}
            onAction={onAction}
          />
        ))}

        {directory.files.map((file) => (
          <li key={file.path}>
            <div
              style={{ paddingLeft: `${1.75 + depth * INDENT_REM}rem` }}
              className="flex min-h-9 items-center gap-2 py-1 pr-2 text-sm text-muted-foreground"
            >
              <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{file.title}</span>
            </div>
          </li>
        ))}

        {isEmpty && (
          <li
            style={{ paddingLeft: `${1.75 + depth * INDENT_REM}rem` }}
            className="py-1 pr-2 text-xs text-muted-foreground"
          >
            Empty folder
          </li>
        )}
      </ul>
    </li>
  );
};

/**
 * The workspace directory tree.
 *
 * This shows the real folder structure on disk, read only. Browsing never
 * writes, so no file's modified time changes just because the tree was opened.
 * Selecting a file to edit arrives with stage 2, when Markdown files become the
 * source of truth rather than a mirror.
 */
const WorkspaceTree: React.FC = () => {
  const { scan, scanStatus, lastError, canManageDirectories, refresh } = useWorkspace();
  const [action, setAction] = useState<DirectoryAction>(null);

  if (scanStatus === 'idle') {
    return null;
  }

  return (
    <section aria-label="Workspace folders" className="border-b border-border">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <h3 className="min-w-0 flex-1 truncate pl-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Workspace
        </h3>

        {canManageDirectories && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="New folder in the workspace root"
                onClick={() => setAction({ kind: 'create', parentPath: '' })}
              >
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New folder</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
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

      {lastError && (
        <p role="status" className="px-4 pb-2 text-xs text-destructive">
          {lastError}
        </p>
      )}

      {scan ? (
        <ul className="pb-1">
          <DirectoryNode directory={scan.root} depth={0} isRoot onAction={setAction} />
        </ul>
      ) : (
        <p className="px-4 pb-3 text-xs text-muted-foreground" role="status">
          {scanStatus === 'scanning' ? 'Reading the workspace folder...' : 'No folder to show yet.'}
        </p>
      )}

      <WorkspaceDirectoryDialogs action={action} onClose={() => setAction(null)} />
    </section>
  );
};

export default WorkspaceTree;
