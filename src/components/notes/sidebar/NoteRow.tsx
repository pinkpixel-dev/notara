import React from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Pin, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Note } from '@/types';

interface NoteRowProps {
  note: Note;
  isActive: boolean;
  /** Indent depth. Root-level rows are 0. */
  depth: number;
  onSelect: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleStar: (note: Note) => void;
  onMove: (note: Note) => void;
  onDelete: (note: Note) => void;
}

/** Indent per level, matching the folder rows so a note lines up under its group. */
const INDENT_REM = 0.75;

/**
 * One note in the sidebar.
 *
 * Two lines, title and date, which is dense enough that a folder of twenty
 * notes is still scannable. The excerpt and tag chips the old note cards showed
 * are gone on purpose: at this width they wrapped or truncated to the point of
 * telling you nothing, and they cost more than twice the vertical space.
 *
 * The row is a real button so it is reachable by keyboard and announced as a
 * control. The pin and delete actions are siblings rather than children,
 * because a button cannot be nested inside another button.
 */
const NoteRow: React.FC<NoteRowProps> = ({
  note,
  isActive,
  depth,
  onSelect,
  onTogglePin,
  onToggleStar,
  onMove,
  onDelete,
}) => {
  const title = note.title || 'Untitled';
  const updated = new Date(note.updatedAt);
  const dateLabel = Number.isNaN(updated.getTime()) ? '' : format(updated, 'd MMM yyyy');

  return (
    <li className="group relative flex items-stretch">
      <button
        type="button"
        onClick={() => onSelect(note)}
        aria-current={isActive ? 'true' : undefined}
        style={{ paddingLeft: `${1.75 + depth * INDENT_REM}rem` }}
        className={cn(
          'flex min-h-11 flex-1 flex-col justify-center gap-0.5 py-1.5 pr-2 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          isActive ? 'bg-accent' : 'hover:bg-accent/60'
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-sm',
              isActive ? 'text-foreground' : 'text-foreground/90'
            )}
          >
            {title}
          </span>
          {note.isStarred && (
            <Star
              className="h-3.5 w-3.5 shrink-0 fill-current text-primary"
              aria-label="Starred"
            />
          )}
        </span>
        <span className="truncate text-xs text-muted-foreground">{dateLabel}</span>
      </button>

      {/* A pinned row carries its own unpin control, so the way back is in the
          same place as the thing it undid. Everything else lives in the menu,
          which keeps the row to one visible action instead of a strip of
          icons. */}
      {note.isPinned && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onTogglePin(note)}
              aria-label={`Unpin ${title}`}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
                'text-primary transition-colors hover:bg-accent'
              )}
            >
              <Pin className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Unpin</TooltipContent>
        </Tooltip>
      )}

      {/* Always there on touch. On pointer devices it appears on hover or when
          it takes focus, so it never becomes keyboard-unreachable. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${title}`}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
              'text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
              'data-[state=open]:opacity-100'
            )}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onTogglePin(note)}>
            {note.isPinned ? 'Unpin' : 'Pin to top'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onToggleStar(note)}>
            {note.isStarred ? 'Remove star' : 'Star'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onMove(note)}>Move to...</DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => onDelete(note)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </li>
  );
};

export default NoteRow;
