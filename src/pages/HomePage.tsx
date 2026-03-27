import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNotes } from '@/context/NotesContextTypes';
import NotesList from '@/components/notes/NotesList';
import NoteEditor from '@/components/notes/NoteEditor';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useLocation, useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { notes, activeNote, setActiveNote, deleteNote } = useNotes();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
  };
  
  const handleCreateNote = useCallback(() => {
    setActiveNote(null);
    setIsCreatingNote(true);
  }, [setActiveNote]);

  useEffect(() => {
    if (location.state?.createNote) {
      handleCreateNote();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [handleCreateNote, location.pathname, location.state, navigate]);
  
  const handleSaveNewNote = (note: Note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
  };
  
  const handleDeleteNote = (id: string) => {
    deleteNote(id);
  };
  
  return (
    <AppLayout>
      <ResizablePanel defaultSize={30} minSize={20} maxSize={70}>
        <div className="h-full flex flex-col">
          <div className="flex-1 overflow-hidden">
            <NotesList
              notes={notes}
              activeNoteId={activeNote?.id || null}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
            />
          </div>
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle className="bg-border/30 hover:bg-primary/50 transition-colors" />
      
      <ResizablePanel defaultSize={70}>
        <div className="h-full border-l border-border/30">
          {isCreatingNote ? (
            <NoteEditor
              key="new-note-editor"
              isNew={true}
              onSave={handleSaveNewNote}
              onCreateNote={handleCreateNote}
            />
          ) : activeNote ? (
            <NoteEditor
              key={activeNote.id}
              note={activeNote}
              onCreateNote={handleCreateNote}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                Get started by creating a note or selecting an existing one from the sidebar.
              </p>
              <Button 
                onClick={handleCreateNote}
                className="transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Note
              </Button>
            </div>
          )}
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default HomePage;
