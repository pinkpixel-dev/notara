/**
 * What the assistant is asking to change, before anything is changed.
 *
 * Nothing the assistant writes goes straight to a file or a record. A write
 * tool returns one of these instead, the panel shows it, and the user says yes
 * or no. That is the whole safety story of the feature, so the shape is typed
 * rather than free text: an action, an exact target, and the exact change.
 *
 * These are also what Undo is built from. Applying a proposal produces its
 * inverse, which is another proposal, so undoing is the same code path as
 * applying and needs no second mechanism.
 */

export type ProposalKind =
  | 'edit_note'
  | 'create_note'
  | 'delete_note'
  | 'create_todo_list'
  | 'update_todo_list'
  | 'delete_todo_list'
  | 'restore_todo_list'
  | 'create_calendar_entry'
  | 'update_calendar_entry'
  | 'place_board_image'
  | 'remove_board_item';

/** Rewrites a note that already exists. */
export interface EditNoteProposal {
  kind: 'edit_note';
  /** Workspace-relative path, which is the note's identity. */
  path: string;
  /**
   * The note's content when the proposal was made.
   *
   * Checked again at the moment of applying. If the file has changed since,
   * the write is refused rather than overwriting an edit nobody saw.
   */
  before: string;
  after: string;
}

export interface CreateNoteProposal {
  kind: 'create_note';
  /** Exact path approved on the review card. */
  path: string;
  title: string;
  /** Empty means the workspace root. */
  folder: string;
  content: string;
}

/** Only ever produced as the inverse of a create. Never offered as a tool. */
export interface DeleteNoteProposal {
  kind: 'delete_note';
  path: string;
}

export interface TodoItemDraft {
  content: string;
  checked: boolean;
  time: string;
}

export interface CreateTodoListProposal {
  kind: 'create_todo_list';
  title: string;
  date: string;
  time: string;
  items: TodoItemDraft[];
}

export interface UpdateTodoListProposal {
  kind: 'update_todo_list';
  listId: string;
  /** The list's title now, for showing which list is meant. */
  listTitle: string;
  title?: string;
  date?: string;
  time?: string;
  addItems?: TodoItemDraft[];
  /** Items to tick or untick, by their exact current text. */
  setChecked?: Array<{ content: string; checked: boolean }>;
}

export interface DeleteTodoListProposal {
  kind: 'delete_todo_list';
  listId: string;
  listTitle: string;
}

/**
 * A calendar entry is a note with a date.
 *
 * Notara's calendar lists notes by their date rather than holding a separate
 * event record, so this creates a note and sets its date. Saying so in the type
 * keeps the assistant from inventing an event system the app does not have.
 */
export interface CreateCalendarEntryProposal {
  kind: 'create_calendar_entry';
  /** Exact path approved on the review card. */
  path: string;
  title: string;
  /** YYYY-MM-DD. */
  date: string;
  /** HH:mm. */
  time: string;
  content: string;
  folder: string;
}

export interface UpdateCalendarEntryProposal {
  kind: 'update_calendar_entry';
  path: string;
  /** The entry's date and time now, so the change can be shown as a move. */
  fromDate: string;
  fromTime: string;
  date: string;
  time: string;
}

export interface PlaceBoardImageProposal {
  kind: 'place_board_image';
  boardId: string;
  boardName: string;
  /** The prompt that will be sent to OpenAI when this is approved. */
  prompt: string;
  /** The image model and size, from Settings, shown so the cost is visible. */
  model: string;
  size: string;
}

/**
 * Puts a to-do list back exactly as it was.
 *
 * The inverse of a list change, which can add items, tick items, and rename the
 * list all at once. Reversing each of those separately would need three more
 * kinds and would still get an added-then-ticked item wrong, so the undo
 * carries the whole list instead.
 */
export interface RestoreTodoListProposal {
  kind: 'restore_todo_list';
  listId: string;
  listTitle: string;
  snapshot: TodoListSnapshot;
}

export interface TodoListSnapshot {
  title: string;
  date: string;
  time: string;
  items: Array<{ id: string; content: string; checked: boolean; time: string }>;
}

export interface RemoveBoardItemProposal {
  kind: 'remove_board_item';
  boardId: string;
  boardName: string;
  itemId: string;
}

export type Proposal =
  | EditNoteProposal
  | CreateNoteProposal
  | DeleteNoteProposal
  | CreateTodoListProposal
  | UpdateTodoListProposal
  | DeleteTodoListProposal
  | RestoreTodoListProposal
  | CreateCalendarEntryProposal
  | UpdateCalendarEntryProposal
  | PlaceBoardImageProposal
  | RemoveBoardItemProposal;

/** Where a proposal has got to. */
export type ProposalStatus = 'pending' | 'applied' | 'cancelled' | 'failed' | 'undone';

/** The heading shown on the review card. */
export const proposalTitle = (proposal: Proposal): string => {
  switch (proposal.kind) {
    case 'edit_note':
      return 'Edit note';
    case 'create_note':
      return 'New note';
    case 'delete_note':
      return 'Delete note';
    case 'create_todo_list':
      return 'New to-do list';
    case 'update_todo_list':
      return 'Change to-do list';
    case 'delete_todo_list':
      return 'Delete to-do list';
    case 'restore_todo_list':
      return 'Put the to-do list back';
    case 'create_calendar_entry':
      return 'New calendar entry';
    case 'update_calendar_entry':
      return 'Move calendar entry';
    case 'place_board_image':
      return 'Generate an image for a board';
    case 'remove_board_item':
      return 'Remove a board item';
  }
};

/** The exact thing that will change, named so it can be recognised. */
export const proposalTarget = (proposal: Proposal): string => {
  switch (proposal.kind) {
    case 'edit_note':
    case 'delete_note':
    case 'update_calendar_entry':
      return proposal.path;
    case 'create_note':
    case 'create_calendar_entry':
      return proposal.path;
    case 'create_todo_list':
      return proposal.title;
    case 'update_todo_list':
    case 'delete_todo_list':
    case 'restore_todo_list':
      return proposal.listTitle;
    case 'place_board_image':
    case 'remove_board_item':
      return proposal.boardName;
  }
};

/** True when the change is best shown as a diff rather than as fields. */
export const hasDiff = (proposal: Proposal): proposal is EditNoteProposal | CreateNoteProposal =>
  proposal.kind === 'edit_note' || proposal.kind === 'create_note';

export interface ProposalField {
  label: string;
  value: string;
}

/** The fields shown for a proposal that is not a document change. */
export const proposalFields = (proposal: Proposal): ProposalField[] => {
  // Words rather than a checkbox drawing. A bracket pair reads as nothing at
  // all to a screen reader, and at small sizes it barely reads on screen.
  const describeItems = (items: TodoItemDraft[]): string =>
    items.map((item) => `${item.checked ? 'Done' : 'To do'} · ${item.content}`).join('\n');

  switch (proposal.kind) {
    case 'create_todo_list':
      return [
        { label: 'Title', value: proposal.title },
        { label: 'Date', value: `${proposal.date} at ${proposal.time}` },
        { label: 'Items', value: describeItems(proposal.items) || 'None' },
      ];
    case 'update_todo_list': {
      const fields: ProposalField[] = [{ label: 'List', value: proposal.listTitle }];

      if (proposal.title) {
        fields.push({ label: 'New title', value: proposal.title });
      }
      if (proposal.date || proposal.time) {
        fields.push({
          label: 'New date',
          value: [proposal.date, proposal.time].filter(Boolean).join(' at '),
        });
      }
      if (proposal.addItems?.length) {
        fields.push({ label: 'Add', value: describeItems(proposal.addItems) });
      }
      if (proposal.setChecked?.length) {
        fields.push({
          label: 'Tick or untick',
          value: proposal.setChecked
            .map((entry) => `${entry.checked ? 'Tick' : 'Untick'} · ${entry.content}`)
            .join('\n'),
        });
      }

      return fields;
    }
    case 'delete_todo_list':
    case 'restore_todo_list':
      return [{ label: 'List', value: proposal.listTitle }];
    case 'create_calendar_entry':
      return [
        { label: 'Title', value: proposal.title },
        { label: 'When', value: `${proposal.date} at ${proposal.time}` },
        { label: 'File', value: proposalTarget(proposal) },
        { label: 'Notes', value: proposal.content || 'None' },
      ];
    case 'update_calendar_entry':
      return [
        { label: 'Entry', value: proposal.path },
        { label: 'From', value: `${proposal.fromDate} at ${proposal.fromTime}` },
        { label: 'To', value: `${proposal.date} at ${proposal.time}` },
      ];
    case 'place_board_image':
      return [
        { label: 'Board', value: proposal.boardName },
        { label: 'Prompt', value: proposal.prompt },
        { label: 'Model', value: `${proposal.model} at ${proposal.size}` },
      ];
    case 'remove_board_item':
      return [{ label: 'Board', value: proposal.boardName }];
    case 'delete_note':
      return [{ label: 'File', value: proposal.path }];
    default:
      return [];
  }
};
