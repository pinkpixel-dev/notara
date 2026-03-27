import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNotes } from '@/context/NotesContextTypes';
import AppLayout from '@/components/layout/AppLayout';
import NoteEditor from '@/components/notes/NoteEditor';
import { Note } from '@/types';
import { ResizablePanel } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

const NoteViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { notes } = useNotes();
  const [note, setNote] = useState<Note | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const foundNote = notes.find(n => n.id === id);
      if (foundNote) {
        setNote(foundNote);
      } else {
        toast({
          title: "Note not found",
          description: "The note you're looking for doesn't exist",
          variant: "destructive"
        });
        navigate('/');
      }
    }
  }, [id, notes, navigate]);

  return (
    <AppLayout>
      <ResizablePanel defaultSize={100} minSize={30}>
        <div className="h-full">
          <div className="flex items-center p-2 border-b border-border">
            <Button 
              onClick={() => navigate(-1)} 
              variant="ghost"
              size="sm"
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          {note ? (
            <NoteEditor
              note={note}
              onCreateNote={() => navigate('/', { state: { createNote: true } })}
            />
          ) : (
            <div className="p-10 text-center">
              <p className="text-muted-foreground">Loading note...</p>
            </div>
          )}
        </div>
      </ResizablePanel>
    </AppLayout>
  );
};

export default NoteViewPage;
