/**
 * The tools the assistant may call.
 *
 * Everything here is read-only. The assistant can look at notes, tasks, and
 * calendar entries, and it can say what it found, but nothing in this file
 * changes a file or a record. Writing tools arrive with the review step that
 * approves them, because a write the user has not seen is not something to ship
 * early.
 *
 * These are constants. Nothing builds a tool definition from a note, a user
 * message, or anything else that could be influenced from outside.
 */
import type { OpenAiToolDefinition } from '@/lib/openai/client';

export const AI_TOOL_NAMES = [
  'search_notes',
  'read_note',
  'list_notes',
  'list_todos',
  'list_calendar_entries',
] as const;

export type AiToolName = (typeof AI_TOOL_NAMES)[number];

export const isAiToolName = (value: string): value is AiToolName =>
  (AI_TOOL_NAMES as readonly string[]).includes(value);

/**
 * How many results a search or a listing may return.
 *
 * A cap that the model cannot raise. Without one, "list my notes" on a large
 * workspace becomes a request that sends the whole workspace to OpenAI, which
 * is exactly what the panel promises not to do quietly.
 */
export const MAX_TOOL_RESULTS = 25;

/** How much of one note a read may return, in characters. */
export const MAX_NOTE_CHARACTERS = 20000;

export const AI_TOOLS: OpenAiToolDefinition[] = [
  {
    type: 'function',
    name: 'search_notes',
    description:
      'Search the notes in the workspace for a word or phrase. Returns the matching file paths with the lines that matched, not the whole note. Use read_note afterwards when the matching lines are not enough.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The word or phrase to look for. Matching ignores case.',
        },
        limit: {
          type: 'integer',
          description: `How many notes to return, from 1 to ${MAX_TOOL_RESULTS}.`,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_note',
    description:
      'Read one note in full. The path is the note\'s workspace-relative file path, which is also its identity. Leave the path out to read the note the user currently has open.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Workspace-relative path, such as Ideas/plan.md. Omit for the open note.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_notes',
    description:
      'List notes in the workspace, newest first, with their paths and folders. Use it to find out what exists before searching or reading. Give a folder to list only that folder.',
    parameters: {
      type: 'object',
      properties: {
        folder: {
          type: 'string',
          description: 'Workspace-relative folder path. Omit for the whole workspace.',
        },
        limit: {
          type: 'integer',
          description: `How many notes to return, from 1 to ${MAX_TOOL_RESULTS}.`,
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_todos',
    description:
      'List the user\'s to-do lists with their items, whether each item is checked, and the date and time on the list.',
    parameters: {
      type: 'object',
      properties: {
        includeCompleted: {
          type: 'boolean',
          description: 'Include items that are already checked. Defaults to true.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'list_calendar_entries',
    description:
      "List what is on the calendar in a date range. Notara's calendar shows notes by their date rather than a separate event record, so each entry is a note.",
    parameters: {
      type: 'object',
      properties: {
        from: {
          type: 'string',
          description: 'Start of the range as YYYY-MM-DD. Omit to start from today.',
        },
        to: {
          type: 'string',
          description: 'End of the range as YYYY-MM-DD, inclusive. Omit for 30 days after the start.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];
