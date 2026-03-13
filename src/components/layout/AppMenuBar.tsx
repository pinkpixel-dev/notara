import React, { useCallback, useEffect } from 'react';
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
  const { notes, tags, visionBoards, addNote, setActiveNote } = useNotes();
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
    (rootHandle?.kind === 'tauri' && rootHandle.source === 'linked');

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
        description: hasLinkedDirectory
          ? 'Your notes and todos have been written to the linked Notara folder.'
          : 'Your notes and todos have been written to Notara app storage.',
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

  const handleOpenMarkdown = useCallback(async () => {
    if (typeof window === 'undefined' || !('showOpenFilePicker' in window)) {
      toast({
        title: 'Open unsupported',
        description: 'Your browser does not support opening local files directly.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const [fileHandle] = await (window as typeof window & { 
        showOpenFilePicker: (options: {
          multiple: boolean;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<FileSystemFileHandle[]>;
      }).showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
              'text/plain': ['.txt'],
            },
          },
        ],
      });
      const file = await fileHandle.getFile();
      const text = await file.text();
      const noteTitle = file.name.replace(/\.(md|markdown|txt)$/i, '');
      const newNote = addNote({ title: noteTitle || 'Imported Note', content: text });
      setActiveNote(newNote);
      toast({
        title: 'Note imported',
        description: `${file.name} added to your workspace.`,
      });
    } catch (error) {
      const domError = error as DOMException;
      if (domError?.name === 'AbortError') {
        return;
      }
      console.error('Failed to open markdown file', error);
      toast({
        title: 'Import failed',
        description: 'Unable to open the selected file. Please try again.',
        variant: 'destructive',
      });
    }
  }, [addNote, setActiveNote]);

  const handleConnectDirectory = useCallback(async () => {
    const connected = await selectDirectory();
    if (connected) {
      toast({
        title: 'Storage ready',
        description: 'Files will now sync to your linked Notara folder.',
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
      title: 'Folder disconnected',
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveActiveNote, handleSaveAll]);

  return (
    <Menubar className="bg-transparent border-none shadow-none p-0">
      <MenubarMenu>
        <MenubarTrigger className="hover:bg-secondary/60">File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem onSelect={(event) => { event.preventDefault(); void handleConnectDirectory(); }}>
            Choose Notara Folder...
          </MenubarItem>
          <MenubarItem
            disabled={status !== 'needs-permission'}
            onSelect={(event) => {
              event.preventDefault();
              void handleReconnectDirectory();
            }}
          >
            Re-authorize Folder
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
          <MenubarItem onSelect={(event) => { event.preventDefault(); void handleOpenMarkdown(); }}>
            Open Markdown...
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
