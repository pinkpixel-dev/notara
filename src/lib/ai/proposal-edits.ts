/**
 * Changing a proposal before approving it.
 *
 * Apply and Cancel are not enough on their own. The assistant gets the shape of
 * a change right more often than it gets every word right, and rejecting a
 * whole rewrite because one heading is wrong wastes the part that was good.
 *
 * Only fields that can be edited safely are offered. A to-do list's items and a
 * note's target path are not among them: changing where a write lands is a
 * different change, not an edit of this one, and it should go back through the
 * assistant so the proposal on screen always matches what will happen.
 */
import type { Proposal } from './proposals';

export type EditableFieldKind = 'text' | 'textarea' | 'date' | 'time';

export interface EditableField {
  key: string;
  label: string;
  kind: EditableFieldKind;
  value: string;
}

/** The fields the user may change on this proposal, in the order shown. */
export const editableFields = (proposal: Proposal): EditableField[] => {
  switch (proposal.kind) {
    case 'edit_note':
      return [{ key: 'after', label: 'New content', kind: 'textarea', value: proposal.after }];

    case 'create_note':
      return [{ key: 'content', label: 'Content', kind: 'textarea', value: proposal.content }];

    case 'create_calendar_entry':
      return [
        { key: 'date', label: 'Date', kind: 'date', value: proposal.date },
        { key: 'time', label: 'Time', kind: 'time', value: proposal.time },
        { key: 'content', label: 'Notes', kind: 'textarea', value: proposal.content },
      ];

    case 'update_calendar_entry':
      return [
        { key: 'date', label: 'Date', kind: 'date', value: proposal.date },
        { key: 'time', label: 'Time', kind: 'time', value: proposal.time },
      ];

    case 'create_todo_list':
      return [
        { key: 'title', label: 'Title', kind: 'text', value: proposal.title },
        { key: 'date', label: 'Date', kind: 'date', value: proposal.date },
        { key: 'time', label: 'Time', kind: 'time', value: proposal.time },
      ];

    case 'update_todo_list':
      return [
        { key: 'title', label: 'New title', kind: 'text', value: proposal.title ?? '' },
      ];

    case 'place_board_image':
      return [{ key: 'prompt', label: 'Prompt', kind: 'textarea', value: proposal.prompt }];

    default:
      return [];
  }
};

export const canEdit = (proposal: Proposal): boolean => editableFields(proposal).length > 0;

/**
 * Puts edited values back into the proposal.
 *
 * Only keys that `editableFields` offered are read, so a value that is not
 * meant to be editable cannot arrive through here. An empty title is ignored
 * rather than written, because a note with no name is not a change anyone
 * intended.
 */
export const applyProposalEdits = (
  proposal: Proposal,
  values: Record<string, string>
): Proposal => {
  const allowed = new Set(editableFields(proposal).map((field) => field.key));

  const read = (key: string, fallback: string): string => {
    if (!allowed.has(key) || values[key] === undefined) {
      return fallback;
    }

    return values[key];
  };

  const readRequired = (key: string, fallback: string): string => {
    const value = read(key, fallback).trim();
    return value || fallback;
  };

  switch (proposal.kind) {
    case 'edit_note':
      return { ...proposal, after: read('after', proposal.after) };

    case 'create_note':
      return {
        ...proposal,
        title: readRequired('title', proposal.title),
        folder: read('folder', proposal.folder).trim().replace(/^\/+|\/+$/g, ''),
        content: read('content', proposal.content),
      };

    case 'create_calendar_entry':
      return {
        ...proposal,
        title: readRequired('title', proposal.title),
        date: readRequired('date', proposal.date),
        time: readRequired('time', proposal.time),
        folder: read('folder', proposal.folder).trim().replace(/^\/+|\/+$/g, ''),
        content: read('content', proposal.content),
      };

    case 'update_calendar_entry':
      return {
        ...proposal,
        date: readRequired('date', proposal.date),
        time: readRequired('time', proposal.time),
      };

    case 'create_todo_list':
      return {
        ...proposal,
        title: readRequired('title', proposal.title),
        date: readRequired('date', proposal.date),
        time: readRequired('time', proposal.time),
      };

    case 'update_todo_list': {
      const title = read('title', proposal.title ?? '').trim();

      return title ? { ...proposal, title } : { ...proposal, title: undefined };
    }

    case 'place_board_image':
      return { ...proposal, prompt: readRequired('prompt', proposal.prompt) };

    default:
      return proposal;
  }
};
