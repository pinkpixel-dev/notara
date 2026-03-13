import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

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

    // Get first line as title, or use "Untitled"
    const title = note.title || 'Untitled';

    // Get first few words of content for preview
    let preview = '';
    if (note.content) {
      // Remove markdown syntax and get first 60 chars
      preview = note.content
        .replace(/[#*`_[\]]/g, '')
        .substring(0, 60);

      if (note.content.length > 60) {
        preview += '...';
      }
    }

    return (
      <div
        key={note.id}
        className={cn(
          "p-4 border-b border-border cursor-pointer transition-colors",
          isActive ? "bg-secondary/30" : "hover:bg-secondary/20"
        )}
        onClick={() => onSelectNote(note)}
      >
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium truncate mr-2">{title}</h3>
          <div className="flex items-center">
            {note.isPinned && (
              <Star className="h-4 w-4 mr-2 text-primary fill-current" />
            )}
            <button
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteNote(note.id);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground truncate mb-2">{preview}</p>
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">{dateFormatted}</div>
          <div className="flex gap-1">
            {note.tags.map(tag => (
              <span
                key={tag.id}
                className="px-1.5 py-0.5 text-xs rounded-full"
                style={{ backgroundColor: `${tag.color}30`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={handleSearch}
            onKeyDown={handleSearchKeyDown}
            className="w-full py-2 pl-8 pr-4 rounded-md bg-secondary/30 border border-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-2.5 top-2.5 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {searchQuery && (
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary/20 uppercase tracking-wider">
            Search Results: {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
          </div>
        )}

        {!searchQuery && pinnedNotes.length > 0 && (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary/20 uppercase tracking-wider">
              Pinned
            </div>
            <div className="group">
              {pinnedNotes.map(renderNoteItem)}
            </div>
          </div>
        )}

        {!searchQuery && unpinnedNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-secondary/20 uppercase tracking-wider">
                Notes
              </div>
            )}
            <div className="group">
              {unpinnedNotes.map(renderNoteItem)}
            </div>
          </div>
        )}

        {searchQuery && filteredNotes.length > 0 && (
          <div className="group">
            {filteredNotes.map(renderNoteItem)}
          </div>
        )}

        {(filteredNotes.length === 0) && (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p className="mt-2">{searchQuery ? 'No matching notes' : 'No notes yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotesList;
