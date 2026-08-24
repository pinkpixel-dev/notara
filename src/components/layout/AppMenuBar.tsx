import React, { useCallback, useEffect } from 'react';
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
import { pickMarkdownFiles } from '@/lib/notes/import';
import { fileNameToTitle } from '@/lib/notes/naming';
import { useFileSystem } from '@/context/FileSystemContext';
import { useNotes } from '@/context/NotesContextTypes';
import { useTodo } from '@/context/TodoContextTypes';
import { useTheme } from '@/context/ThemeContext';

const dispatchEditorEvent = (eventName: string) => {
  window.dispatchEvent(new CustomEvent(eventName));
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
    flushCachedAiConversations,
  } = useFileSystem();
  const { settings, setFontSize } = useTheme();
  const hasLinkedDirectory =
    rootHandle?.kind === 'browser' ||
    (rootHandle?.kind === 'tauri' && rootHandle.source === 'workspace');

  const navigate = useNavigate();

  // The notes page owns note creation, so this routes there and asks for a new
  // note the same way the note view's New Note button does.
  const handleNewNote = useCallback(() => {
    navigate('/', { state: { createNote: true } });
  }, [navigate]);

  const handleSaveActiveNote = useCallback(() => {
    dispatchEditorEvent('notara:save-active-note');
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
      await flushCachedAiConversations();
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
  }, [flushCachedAiConversations, hasLinkedDirectory, notes, saveNotesBundle, saveTodos, status, tags, todoLists, visionBoards]);

  /**
   * Imports one or more Markdown files as new notes.
   *
   * The picker differs per runtime, which `pickMarkdownFiles` handles. Files
   * that cannot be read, and notes that cannot be written, are both reported
   * rather than dropped, because a partly finished import is worth knowing
   * about in detail.
   */
  const handleImportMarkdown = useCallback(async () => {
    try {
      const selection = await pickMarkdownFiles();
      if (!selection) {
        return;
      }

      const { created, failures } = await addNotes(
        selection.sources.map((source) => ({
          title: fileNameToTitle(source.name),
          content: source.text,
        }))
      );

      const unreadable = selection.failures.length;
      const unwritable = failures.length;
      const problems = unreadable + unwritable;

      if (created.length > 0) {
        setActiveNote(created[created.length - 1]);
      }

      if (created.length === 0 && problems > 0) {
        toast({
          title: 'Nothing was imported',
          description: [...selection.failures, ...failures]
            .map((failure) => ('name' in failure ? failure.name : failure.title))
            .join(', '),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: `${created.length} note${created.length === 1 ? '' : 's'} imported`,
        description:
          problems > 0
            ? `${problems} file${problems === 1 ? '' : 's'} could not be imported.`
            : created.length === 1
              ? `Added as ${created[0].path}.`
              : 'Added to your workspace.',
        variant: problems > 0 ? 'destructive' : undefined,
      });
    } catch (error) {
      console.error('Failed to import Markdown files', error);
      toast({
        title: 'Import failed',
        description:
          (error instanceof Error && error.message) || 'Unable to read the selected files.',
        variant: 'destructive',
      });
    }
  }, [addNotes, setActiveNote]);

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
          <MenubarItem onSelect={(event) => { event.preventDefault(); dispatchEditorEvent('notara:toggle-full-preview'); }}>
            Toggle Full Preview
            <MenubarShortcut>Ctrl+P</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
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
    </Menubar>
  );
};

export default AppMenuBar;
