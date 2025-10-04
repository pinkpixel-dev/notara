import React, { useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNotes } from '@/context/NotesContextTypes';
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
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
      <ResizablePanel defaultSize={100}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cosmos-solar to-cosmos-nova cosmic-glow flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cosmos-solar to-cosmos-nova bg-clip-text text-transparent">
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
                <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-cosmos-solar/20 to-cosmos-nova/20 flex items-center justify-center">
                  <Star className="w-12 h-12 text-cosmos-solar/60" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No Starred Notes</h2>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Star notes that are important to you by clicking the star icon when viewing or editing them.
                  They'll appear here for quick access.
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-cosmos-solar to-cosmos-nova hover:from-cosmos-nova hover:to-cosmos-solar"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Browse All Notes
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {starredNotes.map((note) => (
                  <div
                    key={note.id}
                    className="group bg-card rounded-lg p-4 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg cursor-pointer"
                    onClick={() => handleEditNote(note.id)}
                  >
                    {/* Note Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-semibold line-clamp-1 flex-1">
                          {note.title || 'Untitled Note'}
                        </h3>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-cosmos-solar hover:text-cosmos-solar/80"
                          onClick={(e) => handleToggleStar(note.id, e)}
                        >
                          <Star className="h-4 w-4 fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditNote(note.id);
                          }}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNote(note.id, note.title);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
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
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(note.updatedAt), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-cosmos-solar fill-current" />
                        <span>Starred</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default StarredNotesPage;