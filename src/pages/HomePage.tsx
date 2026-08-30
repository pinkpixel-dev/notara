import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import WorkspacePanes, { WorkspacePaneId } from '@/components/layout/WorkspacePanes';
import { useNotes } from '@/context/NotesContextTypes';
import NotesSidebar from '@/components/notes/sidebar/NotesSidebar';
import DeleteNoteDialog from '@/components/notes/DeleteNoteDialog';
import MoveNoteDialog from '@/components/notes/MoveNoteDialog';
import RenameNoteDialog from '@/components/notes/RenameNoteDialog';
import UnsavedChangesDialog from '@/components/notes/UnsavedChangesDialog';
import NoteEditor from '@/components/notes/NoteEditor';
import { Note } from '@/types';
import { Button } from '@/components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useBlocker, useLocation, useNavigate } from 'react-router-dom';
import { useSidebarPane } from '@/hooks/use-sidebar-pane';

const HomePage: React.FC = () => {
  const { activeNote, setActiveNote, notesStatus } = useNotes();
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  // A note path can change when its title changes. The editor session changes
  // only when the user opens another note or starts a new one, so a save-driven
  // rename cannot remount the editor and discard text typed during the write.
  const [editorSession, setEditorSession] = useState(0);
  const [noteAwaitingDelete, setNoteAwaitingDelete] = useState<Note | null>(null);
  const [noteAwaitingMove, setNoteAwaitingMove] = useState<Note | null>(null);
  const [noteAwaitingRename, setNoteAwaitingRename] = useState<Note | null>(null);
  const [isEditorDirty, setIsEditorDirty] = useState(false);
  /**
   * What to do once the user says the unsaved edits can go.
   *
   * Holding the action rather than a flag keeps the two ways of leaving a note,
   * opening another and starting a new one, on one path.
   */
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  /**
   * Stops a section change while the editor holds unsaved work.
   *
   * The in-page guard below only covers opening another note. Leaving for
   * To-Do or Calendar is a router navigation, and only the router can stop it.
   * This is also what catches the browser's back and forward buttons.
   */
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isEditorDirty && currentLocation.pathname !== nextLocation.pathname
  );
  const isBlocked = blocker.state === 'blocked';
  // Which folder a note being written now belongs in. Empty is the workspace
  // root, which is what the Create Note button and the File menu use.
  const [newNoteDirectory, setNewNoteDirectory] = useState('');
  const [activePane, setActivePane] = useState<WorkspacePaneId>('list');
  // Held back until the header has been measured. A panel reads its opening
  // width once, at mount, and cannot be corrected afterwards.
  const sidebar = useSidebarPane();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Runs an action, or holds it back while the user decides about unsaved work.
   *
   * Every route out of the open note goes through here. The guard remains
   * active when Auto Save is off, pending, or unable to write the latest text.
   */
  const guardUnsaved = useCallback(
    (action: () => void) => {
      if (isEditorDirty) {
        // Stored behind a function, because React treats a bare function passed
        // to a setter as an updater and would call it immediately.
        setPendingNavigation(() => action);
        return;
      }
      action();
    },
    [isEditorDirty]
  );

  const openNote = useCallback(
    (note: Note) => {
      setEditorSession((session) => session + 1);
      setActiveNote(note);
      setIsCreatingNote(false);
      // On mobile only one pane shows, so opening a note has to move the view.
      setActivePane('detail');
    },
    [setActiveNote]
  );

  const handleSelectNote = useCallback(
    (note: Note) => {
      // Reopening the note already on screen is not leaving it.
      if (activeNote?.id === note.id && !isCreatingNote) {
        setActivePane('detail');
        return;
      }
      guardUnsaved(() => openNote(note));
    },
    [activeNote, guardUnsaved, isCreatingNote, openNote]
  );

  const startNewNote = useCallback(
    (directory: string) => {
      setEditorSession((session) => session + 1);
      setNewNoteDirectory(directory);
      setActiveNote(null);
      setIsCreatingNote(true);
      setActivePane('detail');
    },
    [setActiveNote]
  );

  const handleCreateNote = useCallback(
    (directory = '') => {
      guardUnsaved(() => startNewNote(directory));
    },
    [guardUnsaved, startNewNote]
  );

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
      key={`note-editor-${editorSession}`}
      isNew={true}
      directory={newNoteDirectory}
      onSave={handleSaveNewNote}
      onCreateNote={handleCreateNote}
      onDirtyChange={setIsEditorDirty}
    />
  ) : activeNote ? (
    <NoteEditor
      key={`note-editor-${editorSession}`}
      note={activeNote}
      onCreateNote={handleCreateNote}
      onDirtyChange={setIsEditorDirty}
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
          {/* Called through an arrow, not passed directly: a click handler receives
          the event as its first argument, which would arrive here as the folder
          to create the note in. */}
      <Button onClick={() => handleCreateNote()}>
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
      {!sidebar.ready ? null : (
      <WorkspacePanes
        listLabel="Notes"
        detailLabel="Editor"
        activePane={activePane}
        onPaneChange={setActivePane}
        listDefaultPx={sidebar.listDefaultPx}
        listMinPx={sidebar.listMinPx}
        listDefaultSize={20}
        listMinSize={15}
        listMaxSize={70}
        storageKey="notes"
        list={
          <NotesSidebar
            activeNoteId={activeNote?.id || null}
            onSelectNote={handleSelectNote}
            onRenameNote={setNoteAwaitingRename}
            onMoveNote={setNoteAwaitingMove}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
          />
        }
        detail={<div className="h-full border-l border-border">{editor}</div>}
      />
      )}

      {/* One dialog for both ways of leaving a note: opening another one, and
          navigating off the page entirely. */}
      <UnsavedChangesDialog
        open={pendingNavigation !== null || isBlocked}
        noteTitle={isCreatingNote ? '' : activeNote?.title ?? ''}
        onCancel={() => {
          if (isBlocked) {
            blocker.reset?.();
            return;
          }
          setPendingNavigation(null);
        }}
        onDiscard={() => {
          // Cleared first, so the editor unmounting cannot report the old
          // buffer as dirty again and reopen this dialog.
          setIsEditorDirty(false);

          if (isBlocked) {
            blocker.proceed?.();
            return;
          }

          pendingNavigation?.();
          setPendingNavigation(null);
        }}
      />

      {/* Each of these owns a real file operation, so they render once here and
          are opened by setting the note they act on. */}
      <RenameNoteDialog
        note={noteAwaitingRename}
        onClose={() => setNoteAwaitingRename(null)}
      />
      <MoveNoteDialog note={noteAwaitingMove} onClose={() => setNoteAwaitingMove(null)} />
      <DeleteNoteDialog
        note={noteAwaitingDelete}
        onClose={() => setNoteAwaitingDelete(null)}
      />
    </AppLayout>
  );
};

export default HomePage;
