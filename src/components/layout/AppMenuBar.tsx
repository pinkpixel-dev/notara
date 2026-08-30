import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarShortcut,
} from '@/components/ui/menubar';
import { toast } from '@/hooks/use-toast';
import { pickMarkdownFiles, type ImportSelection } from '@/lib/notes/import';
import ImportDestinationDialog from '@/components/notes/ImportDestinationDialog';
import { fileNameToTitle } from '@/lib/notes/naming';
import { useFileSystem } from '@/context/FileSystemContext';
import { useNotes } from '@/context/NotesContextTypes';
import { useTodo } from '@/context/TodoContextTypes';
import { useTheme } from '@/context/ThemeContext';
import {
  FIND_IN_NOTE_EVENT,
  FIND_REPLACE_IN_NOTE_EVENT,
} from '@/components/notes/NoteFindReplaceBar';

const dispatchEditorEvent = (eventName: string) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

const requestEditorFind = (eventName: string) => {
  const event = new CustomEvent(eventName, { cancelable: true });
  window.dispatchEvent(event);
  if (!event.defaultPrevented) {
    toast({ title: 'Open a note to use Find and Replace.' });
  }
};

const execCommand = (command: string) => {
  try {
    const activeElement = document.activeElement as HTMLElement | null;
    if (command === 'selectAll' && activeElement) {
      if ('select' in activeElement && typeof (activeElement as HTMLInputElement).select === 'function') {
        (activeElement as HTMLInputElement).select();
        return;
      }
      if ('contentEditable' in activeElement && activeElement.isContentEditable) {
        const range = document.createRange();
        range.selectNodeContents(activeElement);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return;
      }
    }
    document.execCommand(command);
  } catch (error) {
    console.error(`Command ${command} failed`, error);
    toast({
      title: 'Action unavailable',
      description: 'Your browser blocked this command. Try using the keyboard shortcut instead.',
      variant: 'destructive',
    });
  }
};

const AppMenuBar: React.FC = () => {
  const { notes, tags, visionBoards, addNotes, setActiveNote } = useNotes();
  const { todoLists } = useTodo();
  const {
    status,
    rootHandle,
    selectDirectory,
    reconnectToPersisted,
    forgetDirectory,
    saveNotesBundle,
    saveTodos,
  } = useFileSystem();
  const { settings, setFontSize } = useTheme();
  const hasLinkedDirectory =
    rootHandle?.kind === 'browser' ||
    (rootHandle?.kind === 'tauri' && rootHandle.source === 'workspace');

  const navigate = useNavigate();

  // Files that have been read and are waiting on a destination folder.
  const [pendingImport, setPendingImport] = useState<ImportSelection | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // The notes page owns note creation, so this routes there and asks for a new
  // note the same way the note view's New Note button does.
  const handleNewNote = useCallback(() => {
    navigate('/', { state: { createNote: true } });
  }, [navigate]);

  const handleSaveActiveNote = useCallback(() => {
    dispatchEditorEvent('notara:save-active-note');
  }, []);

  // The editor holds the buffer being copied, so it owns the dialog and this
  // only asks for it.
  const handleSaveNoteAs = useCallback(() => {
    dispatchEditorEvent('notara:save-note-as');
  }, []);

  const handleSaveAll = useCallback(async () => {
    if (status !== 'ready') {
      toast({
        title: 'Saved locally',
        description: 'Data is stored locally because desktop storage is not ready yet.',
      });
      return;
    }

    try {
      await saveNotesBundle({ notes, tags, visionBoards });
      await saveTodos(todoLists);
      toast({
        title: 'All changes saved',
        description: 'Your notes and todos have been written to Notara app storage.',
      });
    } catch (error) {
      console.error('Save all failed', error);
      toast({
        title: 'Save failed',
        description: 'Check directory permissions and try again.',
        variant: 'destructive',
      });
    }
  }, [hasLinkedDirectory, notes, saveNotesBundle, saveTodos, status, tags, todoLists, visionBoards]);

  /**
   * Asks for files, then asks where they should go.
   *
   * Picking comes first because choosing what to import is the decision the
   * user already had in mind. The destination dialog then opens over the
   * result, which is also where unreadable files are reported before anything
   * is written.
   */
  const handleImportMarkdown = useCallback(async () => {
    try {
      const selection = await pickMarkdownFiles();
      if (!selection) {
        return;
      }

      if (selection.sources.length === 0) {
        toast({
          title: 'Nothing was imported',
          description: selection.failures.map((failure) => failure.name).join(', '),
          variant: 'destructive',
        });
        return;
      }

      setPendingImport(selection);
    } catch (error) {
      console.error('Failed to read the selected files', error);
      toast({
        title: 'Import failed',
        description:
          (error instanceof Error && error.message) || 'Unable to read the selected files.',
        variant: 'destructive',
      });
    }
  }, []);

  /**
   * Writes the picked files into the chosen folder.
   *
   * Files that could not be read and notes that could not be written are both
   * counted, because a partly finished import is worth knowing about in detail.
   */
  const runImport = useCallback(
    async (directory: string) => {
      const selection = pendingImport;
      if (!selection) {
        return;
      }

      setIsImporting(true);
      try {
        const { created, failures } = await addNotes(
          selection.sources.map((source) => ({
            title: fileNameToTitle(source.name),
            content: source.text,
          })),
          directory
        );

        const problems = selection.failures.length + failures.length;
        setPendingImport(null);

        if (created.length === 0) {
          toast({
            title: 'Nothing was imported',
            description: failures.map((failure) => failure.title).join(', '),
            variant: 'destructive',
          });
          return;
        }

        // The notes page is the only place an imported note is visible, and the
        // import can be started from anywhere in the app.
        setActiveNote(created[created.length - 1]);
        navigate('/');

        toast({
          title: `${created.length} note${created.length === 1 ? '' : 's'} imported`,
          description:
            problems > 0
              ? `${problems} file${problems === 1 ? '' : 's'} could not be imported.`
              : `Added to ${directory || 'the workspace root'}.`,
          variant: problems > 0 ? 'destructive' : undefined,
        });
      } catch (error) {
        console.error('Failed to import Markdown files', error);
        toast({
          title: 'Import failed',
          description:
            (error instanceof Error && error.message) || 'Unable to write the imported notes.',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
      }
    },
    [addNotes, navigate, pendingImport, setActiveNote]
  );

  const handleConnectDirectory = useCallback(async () => {
    const connected = await selectDirectory();
    if (connected) {
      toast({
        title: 'Workspace ready',
        description: 'Notara is reading and writing in your chosen folder.',
      });
    }
  }, [selectDirectory]);

  const handleReconnectDirectory = useCallback(async () => {
    const connected = await reconnectToPersisted();
    if (connected) {
      toast({
        title: 'Storage reconnected',
        description: 'Notara can write to your chosen folder again.',
      });
    }
  }, [reconnectToPersisted]);

  const handleForgetDirectory = useCallback(async () => {
    await forgetDirectory();
    toast({
      title: 'Workspace disconnected',
      description: 'Notara switched back to app storage.',
    });
  }, [forgetDirectory]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) {
        return;
      }

      if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (event.shiftKey) {
          void handleSaveAll();
        } else {
          handleSaveActiveNote();
        }
        return;
      }

      // The File menu has always shown this shortcut. Nothing listened for it.
      if (event.key.toLowerCase() === 'o') {
        event.preventDefault();
        void handleImportMarkdown();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleImportMarkdown, handleSaveActiveNote, handleSaveAll]);

  return (
    <Menubar className="bg-transparent border-none shadow-none p-0">
      <MenubarMenu>
        <MenubarTrigger className="hover:bg-secondary/60">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={(event) => { event.preventDefault(); handleNewNote(); }}>
            New Note
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={(event) => { event.preventDefault(); void handleConnectDirectory(); }}>
            Choose Workspace...
          </MenubarItem>
          <MenubarItem
            disabled={status !== 'needs-permission'}
            onSelect={(event) => {
              event.preventDefault();
              void handleReconnectDirectory();
            }}
          >
            Reconnect Storage
          </MenubarItem>
          <MenubarItem
            disabled={!hasLinkedDirectory}
            onSelect={(event) => {
              event.preventDefault();
              void handleForgetDirectory();
            }}
          >
            Disconnect Folder
          </MenubarItem>
          <MenubarSeparator />
          {/* This copies the file's text into a new note in the workspace. It
              never opens the original in place, so it is named for what it
              does. Save As, which would make Open meaningful, is not built. */}
          <MenubarItem onSelect={(event) => { event.preventDefault(); void handleImportMarkdown(); }}>
            Import Markdown...
            <MenubarShortcut>Ctrl+O</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); handleSaveActiveNote(); }}>
            Save Active Note
            <MenubarShortcut>Ctrl+S</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); handleSaveNoteAs(); }}>
            Save Active Note As...
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); void handleSaveAll(); }}>
            Save All
            <MenubarShortcut>Ctrl+Shift+S</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="hover:bg-secondary/60">Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('undo'); }}>
            Undo
            <MenubarShortcut>Ctrl+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('redo'); }}>
            Redo
            <MenubarShortcut>Ctrl+Shift+Z</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem
            onSelect={(event) => {
              event.preventDefault();
              requestEditorFind(FIND_IN_NOTE_EVENT);
            }}
          >
            Find
            <MenubarShortcut>Ctrl+F</MenubarShortcut>
          </MenubarItem>
          <MenubarItem
            onSelect={(event) => {
              event.preventDefault();
              requestEditorFind(FIND_REPLACE_IN_NOTE_EVENT);
            }}
          >
            Find and Replace
            <MenubarShortcut>Ctrl+H</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('cut'); }}>
            Cut
            <MenubarShortcut>Ctrl+X</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('copy'); }}>
            Copy
            <MenubarShortcut>Ctrl+C</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('paste'); }}>
            Paste
            <MenubarShortcut>Ctrl+V</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={(event) => { event.preventDefault(); execCommand('selectAll'); }}>
            Select All
            <MenubarShortcut>Ctrl+A</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="hover:bg-secondary/60">View</MenubarTrigger>
        <MenubarContent>
          <MenubarRadioGroup value={settings.fontSize} onValueChange={(value) => setFontSize(value as 'small' | 'medium' | 'large')}>
            <MenubarRadioItem value="small">
              Small Font
            </MenubarRadioItem>
            <MenubarRadioItem value="medium">
              Medium Font
            </MenubarRadioItem>
            <MenubarRadioItem value="large">
              Large Font
            </MenubarRadioItem>
          </MenubarRadioGroup>
        </MenubarContent>
      </MenubarMenu>

      {/* Renders no inline DOM of its own: the dialog content is portalled to
          the body, so nothing extra lands inside the menubar. */}
      <ImportDestinationDialog
        selection={pendingImport}
        isBusy={isImporting}
        onConfirm={(directory) => void runImport(directory)}
        onCancel={() => setPendingImport(null)}
      />
    </Menubar>
  );
};

export default AppMenuBar;
