import React, { useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNotes } from '@/context/NotesContextTypes';
import { Button } from '@/components/ui/button';
import { Star, FileText, Calendar, Tag, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const StarredNotesPage: React.FC = () => {
  const { notes, togglePin, deleteNote } = useNotes();
  const navigate = useNavigate();

  // Filter starred notes (pinned notes in the context)
  const starredNotes = useMemo(() => {
    return notes.filter(note => note.isPinned);
  }, [notes]);

  const handleEditNote = (noteId: string) => {
    navigate(`/note/${noteId}`);
  };

  const handleDeleteNote = (noteId: string, noteTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${noteTitle}"?`)) {
      deleteNote(noteId);
    }
  };

  const handleToggleStar = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(noteId);
  };

  return (
    <AppLayout>
      <div className="h-full min-h-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center gap-4 p-4 sm:p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0 rounded-md surface-elevated border border-border flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Starred Notes
                </h1>
                <p className="text-sm text-muted-foreground">
                  {starredNotes.length} {starredNotes.length === 1 ? 'note' : 'notes'} starred
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {starredNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 mb-6 rounded-full surface-elevated border border-border flex items-center justify-center">
                  <Star className="w-9 h-9 text-muted-foreground" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Starred Notes</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Star notes that are important to you by clicking the star icon when viewing or editing them.
                  They'll appear here for quick access.
                </p>
                <Button onClick={() => navigate('/')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Browse All Notes
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {starredNotes.map((note) => (
                  <article
                    key={note.id}
                    className="group surface-content rounded-lg p-4 border border-border transition-colors hover:border-primary/40 focus-within:border-primary/40"
                  >
                    {/* Note Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <h3 className="min-w-0 font-semibold">
                          <button
                            type="button"
                            onClick={() => handleEditNote(note.id)}
                            className="line-clamp-1 text-left rounded-sm hover:text-primary"
                          >
                            {note.title || 'Untitled Note'}
                          </button>
                        </h3>
                      </div>
                      {/* Visible by default so touch users can reach these. On
                          pointer devices they fade in on hover or focus. */}
                      <div className="flex shrink-0 gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-primary"
                          onClick={(e) => handleToggleStar(note.id, e)}
                          aria-label={`Remove star from ${note.title || 'Untitled Note'}`}
                        >
                          <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(note.id);
                          }}
                          aria-label={`Edit ${note.title || 'Untitled Note'}`}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id, note.title);
                          }}
                          aria-label={`Delete ${note.title || 'Untitled Note'}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>

                    {/* Note Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {note.content ? 
                          note.content.replace(/#+\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '').substring(0, 150) + (note.content.length > 150 ? '...' : '')
                          : 'No content'
                        }
                      </p>
                    </div>

                    {/* Note Tags */}
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-xs px-2 py-0.5"
                            style={{
                              backgroundColor: `${tag.color}20`,
                              color: tag.color,
                              borderColor: `${tag.color}40`
                            }}
                          >
                            <Tag className="w-2 h-2 mr-1" />
                            {tag.name}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs px-2 py-0.5">
                            +{note.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Note Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-primary fill-current" aria-hidden="true" />
                        <span>Starred</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StarredNotesPage;