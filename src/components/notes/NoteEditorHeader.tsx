import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Pin, Plus, Star } from 'lucide-react';
import TagSelector from './TagSelector';
import type { NoteTag } from '@/types';
import type { NoteSaveStatus } from './useNotePersistence';

/** How the editor body is laid out. */
export type EditorMode = 'edit' | 'split' | 'preview';

const MODES: Array<{ id: EditorMode; label: string }> = [
  { id: 'edit', label: 'Edit' },
  { id: 'split', label: 'Split' },
  { id: 'preview', label: 'Preview' },
];

interface NoteEditorHeaderProps {
  isPinned: boolean;
  isStarred: boolean;
  mode: EditorMode;
  isSaving: boolean;
  saveStatus: NoteSaveStatus;
  /** A note with no file yet cannot be copied, so Save as is unavailable. */
  isNew: boolean;
  selectedTags: NoteTag[];
  availableTags: NoteTag[];
  onTogglePin: () => void;
  onToggleStar: () => void;
  onModeChange: (mode: EditorMode) => void;
  onTagsChange: (tags: NoteTag[]) => void;
  onCreateNote?: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

/**
 * The editor's toolbar row.
 *
 * Split out of `NoteEditor` to keep that file under the repository's size
 * limit. It holds no state of its own: everything here is owned by the editor,
 * because the buffer it acts on lives there.
 */
const NoteEditorHeader: React.FC<NoteEditorHeaderProps> = ({
  isPinned,
  isStarred,
  mode,
  isSaving,
  saveStatus,
  isNew,
  selectedTags,
  availableTags,
  onTogglePin,
  onToggleStar,
  onModeChange,
  onTagsChange,
  onCreateNote,
  onSave,
  onSaveAs,
}) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Pinning keeps a note at the top of the notes bar and is capped.
            Starring marks it important and is not. They are separate
            controls because they answer different questions. */}
        <button
          type="button"
          onClick={onTogglePin}
          disabled={isSaving}
          className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
            isPinned ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
          aria-pressed={isPinned}
          aria-label={isPinned ? 'Unpin note' : 'Pin note'}
          title={isPinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin className={`h-5 w-5 ${isPinned ? 'fill-current' : 'fill-transparent'}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onToggleStar}
          disabled={isSaving}
          className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
            isStarred ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
          aria-pressed={isStarred}
          aria-label={isStarred ? 'Unstar note' : 'Star note'}
          title={isStarred ? 'Unstar note' : 'Star note'}
        >
          <Star className={`h-5 w-5 ${isStarred ? 'fill-current' : 'fill-transparent'}`} aria-hidden="true" />
        </button>
        {/* One control with three states, rather than a Preview toggle plus a
            separate full-screen dialog. The mode is a property of the editor,
            so it belongs in the editor rather than in a window over it. */}
        <div className="flex gap-1 rounded-md border border-border p-0.5" role="group" aria-label="Editor mode">
          {MODES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onModeChange(option.id)}
              aria-pressed={mode === option.id}
              className={cn(
                'min-h-9 whitespace-nowrap rounded px-3 text-sm font-medium transition-colors',
                mode === option.id
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <TagSelector
          selectedTags={selectedTags}
          onChange={onTagsChange}
          availableTags={availableTags}
        />
        <Button
          onClick={onCreateNote}
          disabled={!onCreateNote}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Note
        </Button>
        {/* Named rather than shown only as a colour, so the state is
            readable without relying on seeing the dot. */}
        <span
          className={cn(
            'ml-2 flex items-center gap-1.5 whitespace-nowrap text-xs',
            saveStatus === 'error' || saveStatus === 'conflict'
              ? 'text-destructive'
              : 'text-muted-foreground'
          )}
          role={saveStatus === 'error' || saveStatus === 'conflict' ? 'alert' : 'status'}
          aria-live={saveStatus === 'error' || saveStatus === 'conflict' ? 'assertive' : 'polite'}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              saveStatus === 'saved' && 'bg-emerald-500',
              (saveStatus === 'unsaved' || saveStatus === 'not-saved') && 'bg-primary',
              saveStatus === 'saving' && 'bg-amber-500',
              (saveStatus === 'error' || saveStatus === 'conflict') && 'bg-destructive'
            )}
            aria-hidden="true"
          />
          {{
            'not-saved': 'Not saved',
            saved: 'Saved',
            unsaved: 'Unsaved',
            saving: 'Saving...',
            error: 'Save failed',
            conflict: 'Changed on disk',
          }[saveStatus]}
        </span>
        {/* Save and Save As sit together, because they answer the same
            question and only differ in where the write lands. Save As is a
            menu rather than a second button so the primary action stays
            obvious. */}
        <div className="ml-2 flex items-center">
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="rounded-r-none"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={isSaving || isNew}
                aria-label="More save options"
                className="rounded-l-none border-l border-primary-foreground/20 px-2"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onSaveAs}>
                Save as...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
);

export default NoteEditorHeader;
