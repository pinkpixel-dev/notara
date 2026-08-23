import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Search, Star, X, FileText } from 'lucide-react';
import WorkspaceTree from './WorkspaceTree';

interface NotesListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

const NotesList: React.FC<NotesListProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNotes, setFilteredNotes] = useState<Note[]>(notes);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredNotes(notes);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredNotes(notes.filter(note =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.name.toLowerCase().includes(query))
      ));
    }
  }, [searchQuery, notes]);

  const pinnedNotes = filteredNotes.filter(note => note.isPinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.isPinned);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleFocusSearch = () => {
      focusSearchInput();
    };

    window.addEventListener('notara:focus-note-search', handleFocusSearch);
    return () => window.removeEventListener('notara:focus-note-search', handleFocusSearch);
  }, [focusSearchInput]);

  const renderNoteItem = (note: Note) => {
    const isActive = activeNoteId === note.id;
    const dateFormatted = format(new Date(note.updatedAt), 'MMM dd, yyyy');
    const title = note.title || 'Untitled';

    let preview = '';
    if (note.content) {
      preview = note.content.replace(/[#*`_[\]]/g, '').substring(0, 60);
      if (note.content.length > 60) {
        preview += '...';
      }
    }

    return (
      /* The row is a button rather than a clickable div, so it is reachable by
         keyboard and announced as a control. The delete action is a sibling
         button, because nesting one button inside another is invalid. */
      <li key={note.id} className="group relative border-b border-border">
        <button
          type="button"
          onClick={() => onSelectNote(note)}
          aria-current={isActive ? 'true' : undefined}
          className={cn(
            'w-full px-4 py-3 pr-12 text-left transition-colors',
            isActive ? 'bg-accent' : 'hover:bg-accent/60'
          )}
        >
          <span className="mb-1 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
            {note.isPinned && (
              <Star className="h-4 w-4 shrink-0 fill-current text-primary" aria-label="Pinned" />
            )}
          </span>
          <span className="mb-2 block truncate text-sm text-muted-foreground">{preview}</span>
          <span className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{dateFormatted}</span>
            <span className="flex min-w-0 gap-1">
              {note.tags.map(tag => (
                <span
                  key={tag.id}
                  className="truncate rounded-full px-1.5 py-0.5 text-xs"
                  style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
                >
                  {tag.name}
                </span>
              ))}
            </span>
          </span>
        </button>

        {/* Always available on touch. On pointer devices it appears on hover or
            when it takes focus, so it never becomes keyboard-unreachable. */}
        <button
          type="button"
          onClick={() => onDeleteNote(note.id)}
          aria-label={`Delete ${title}`}
          className={cn(
            'absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-md',
            'text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
            'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100'
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </li>
    );
  };

  const sectionHeading = (label: string) => (
    <h3 className="surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </h3>
  );

  return (
    <div className="flex h-full flex-col surface-content">
      <div className="border-b border-border p-3">
        <div className="relative">
          <label htmlFor="note-search" className="sr-only">Search notes</label>
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
            onChange={handleSearch}
            onKeyDown={handleSearchKeyDown}
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

      <div className="flex-1 overflow-y-auto">
        {/* The tree is the real folder structure on disk. It sits above the
            note list rather than replacing it, because notes are still loaded
            from the notes bundle until Markdown becomes the source of truth. */}
        {!searchQuery && <WorkspaceTree />}

        {searchQuery && (
          <p
            className="surface-elevated px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            role="status"
          >
            {filteredNotes.length} {filteredNotes.length === 1 ? 'result' : 'results'}
          </p>
        )}

        {!searchQuery && pinnedNotes.length > 0 && (
          <section aria-label="Pinned notes">
            {sectionHeading('Pinned')}
            <ul>{pinnedNotes.map(renderNoteItem)}</ul>
          </section>
        )}

        {!searchQuery && unpinnedNotes.length > 0 && (
          <section aria-label="Notes">
            {pinnedNotes.length > 0 && sectionHeading('Notes')}
            <ul>{unpinnedNotes.map(renderNoteItem)}</ul>
          </section>
        )}

        {searchQuery && filteredNotes.length > 0 && (
          <ul>{filteredNotes.map(renderNoteItem)}</ul>
        )}

        {filteredNotes.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
            <FileText className="h-6 w-6" aria-hidden="true" />
            <p className="mt-2 text-sm">{searchQuery ? 'No matching notes' : 'No notes yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesList;
