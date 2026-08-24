import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Maximize2, Pin, Plus, Star } from 'lucide-react';
import TagSelector from './TagSelector';
import type { NoteTag } from '@/types';

interface NoteEditorHeaderProps {
  isPinned: boolean;
  isStarred: boolean;
  isPreview: boolean;
  isFullPreviewOpen: boolean;
  isSaving: boolean;
  isDirty: boolean;
  /** A note with no file yet cannot be copied, so Save as is unavailable. */
  isNew: boolean;
  selectedTags: NoteTag[];
  availableTags: NoteTag[];
  onTogglePin: () => void;
  onToggleStar: () => void;
  onTogglePreview: () => void;
  onOpenFullPreview: () => void;
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
  isPreview,
  isFullPreviewOpen,
  isSaving,
  isDirty,
  isNew,
  selectedTags,
  availableTags,
  onTogglePin,
  onToggleStar,
  onTogglePreview,
  onOpenFullPreview,
  onTagsChange,
  onCreateNote,
  onSave,
  onSaveAs,
}) => (
    <div className="p-4 border-b border-border flex justify-between items-center">
      <div className="flex items-center gap-2">
        {/* Pinning keeps a note at the top of the notes bar and is capped.
            Starring marks it important and is not. They are separate
            controls because they answer different questions. */}
        <button
          type="button"
          onClick={onTogglePin}
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
          className={`flex h-11 w-11 items-center justify-center rounded-md transition-colors ${
            isStarred ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          }`}
          aria-pressed={isStarred}
          aria-label={isStarred ? 'Unstar note' : 'Star note'}
          title={isStarred ? 'Unstar note' : 'Star note'}
        >
          <Star className={`h-5 w-5 ${isStarred ? 'fill-current' : 'fill-transparent'}`} aria-hidden="true" />
        </button>
        <div className="flex gap-2">
          <Button
            onClick={onTogglePreview}
            variant="ghost"
            size="sm"
            className={isPreview ? 'bg-secondary' : ''}
          >
            Preview
          </Button>
          <Button
            onClick={onOpenFullPreview}
            variant="ghost"
            size="sm"
            className={isFullPreviewOpen ? 'bg-secondary' : ''}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Full Preview
          </Button>
        </div>
      </div>
      <div className="flex gap-2">
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
        {isDirty && (
          <span className="ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Unsaved
          </span>
        )}
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
