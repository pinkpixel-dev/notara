import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useNotes } from '@/context/NotesContextTypes';
import NotesList from '@/components/notes/NotesList';
import NoteEditor from '@/components/notes/NoteEditor';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const HomePage: React.FC = () => {
  const { notes, activeNote, setActiveNote, addNote, deleteNote } = useNotes();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  
  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
  };
  
  const handleCreateNote = () => {
    setActiveNote(null);
    setIsCreatingNote(true);
  };
  
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
            <NoteEditor isNew={true} onSave={handleSaveNewNote} />
          ) : activeNote ? (
            <NoteEditor note={activeNote} />
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
