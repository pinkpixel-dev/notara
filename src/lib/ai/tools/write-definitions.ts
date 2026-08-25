/**
 * The tools that ask to change something.
 *
 * None of these write anything. Each one returns a proposal that the user sees
 * and approves, so what the model is really calling is "ask the user for
 * permission to do this". The descriptions say so plainly, because a model that
 * believes it has already saved a file will tell the user it has.
 *
 * Every one of them names its target exactly. A note is named by its path, a
 * to-do list by its title, a board by its name. "The note I was just looking
 * at" is not something an approval screen can show.
 */
import type { OpenAiToolDefinition } from '@/lib/openai/client';

export const AI_WRITE_TOOL_NAMES = [
  'propose_note_edit',
  'propose_new_note',
  'propose_todo_list',
  'propose_todo_list_change',
  'propose_calendar_entry',
  'propose_calendar_entry_change',
  'propose_board_image',
] as const;

export type AiWriteToolName = (typeof AI_WRITE_TOOL_NAMES)[number];

export const isAiWriteToolName = (value: string): value is AiWriteToolName =>
  (AI_WRITE_TOOL_NAMES as readonly string[]).includes(value);

const APPROVAL_NOTE =
  'This does not change anything by itself. It shows the change to the user, who approves or rejects it. Say what you have proposed, not that you have done it.';

export const AI_WRITE_TOOLS: OpenAiToolDefinition[] = [
  {
    type: 'function',
    name: 'propose_note_edit',
    description: `Propose a rewrite of a note that already exists. Send the note's complete new content, not a fragment or a patch: the user is shown a line-by-line diff against the current file. Read the note first so you are changing what is actually there. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Workspace-relative path of the note to change. Omit for the open note.',
        },
        content: {
          type: 'string',
          description: 'The complete new content of the note, in Markdown.',
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_new_note',
    description: `Propose a new note in the workspace. The title becomes the file name. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The note title, which becomes its file name.' },
        folder: {
          type: 'string',
          description: 'Workspace-relative folder to create it in. Omit for the workspace root.',
        },
        content: { type: 'string', description: 'The note content, in Markdown.' },
      },
      required: ['title', 'content'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_todo_list',
    description: `Propose a new to-do list with its items. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD. Omit for today.' },
        time: { type: 'string', description: 'HH:mm. Omit for 12:00.' },
        items: {
          type: 'array',
          description: 'The items on the list, in order.',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              time: { type: 'string', description: 'HH:mm. Omit for 12:00.' },
            },
            required: ['content'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'items'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_todo_list_change',
    description: `Propose changes to a to-do list that already exists: add items, tick or untick items, or rename it. Call list_todos first so you use the exact list title and the exact item text. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        list: { type: 'string', description: 'The exact title of the list to change.' },
        title: { type: 'string', description: 'A new title for the list.' },
        date: { type: 'string', description: 'A new date, YYYY-MM-DD.' },
        time: { type: 'string', description: 'A new time, HH:mm.' },
        addItems: {
          type: 'array',
          description: 'Items to add to the list.',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              time: { type: 'string' },
            },
            required: ['content'],
            additionalProperties: false,
          },
        },
        setChecked: {
          type: 'array',
          description: 'Items to tick or untick, named by their exact current text.',
          items: {
            type: 'object',
            properties: {
              content: { type: 'string' },
              checked: { type: 'boolean' },
            },
            required: ['content', 'checked'],
            additionalProperties: false,
          },
        },
      },
      required: ['list'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_calendar_entry',
    description: `Propose a calendar entry. In Notara a calendar entry is a note with a date, so this creates a note dated when the entry happens. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD.' },
        time: { type: 'string', description: 'HH:mm. Omit for 12:00.' },
        content: { type: 'string', description: 'Anything to write in the note itself.' },
        folder: {
          type: 'string',
          description: 'Workspace-relative folder for the note. Omit for the workspace root.',
        },
      },
      required: ['title', 'date'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_calendar_entry_change',
    description: `Propose moving an existing calendar entry to another date or time. The entry is a note, named by its path. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace-relative path of the entry note.' },
        date: { type: 'string', description: 'The new date, YYYY-MM-DD.' },
        time: { type: 'string', description: 'The new time, HH:mm.' },
      },
      required: ['path'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_board_image',
    description: `Propose generating an image and placing it on a vision board. Approving this is what sends the prompt to OpenAI and pays for the image, so the user sees the prompt, the model, and the size before anything is generated. ${APPROVAL_NOTE}`,
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'What the image should show.' },
        board: {
          type: 'string',
          description: 'The exact name of the board. Omit to use the only board, if there is one.',
        },
      },
      required: ['prompt'],
      additionalProperties: false,
    },
  },
];
