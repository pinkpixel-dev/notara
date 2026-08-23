import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import WorkspacePanes, { WorkspacePaneId } from '@/components/layout/WorkspacePanes';
import { useNotes } from '@/context/NotesContextTypes';
import NotesSidebar from '@/components/notes/sidebar/NotesSidebar';
import DeleteNoteDialog from '@/components/notes/DeleteNoteDialog';
import NoteEditor from '@/components/notes/NoteEditor';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const { activeNote, setActiveNote, notesStatus } = useNotes();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [noteAwaitingDelete, setNoteAwaitingDelete] = useState<Note | null>(null);
  const [activePane, setActivePane] = useState<WorkspacePaneId>('list');
  const location = useLocation();
  const navigate = useNavigate();

  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
    // On mobile only one pane shows, so opening a note has to move the view.
    setActivePane('detail');
  };

  const handleCreateNote = useCallback(() => {
    setActiveNote(null);
    setIsCreatingNote(true);
    setActivePane('detail');
  }, [setActiveNote]);

  useEffect(() => {
    if (location.state?.createNote) {
      handleCreateNote();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [handleCreateNote, location.pathname, location.state, navigate]);

  // The header search focuses the list, so bring the list back into view.
  useEffect(() => {
    const showList = () => setActivePane('list');
    window.addEventListener('notara:focus-note-search', showList);
    return () => window.removeEventListener('notara:focus-note-search', showList);
  }, []);

  const handleSaveNewNote = (note: Note) => {
    setActiveNote(note);
    setIsCreatingNote(false);
  };

  // Deleting a note removes a real file, so it goes through a confirmation
  // that names the path rather than happening on a single click.
  const handleDeleteNote = (note: Note) => {
    setNoteAwaitingDelete(note);
  };

  const hasWorkspace = notesStatus !== 'no-workspace';

  const editor = isCreatingNote ? (
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
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <FileText className="h-6 w-6 text-primary" aria-hidden="true" />
      </div>

      {/* A note is a file, so there is nowhere to put one until a folder is
          chosen. Offering Create Note here would let the user write something
          and only find out it cannot be saved once they tried. */}
      {hasWorkspace ? (
        <>
          <p className="mb-6 max-w-md text-muted-foreground">
            Get started by creating a note or selecting one from the list.
          </p>
          <Button onClick={handleCreateNote}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Note
          </Button>
        </>
      ) : (
        <p className="max-w-md text-muted-foreground">
          Choose a folder for your notes to get started. Notara saves each note as
          a Markdown file in that folder.
        </p>
      )}
    </div>
  );

  return (
    <AppLayout>
      <WorkspacePanes
        listLabel="Notes"
        detailLabel="Editor"
        activePane={activePane}
        onPaneChange={setActivePane}
        listDefaultSize={20}
        listMinSize={20}
        listMaxSize={70}
        list={
          <NotesSidebar
            activeNoteId={activeNote?.id || null}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
          />
        }
        detail={<div className="h-full border-l border-border">{editor}</div>}
      />
    </AppLayout>
  );
};

export default HomePage;
