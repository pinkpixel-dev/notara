import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFileSystem } from '@/context/FileSystemContext';
import { useNotes } from '@/context/NotesContextTypes';
import {
  deleteNoteConversation,
  moveNoteConversation,
  noteConversationKey,
  parseStoredConversations,
  sectionConversationKey,
  serializeConversations,
  setConversation,
  type AiConversations,
  type StoredAiMessage,
} from '@/lib/ai/conversations';
import {
  NOTE_DELETED_EVENT,
  NOTE_PATH_CHANGED_EVENT,
  type NoteDeletedDetail,
  type NotePathChangedDetail,
} from '@/lib/notes/events';

/**
 * Where conversations go when there is no workspace to write them into.
 *
 * The desktop app can run before a folder has been chosen, and a chat that
 * disappears on restart because of that would be a surprise. This is the same
 * fallback the to-do lists use.
 */
const LOCAL_STORAGE_KEY = 'notara-ai-conversations';

/** How long to wait after the last change before writing the file. */
const WRITE_DELAY_MS = 600;

/** Sections that get a conversation of their own, and what to call it. */
const SECTION_LABELS: Record<string, string> = {
  notes: 'Notes',
  todos: 'To-Do',
  calendar: 'Calendar',
  'vision-board': 'Vision Board',
  constellations: 'Constellations',
  tags: 'Tags',
  settings: 'Settings',
  'markdown-cheatsheet': 'Markdown Cheat Sheet',
};

const sectionFromPathname = (pathname: string): string => {
  const segment = pathname.split('/').filter(Boolean)[0];

  if (!segment || segment === 'note') {
    return 'notes';
  }

  return segment in SECTION_LABELS ? segment : 'notes';
};

const readLocalConversations = (): AiConversations => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? parseStoredConversations(JSON.parse(raw)) : {};
  } catch (error) {
    console.warn('Failed to read AI conversations from local storage', error);
    return {};
  }
};

const writeLocalConversations = (conversations: AiConversations): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(serializeConversations(conversations))
    );
  } catch (error) {
    console.warn('Failed to write AI conversations to local storage', error);
  }
};

export interface AiConversationsController {
  /** Which conversation is showing: a note path or a section. */
  key: string;
  /** What to call it in the panel header. */
  label: string;
  /** True while the note is the subject rather than the section. */
  isNoteConversation: boolean;
  messages: StoredAiMessage[];
  /** Replaces the current conversation's messages. */
  setMessages: (messages: StoredAiMessage[]) => void;
  /** Clears the current conversation and leaves every other one alone. */
  newChat: () => void;
  /** False until the stored conversations have been read. */
  isLoaded: boolean;
}

/**
 * One conversation per note, one per section.
 *
 * The subject follows what the user is looking at. Opening a note switches to
 * that note's conversation and switching sections switches to the section's, so
 * the panel always shows the chat about the thing in front of you.
 *
 * Conversations are keyed by note path, which is also a note's identity, so a
 * rename or a move has to carry the conversation across and a delete has to
 * take it with it. Both arrive as window events from the note file layer.
 */
export const useAiConversations = (): AiConversationsController => {
  const { status, loadAiConversations, saveAiConversations } = useFileSystem();
  const { activeNote } = useNotes();
  const location = useLocation();

  const [conversations, setConversations] = useState<AiConversations>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const writeTimer = useRef<number | null>(null);
  const latest = useRef<AiConversations>({});
  latest.current = conversations;

  const section = sectionFromPathname(location.pathname);
  const key = activeNote ? noteConversationKey(activeNote.path) : sectionConversationKey(section);

  useEffect(() => {
    if (status === 'uninitialized') {
      return;
    }

    let cancelled = false;

    const load = async () => {
      if (status === 'ready') {
        try {
          const stored = await loadAiConversations();
          if (!cancelled) {
            setConversations(stored ?? readLocalConversations());
            setIsLoaded(true);
          }
          return;
        } catch (error) {
          console.error('Falling back to local storage after an AI conversation load failure', error);
        }
      }

      if (!cancelled) {
        setConversations(readLocalConversations());
        setIsLoaded(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadAiConversations, status]);

  /**
   * Writes shortly after the last change rather than on every keystroke of the
   * conversation. A reply arrives as one message, but a send and a reply land
   * seconds apart, and there is no reason for each to be its own file write.
   */
  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (writeTimer.current !== null) {
      window.clearTimeout(writeTimer.current);
    }

    writeTimer.current = window.setTimeout(() => {
      writeTimer.current = null;
      const snapshot = latest.current;

      // Local storage is written either way. It is the fallback the next
      // session reads when the workspace cannot be opened.
      writeLocalConversations(snapshot);

      if (status === 'ready') {
        void saveAiConversations(snapshot).catch((error) => {
          console.error('Failed to write AI conversations to the workspace', error);
        });
      }
    }, WRITE_DELAY_MS);

    return () => {
      if (writeTimer.current !== null) {
        window.clearTimeout(writeTimer.current);
        writeTimer.current = null;
      }
    };
  }, [conversations, isLoaded, saveAiConversations, status]);

  useEffect(() => {
    const handlePathChange = (event: Event) => {
      const { from, to } = (event as CustomEvent<NotePathChangedDetail>).detail;
      setConversations((current) => moveNoteConversation(current, from, to));
    };

    const handleDelete = (event: Event) => {
      const { path } = (event as CustomEvent<NoteDeletedDetail>).detail;
      setConversations((current) => deleteNoteConversation(current, path));
    };

    window.addEventListener(NOTE_PATH_CHANGED_EVENT, handlePathChange);
    window.addEventListener(NOTE_DELETED_EVENT, handleDelete);

    return () => {
      window.removeEventListener(NOTE_PATH_CHANGED_EVENT, handlePathChange);
      window.removeEventListener(NOTE_DELETED_EVENT, handleDelete);
    };
  }, []);

  const setMessages = useCallback(
    (messages: StoredAiMessage[]) => {
      setConversations((current) => setConversation(current, key, messages));
    },
    [key]
  );

  const newChat = useCallback(() => {
    setConversations((current) => setConversation(current, key, []));
  }, [key]);

  const messages = useMemo(() => conversations[key]?.messages ?? [], [conversations, key]);

  return {
    key,
    label: activeNote ? activeNote.title : (SECTION_LABELS[section] ?? 'Notes'),
    isNoteConversation: Boolean(activeNote),
    messages,
    setMessages,
    newChat,
    isLoaded,
  };
};
