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
  onRename: (note: Note) => void;
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
  onRename,
  onMove,
  onDelete,
}) => {
  const title = note.title || 'Untitled';
  const updated = new Date(note.updatedAt);
  const dateLabel = Number.isNaN(updated.getTime()) ? '' : format(updated, 'd MMM yyyy');

  return (
    /*
     * The highlight lives on the row, not on the button inside it, so a selected
     * note is shaded across its whole width including the indicators and the
     * menu. Shading only the text button left a strip of unhighlighted row on
     * the right of the selection.
     */
    <li
      className={cn(
        'group relative flex items-stretch transition-colors',
        isActive ? 'bg-accent' : 'hover:bg-accent/60'
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(note)}
        aria-current={isActive ? 'true' : undefined}
        style={{ paddingLeft: `${1.75 + depth * INDENT_REM}rem` }}
        className={cn(
          'flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 py-1.5 pr-2 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate text-sm',
            isActive ? 'text-foreground' : 'text-foreground/90'
          )}
        >
          {title}
        </span>
        <span className="truncate text-xs text-muted-foreground">{dateLabel}</span>
      </button>

      {/*
       * Fixed columns for the star and the pin.
       *
       * Each slot is always rendered, empty or not, so a star sits under every
       * other star and a pin under every other pin. Letting them collapse put a
       * starred note's icon exactly where a pinned note's icon was on the row
       * above, at a different offset again when a note had both.
       *
       * The width matches the touch floor on coarse pointers, where the global
       * rule widens the buttons inside these slots to 44 pixels.
       */}
      <span
        className={cn(
          'flex w-9 shrink-0 items-center justify-center',
          '[@media(pointer:coarse)]:w-11'
        )}
      >
        {note.isStarred && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onToggleStar(note)}
                aria-label={`Remove star from ${title}`}
                className="flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent-foreground/10"
              >
                <Star className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Remove star</TooltipContent>
          </Tooltip>
        )}
      </span>

      <span
        className={cn(
          'flex w-9 shrink-0 items-center justify-center',
          '[@media(pointer:coarse)]:w-11'
        )}
      >
        {note.isPinned && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onTogglePin(note)}
                aria-label={`Unpin ${title}`}
                className="flex h-9 w-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent-foreground/10"
              >
                <Pin className="h-4 w-4 fill-current" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Unpin</TooltipContent>
          </Tooltip>
        )}
      </span>

      {/* Always there on touch. On pointer devices it appears on hover or when
          it takes focus, so it never becomes keyboard-unreachable. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${title}`}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-md',
              'text-muted-foreground transition-colors hover:bg-accent-foreground/10 hover:text-foreground',
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
          <DropdownMenuItem onSelect={() => onRename(note)}>Rename</DropdownMenuItem>
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
