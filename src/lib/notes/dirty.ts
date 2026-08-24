/**
 * Deciding whether an editor buffer holds unsaved work.
 *
 * Notara saves on demand rather than as you type, so leaving a note takes the
 * buffer with it. This is what the warning is built on, and it is kept pure so
 * the edge cases can be tested without mounting an editor.
 */
import type { Note, NoteTag } from '@/types';

/** The parts of the editor that are buffered rather than written immediately. */
export interface EditorBuffer {
  title: string;
  content: string;
  tags: NoteTag[];
}

/**
 * Compares two tag selections by id, ignoring order.
 *
 * Reordering the same tags is not an edit worth stopping someone over.
 */
export const sameTags = (left: NoteTag[], right: NoteTag[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }
  const ids = new Set(left.map((tag) => tag.id));
  return right.every((tag) => ids.has(tag.id));
};

/**
 * Whether a new, never-saved note holds anything worth keeping.
 *
 * Whitespace alone does not count. Warning about a stray space would train
 * people to dismiss the prompt, which is worse than not showing it.
 */
export const isNewNoteDirty = (buffer: Pick<EditorBuffer, 'title' | 'content'>): boolean =>
  buffer.title.trim() !== '' || buffer.content.trim() !== '';

/**
 * Whether the buffer differs from the note it was opened from.
 *
 * Pinning and starring are deliberately excluded. Both write as soon as they
 * are toggled, so neither is ever pending.
 */
export const isNoteDirty = (buffer: EditorBuffer, note: Note | undefined): boolean => {
  if (!note) {
    return false;
  }

  return (
    buffer.title !== note.title ||
    buffer.content !== note.content ||
    !sameTags(buffer.tags, note.tags)
  );
};
