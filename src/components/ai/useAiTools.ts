import { useCallback } from 'react';
import { useNotes } from '@/context/NotesContextTypes';
import { useTodo } from '@/context/TodoContextTypes';
import {
  clampLimit,
  listCalendarEntries,
  listNotes,
  listTodos,
  readNote,
  searchNotes,
} from '@/lib/ai/tools/read-tools';
import { isAiToolName } from '@/lib/ai/tools/definitions';
import type { ToolExecutor, ToolOutcome } from '@/lib/ai/turn';

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const plural = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * Runs the read-only tools against what the app already has open.
 *
 * The notes, tasks, and calendar entries are all in memory, so nothing here
 * touches the filesystem. That is also why the tools live in the webview rather
 * than in Rust: the data is already here, and answering a tool call in Rust
 * would mean sending the workspace across the boundary to do it.
 *
 * Every result is returned as JSON, because a model reads a labelled structure
 * more reliably than a paragraph, and every result carries the note's path so a
 * follow-up can name exactly which note it means.
 */
export const useAiTools = (): ToolExecutor => {
  const { notes, activeNote } = useNotes();
  const { todoLists } = useTodo();

  return useCallback<ToolExecutor>(
    async (name, args) => {
      if (!isAiToolName(name)) {
        throw new Error(`There is no tool called ${name}.`);
      }

      const done = (output: unknown, summary: string): ToolOutcome => ({
        output: JSON.stringify(output),
        summary,
      });

      switch (name) {
        case 'search_notes': {
          const query = asString(args.query);

          if (!query) {
            throw new Error('A search needs something to search for.');
          }

          const matches = searchNotes(notes, query, clampLimit(args.limit));

          return done(
            { query, matches, searchedNotes: notes.length },
            `Searched notes for "${query}", ${plural(matches.length, 'match')}`
          );
        }

        case 'read_note': {
          const path = asString(args.path);
          const note = path ? notes.find((entry) => entry.path === path) : activeNote;

          if (!note) {
            throw new Error(
              path ? `There is no note at ${path}.` : 'No note is open at the moment.'
            );
          }

          return done(readNote(note), `Read ${note.path}`);
        }

        case 'list_notes': {
          const folder = asString(args.folder);
          const listed = listNotes(notes, folder, clampLimit(args.limit));

          return done(
            { folder: folder ?? '', notes: listed, totalNotes: notes.length },
            folder
              ? `Listed ${plural(listed.length, 'note')} in ${folder}`
              : `Listed ${plural(listed.length, 'note')}`
          );
        }

        case 'list_todos': {
          const includeCompleted = args.includeCompleted !== false;
          const lists = listTodos(todoLists, includeCompleted);

          return done(
            { lists, includeCompleted },
            `Read ${plural(lists.length, 'to-do list')}`
          );
        }

        case 'list_calendar_entries': {
          const entries = listCalendarEntries(notes, args.from, args.to);

          return done(
            { entries },
            `Read ${plural(entries.length, 'calendar entry', 'calendar entries')}`
          );
        }

        default:
          throw new Error(`The tool ${name} is not available.`);
      }
    },
    [activeNote, notes, todoLists]
  );
};
