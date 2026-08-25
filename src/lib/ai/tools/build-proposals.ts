/**
 * Turning a write tool call into a proposal the user can judge.
 *
 * This is where a model's loose arguments become an exact change: a path that
 * really exists, a list that really has that title, a date that is really a
 * date. Anything that cannot be resolved fails here with a sentence the model
 * can act on, before the user is shown a proposal that could not be applied.
 *
 * Pure, so every rule in it is testable without a workspace.
 */
import type { Note, TodoList, VisionBoard } from '@/types';
import type { Proposal, TodoItemDraft } from '../proposals';
import { isCalendarDate, isClockTime } from '../proposal-validation';
import { uniqueNotePath } from '@/lib/notes/naming';

export interface ProposalContext {
  notes: Note[];
  activeNote: Note | null;
  todoLists: TodoList[];
  boards: VisionBoard[];
  imageModel: string;
  imageSize: string;
  /** Injected so the default date is testable. */
  today?: Date;
}

const DEFAULT_TIME = '12:00';

const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const readDate = (value: unknown, fallback: string): string => {
  const text = asText(value);

  if (!text) {
    return fallback;
  }

  if (!isCalendarDate(text)) {
    throw new Error(`"${text}" is not a date. Use YYYY-MM-DD.`);
  }

  return text;
};

const readTime = (value: unknown, fallback = DEFAULT_TIME): string => {
  const text = asText(value);

  if (!text) {
    return fallback;
  }

  if (!isClockTime(text)) {
    throw new Error(`"${text}" is not a time. Use HH:mm on a 24-hour clock.`);
  }

  return text;
};

const todayAsDate = (today: Date): string => {
  const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const readItems = (value: unknown): TodoItemDraft[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') {
      return [];
    }

    const content = asText((entry as Record<string, unknown>).content);

    if (!content) {
      return [];
    }

    return [
      {
        content,
        checked: (entry as Record<string, unknown>).checked === true,
        time: readTime((entry as Record<string, unknown>).time),
      },
    ];
  });
};

const findNote = (context: ProposalContext, path: string | null): Note => {
  const note = path ? context.notes.find((entry) => entry.path === path) : context.activeNote;

  if (!note) {
    throw new Error(path ? `There is no note at ${path}.` : 'No note is open at the moment.');
  }

  return note;
};

/**
 * Finds a to-do list by its title.
 *
 * By title because that is what the model can see. Two lists with the same
 * title is refused rather than guessed at: picking one and being wrong means
 * changing a list the user did not mean.
 */
const findTodoList = (context: ProposalContext, title: string): TodoList => {
  const matches = context.todoLists.filter(
    (list) => list.title.toLowerCase() === title.toLowerCase()
  );

  if (matches.length === 0) {
    throw new Error(`There is no to-do list called "${title}".`);
  }

  if (matches.length > 1) {
    throw new Error(
      `There is more than one to-do list called "${title}". Ask the user which one they mean.`
    );
  }

  return matches[0];
};

const findBoard = (context: ProposalContext, name: string | null): VisionBoard => {
  if (!name) {
    if (context.boards.length === 1) {
      return context.boards[0];
    }

    if (context.boards.length === 0) {
      throw new Error('There are no vision boards yet. The user has to make one first.');
    }

    throw new Error('There is more than one board. Ask the user which board to use.');
  }

  const board = context.boards.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

  if (!board) {
    throw new Error(`There is no vision board called "${name}".`);
  }

  return board;
};

const cleanFolder = (value: unknown): string => {
  const folder = (asText(value) ?? '').replace(/^\/+|\/+$/g, '');

  if (folder.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new Error('A folder must stay inside the workspace. Do not use . or .. segments.');
  }

  return folder;
};

export const buildProposal = (
  name: string,
  args: Record<string, unknown>,
  context: ProposalContext
): Proposal => {
  const today = context.today ?? new Date();

  switch (name) {
    case 'propose_note_edit': {
      const note = findNote(context, asText(args.path));
      const after = typeof args.content === 'string' ? args.content : null;

      if (after === null) {
        throw new Error('An edit needs the complete new content of the note.');
      }

      if (after === note.content) {
        throw new Error('That content is identical to the note as it stands.');
      }

      return { kind: 'edit_note', path: note.path, before: note.content, after };
    }

    case 'propose_new_note': {
      const title = asText(args.title);

      if (!title) {
        throw new Error('A new note needs a title.');
      }

      const folder = cleanFolder(args.folder);
      return {
        kind: 'create_note',
        path: uniqueNotePath(folder, title, context.notes.map((note) => note.path)),
        title,
        folder,
        content: typeof args.content === 'string' ? args.content : '',
      };
    }

    case 'propose_todo_list': {
      const title = asText(args.title);

      if (!title) {
        throw new Error('A new to-do list needs a title.');
      }

      return {
        kind: 'create_todo_list',
        title,
        date: readDate(args.date, todayAsDate(today)),
        time: readTime(args.time),
        items: readItems(args.items),
      };
    }

    case 'propose_todo_list_change': {
      const listTitle = asText(args.list);

      if (!listTitle) {
        throw new Error('Name the list to change, by its exact title.');
      }

      const list = findTodoList(context, listTitle);
      const addItems = readItems(args.addItems);
      const checkedNames = new Set<string>();

      const setChecked = Array.isArray(args.setChecked)
        ? args.setChecked.flatMap((entry) => {
            const content = asText((entry as Record<string, unknown>)?.content);
            const checked = (entry as Record<string, unknown>)?.checked;

            if (!content || typeof checked !== 'boolean') {
              return [];
            }

            if (checkedNames.has(content)) {
              throw new Error(`The item "${content}" was named more than once in the same change.`);
            }
            checkedNames.add(content);

            const matches = list.items.filter((item) => item.content === content);
            if (matches.length === 0) {
              throw new Error(`"${list.title}" has no item that reads "${content}".`);
            }
            if (matches.length > 1) {
              throw new Error(
                `"${list.title}" has more than one item that reads "${content}". Rename one before changing it.`
              );
            }

            return [{ content, checked }];
          })
        : [];

      const title = asText(args.title);
      const date = asText(args.date) ? readDate(args.date, '') : undefined;
      const time = asText(args.time) ? readTime(args.time) : undefined;

      if (!title && !date && !time && addItems.length === 0 && setChecked.length === 0) {
        throw new Error('That change would not alter the list.');
      }

      return {
        kind: 'update_todo_list',
        listId: list.id,
        listTitle: list.title,
        ...(title ? { title } : {}),
        ...(date ? { date } : {}),
        ...(time ? { time } : {}),
        ...(addItems.length ? { addItems } : {}),
        ...(setChecked.length ? { setChecked } : {}),
      };
    }

    case 'propose_calendar_entry': {
      const title = asText(args.title);

      if (!title) {
        throw new Error('A calendar entry needs a title.');
      }

      const folder = cleanFolder(args.folder);
      return {
        kind: 'create_calendar_entry',
        path: uniqueNotePath(folder, title, context.notes.map((note) => note.path)),
        title,
        date: readDate(args.date, todayAsDate(today)),
        time: readTime(args.time),
        content: typeof args.content === 'string' ? args.content : '',
        folder,
      };
    }

    case 'propose_calendar_entry_change': {
      const note = findNote(context, asText(args.path));
      const current = new Date(note.createdAt);
      const fromDate = todayAsDate(current);
      const fromTime = `${String(current.getHours()).padStart(2, '0')}:${String(
        current.getMinutes()
      ).padStart(2, '0')}`;

      const date = readDate(args.date, fromDate);
      const time = readTime(args.time, fromTime);

      if (date === fromDate && time === fromTime) {
        throw new Error('That entry is already at that date and time.');
      }

      return { kind: 'update_calendar_entry', path: note.path, fromDate, fromTime, date, time };
    }

    case 'propose_board_image': {
      const prompt = asText(args.prompt);

      if (!prompt) {
        throw new Error('An image needs a prompt describing what to generate.');
      }

      const board = findBoard(context, asText(args.board));

      return {
        kind: 'place_board_image',
        boardId: board.id,
        boardName: board.name,
        prompt,
        model: context.imageModel,
        size: context.imageSize,
      };
    }

    default:
      throw new Error(`There is no tool called ${name}.`);
  }
};
