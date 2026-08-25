/**
 * Note lifecycle events.
 *
 * A note's identity is its file path, so anything that keys off a note has to
 * hear about a rename, a move, or a delete. The AI panel is the first such
 * thing: it keeps one conversation per note path, and those conversations
 * should follow the note rather than be orphaned by a rename.
 *
 * These are window events rather than context callbacks on purpose. The panel
 * lives in the application shell and does not otherwise talk to the note file
 * layer, and this keeps that direction of dependency at zero. The app already
 * uses the same pattern for focusing note search.
 */

export const NOTE_PATH_CHANGED_EVENT = 'notara:note-path-changed';
export const NOTE_DELETED_EVENT = 'notara:note-deleted';

export interface NotePathChangedDetail {
  from: string;
  to: string;
}

export interface NoteDeletedDetail {
  path: string;
}

export const emitNotePathChanged = (detail: NotePathChangedDetail): void => {
  if (typeof window === 'undefined' || detail.from === detail.to) {
    return;
  }

  window.dispatchEvent(new CustomEvent<NotePathChangedDetail>(NOTE_PATH_CHANGED_EVENT, { detail }));
};

export const emitNoteDeleted = (detail: NoteDeletedDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<NoteDeletedDetail>(NOTE_DELETED_EVENT, { detail }));
};
