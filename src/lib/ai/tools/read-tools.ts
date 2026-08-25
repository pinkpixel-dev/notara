/**
 * What the read-only tools actually do.
 *
 * Pure functions over the notes and tasks the app already holds in memory, so
 * they can be tested without a workspace, a backend, or a model. The hook that
 * wires them to the contexts is `src/components/ai/useAiTools.ts`.
 *
 * Two rules shape everything here. Results are capped, because an uncapped
 * listing is how the whole workspace ends up at OpenAI without anyone deciding
 * to send it. And every result carries the note's path, because a path is a
 * note's identity and the assistant needs it to read or, later, to change one.
 */
import type { Note, TodoList } from '@/types';
import type { NoteFocusTarget } from '@/context/WorkspaceFocusContext';
import { MAX_NOTE_CHARACTERS, MAX_TOOL_RESULTS } from './definitions';

/** How many matching lines to return per note. */
const MAX_MATCH_LINES = 5;

/** How much of a matching line to keep. */
const MAX_LINE_CHARACTERS = 240;

export const clampLimit = (value: unknown): number => {
  const requested = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : MAX_TOOL_RESULTS;

  return Math.min(MAX_TOOL_RESULTS, Math.max(1, requested));
};

const folderOf = (path: string): string => {
  const index = path.lastIndexOf('/');
  return index === -1 ? '' : path.slice(0, index);
};

const shorten = (line: string): string =>
  line.length > MAX_LINE_CHARACTERS ? `${line.slice(0, MAX_LINE_CHARACTERS)}...` : line;

export interface NoteSearchMatch {
  path: string;
  title: string;
  /** True when the phrase is in the title rather than only the body. */
  titleMatched: boolean;
  lines: string[];
}

/**
 * Finds notes containing a phrase, with the lines that contained it.
 *
 * Matching lines rather than whole notes, because most questions are answered
 * by a line and sending the whole note costs the user tokens for text nobody
 * asked to send.
 */
export const searchNotes = (notes: Note[], query: string, limit: number): NoteSearchMatch[] => {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return [];
  }

  const matches: NoteSearchMatch[] = [];

  for (const note of notes) {
    const titleMatched = note.title.toLowerCase().includes(needle);

    const lines = note.content
      .split('\n')
      .filter((line) => line.toLowerCase().includes(needle))
      .slice(0, MAX_MATCH_LINES)
      .map((line) => shorten(line.trim()));

    if (!titleMatched && lines.length === 0) {
      continue;
    }

    matches.push({ path: note.path, title: note.title, titleMatched, lines });

    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
};

export interface NoteListing {
  path: string;
  title: string;
  folder: string;
  updatedAt: string;
}

/** Lists notes newest first, optionally inside one folder. */
export const listNotes = (notes: Note[], folder: string | null, limit: number): NoteListing[] => {
  const wanted = folder?.replace(/^\/+|\/+$/g, '') ?? null;

  return notes
    .filter((note) => {
      if (!wanted) {
        return true;
      }

      const noteFolder = folderOf(note.path);
      return noteFolder === wanted || noteFolder.startsWith(`${wanted}/`);
    })
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit)
    .map((note) => ({
      path: note.path,
      title: note.title,
      folder: folderOf(note.path),
      updatedAt: note.updatedAt,
    }));
};

export interface NoteReadResult {
  path: string;
  title: string;
  content: string;
  /** True when the note was longer than one tool result may carry. */
  truncated: boolean;
}

export const readNote = (note: Note): NoteReadResult => {
  const truncated = note.content.length > MAX_NOTE_CHARACTERS;

  return {
    path: note.path,
    title: note.title,
    content: truncated ? note.content.slice(0, MAX_NOTE_CHARACTERS) : note.content,
    truncated,
  };
};

export interface FocusedNoteReadResult {
  path: string | null;
  title: string;
  content: string;
  truncated: boolean;
  unsavedChanges: boolean;
  isNew: boolean;
}

/** Reads the editor buffer, including text that has not reached disk yet. */
export const readFocusedNote = (note: NoteFocusTarget): FocusedNoteReadResult => {
  const truncated = note.content.length > MAX_NOTE_CHARACTERS;

  return {
    path: note.path,
    title: note.title.trim() || 'Untitled',
    content: truncated ? note.content.slice(0, MAX_NOTE_CHARACTERS) : note.content,
    truncated,
    unsavedChanges: note.isDirty,
    isNew: note.isNew,
  };
};

export interface TodoListing {
  title: string;
  date: string;
  time: string;
  items: Array<{ content: string; checked: boolean }>;
}

export const listTodos = (lists: TodoList[], includeCompleted: boolean): TodoListing[] =>
  lists.slice(0, MAX_TOOL_RESULTS).map((list) => ({
    title: list.title,
    date: list.date,
    time: list.time,
    items: list.items
      .filter((item) => includeCompleted || !item.checked)
      .map((item) => ({ content: item.content, checked: item.checked })),
  }));

export interface CalendarEntry {
  path: string;
  title: string;
  date: string;
  time: string;
}

const isDateOnly = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * Reads the calendar, which is the notes in a date range.
 *
 * Notara has no separate event record. The calendar view lists notes by their
 * date, so this does the same rather than inventing a shape the rest of the app
 * does not have.
 */
export const listCalendarEntries = (
  notes: Note[],
  from: unknown,
  to: unknown,
  today: Date = new Date()
): CalendarEntry[] => {
  const start = isDateOnly(from) ? new Date(`${from}T00:00:00`) : new Date(today.toDateString());

  const end = isDateOnly(to)
    ? new Date(`${to}T23:59:59`)
    : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

  return notes
    .filter((note) => {
      const date = new Date(note.createdAt);
      return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    })
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(0, MAX_TOOL_RESULTS)
    .map((note) => {
      const date = new Date(note.createdAt);

      return {
        path: note.path,
        title: note.title,
        date: date.toISOString().slice(0, 10),
        time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
      };
    });
};
